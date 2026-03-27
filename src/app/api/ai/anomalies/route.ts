import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, transactions, categories, anomalyFeedback } from "@/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;

  const [dateRange] = await db.select({
    latest:   sql<string>`max(${transactions.date})`,
    earliest: sql<string>`min(${transactions.date})`,
  }).from(transactions).where(eq(transactions.userId, userId));

  if (!dateRange?.latest) {
    return NextResponse.json({ anomalies: [], summary: "No transactions found." });
  }

  const latestDate       = new Date(dateRange.latest);
  const latestStart      = format(startOfMonth(latestDate), "yyyy-MM-dd");
  const latestEnd        = format(endOfMonth(latestDate), "yyyy-MM-dd");
  const historyStart     = format(startOfMonth(subMonths(latestDate, 4)), "yyyy-MM-dd");
  const historyEnd       = format(endOfMonth(subMonths(latestDate, 1)), "yyyy-MM-dd");
  const latestMonthLabel = format(latestDate, "MMMM yyyy");

  // Fetch feedback to tune thresholds per user
  const feedbackRows = await db.select({
    type: anomalyFeedback.type,
    verdict: anomalyFeedback.userVerdict,
  }).from(anomalyFeedback).where(eq(anomalyFeedback.userId, userId));

  // Count false alarms per anomaly type
  const falseAlarmCount: Record<string, number> = {};
  for (const row of feedbackRows) {
    if (row.verdict === "false_alarm") {
      falseAlarmCount[row.type] = (falseAlarmCount[row.type] ?? 0) + 1;
    }
  }

  // Tune thresholds: if user dismissed 3+ of a type → raise threshold
  const dupThreshold   = (falseAlarmCount["duplicate_charge"]  ?? 0) >= 3 ? 2 : 1; // require N+1 occurrences
  const spikeMultiple  = (falseAlarmCount["overspending"]       ?? 0) >= 3 ? 3.0 : 2.0;
  const largeMinAmount = (falseAlarmCount["large_transaction"]  ?? 0) >= 3 ? 500 : 300;

  const [latestTx, historyTx] = await Promise.all([
    db.select({
      id: transactions.id, description: transactions.description,
      amount: transactions.amount, type: transactions.type,
      date: transactions.date, categoryName: categories.name,
    }).from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, userId), gte(transactions.date, latestStart), lte(transactions.date, latestEnd)))
      .orderBy(sql`${transactions.date} ASC`),

    db.select({
      id: transactions.id, description: transactions.description,
      amount: transactions.amount, type: transactions.type,
      date: transactions.date, categoryName: categories.name,
    }).from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, userId), gte(transactions.date, historyStart), lte(transactions.date, historyEnd))),
  ]);

  if (latestTx.length === 0) {
    return NextResponse.json({ anomalies: [], summary: "No transactions in the latest month." });
  }

  const historyMonths = new Set(historyTx.map(t => t.date.slice(0, 7))).size || 1;
  const historyTotals: Record<string, number> = {};
  for (const tx of historyTx) {
    if (tx.type === "expense") {
      historyTotals[tx.description] = (historyTotals[tx.description] ?? 0) + tx.amount;
    }
  }
  const historyAvg: Record<string, number> = {};
  for (const [desc, total] of Object.entries(historyTotals)) {
    historyAvg[desc] = total / historyMonths;
  }

  const latestExpenses = latestTx.filter(t => t.type === "expense");

  // Duplicate detection (threshold-tuned)
  const dupMap = new Map<string, typeof latestExpenses>();
  for (const tx of latestExpenses) {
    const key = `${tx.description}|||${tx.amount}`;
    const arr = dupMap.get(key) ?? [];
    arr.push(tx);
    dupMap.set(key, arr);
  }
  const duplicates = [...dupMap.values()]
    .filter(txs => txs.length > dupThreshold)
    .map(txs => ({ description: txs[0]?.description ?? "", amount: txs[0]?.amount ?? 0, txs, count: txs.length }));

  // Spike detection (threshold-tuned)
  const spikes: { tx: typeof latestExpenses[number]; avg: number; ratio: number }[] = [];
  for (const tx of latestExpenses) {
    const avg = historyAvg[tx.description];
    if (avg && avg > 0) {
      const ratio = tx.amount / avg;
      if (ratio >= spikeMultiple) spikes.push({ tx, avg, ratio });
    }
  }

  // Large one-off (threshold-tuned)
  const REGULAR = ["house rent","rent","salary","electricity","phone bill","gym","netflix","spotify"];
  const oneOff = latestExpenses.filter(tx => {
    const isRegular = REGULAR.some(r => tx.description.toLowerCase().includes(r));
    const hasHistory = historyAvg[tx.description] !== undefined;
    return tx.amount >= largeMinAmount && !isRegular && !hasHistory;
  });

  type Anomaly = {
    type: "duplicate_charge" | "overspending" | "large_transaction";
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    amount: number | null;
    category: string | null;
    transaction_id: string;
    reason: string;
  };

  const anomalies: Anomaly[] = [];

  for (const d of duplicates) {
    const txsSorted = [...d.txs].sort((a, b) => a.date.localeCompare(b.date));
    const first = txsSorted[0]!;
    const dateParts = txsSorted.map(t => format(new Date(t.date), "MMM d"));
    const timesText = d.count === 2 ? "twice" : `${d.count} times`;
    anomalies.push({
      type: "duplicate_charge", severity: "high",
      title: "Duplicate charge detected",
      description: `Charged $${d.amount.toFixed(2)} (${d.description}) multiple times this month.`,
      amount: d.amount, category: first.categoryName ?? null,
      transaction_id: first.id,
      reason: `Charged $${d.amount.toFixed(2)} ${timesText} in ${format(new Date(first.date), "MMM")} (${dateParts.join(" + ")})`,
    });
  }

  for (const s of spikes) {
    const tx = s.tx;
    const severity: Anomaly["severity"] = s.ratio >= 3 ? "high" : "medium";
    anomalies.push({
      type: "overspending", severity,
      title: severity === "high" ? "High spending spike" : "Spending spike",
      description: `Unusually high spending on "${tx.description}".`,
      amount: tx.amount, category: tx.categoryName ?? null,
      transaction_id: tx.id,
      reason: `Spent $${tx.amount.toFixed(2)} on ${tx.description} in ${latestMonthLabel} vs avg $${s.avg.toFixed(2)} (${s.ratio.toFixed(1)}x higher).`,
    });
  }

  for (const t of oneOff) {
    anomalies.push({
      type: "large_transaction", severity: "medium",
      title: "Large one-off expense",
      description: `A large expense occurred this month.`,
      amount: t.amount, category: t.categoryName ?? null,
      transaction_id: t.id,
      reason: `Single large transaction of $${t.amount.toFixed(2)} on ${format(new Date(t.date), "MMM d, yyyy")} with no historical average for this description.`,
    });
  }

  // Note if thresholds were adjusted from feedback
  const tuningNote = feedbackRows.length > 0
    ? ` (thresholds tuned from ${feedbackRows.length} feedback responses)`
    : "";

  const summary = anomalies.length === 0
    ? `No anomalies detected. Your spending looks normal this month.${tuningNote}`
    : `${anomalies.length} anomaly issue(s) found this month.${tuningNote}`;

  return NextResponse.json({ anomalies, summary });
}
