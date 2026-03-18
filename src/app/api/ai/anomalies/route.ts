import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, transactions } from "@/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { askGroq } from "@/lib/groq";

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

  const [latestTx, historyTx] = await Promise.all([
    db.select({
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      date: transactions.date,
    }).from(transactions)
      .where(and(eq(transactions.userId, userId),
        gte(transactions.date, latestStart), lte(transactions.date, latestEnd)))
      .orderBy(sql`${transactions.date} ASC`),

    db.select({
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      date: transactions.date,
    }).from(transactions)
      .where(and(eq(transactions.userId, userId),
        gte(transactions.date, historyStart), lte(transactions.date, historyEnd))),
  ]);

  if (latestTx.length === 0) {
    return NextResponse.json({ anomalies: [], summary: "No transactions in the latest month." });
  }

  // Calculate historical monthly averages per description IN CODE
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

  // Detect duplicates in code
  const latestExpenses = latestTx.filter(t => t.type === "expense");
  const dupMap: Record<string, number> = {};
  for (const tx of latestExpenses) {
    const key = `${tx.description}|||${tx.amount}`;
    dupMap[key] = (dupMap[key] ?? 0) + 1;
  }
  const duplicates = Object.entries(dupMap)
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const [desc, amt] = key.split("|||");
      return { description: desc, amount: Number(amt), count };
    });

  // Detect spikes in code — 2x above historical average
  const spikes: { description: string; amount: number; avg: number; ratio: number }[] = [];
  for (const tx of latestExpenses) {
    const avg = historyAvg[tx.description];
    if (avg && avg > 0) {
      const ratio = tx.amount / avg;
      if (ratio >= 2) {
        spikes.push({ description: tx.description, amount: tx.amount, avg, ratio });
      }
    }
  }

  // Detect large one-off expenses (over $300, no history)
  const REGULAR = ["house rent", "rent", "salary", "electricity", "phone bill", "gym", "netflix", "spotify"];
  const oneOff = latestExpenses.filter(tx => {
    const isRegular = REGULAR.some(r => tx.description.toLowerCase().includes(r));
    const hasHistory = historyAvg[tx.description] !== undefined;
    return tx.amount >= 300 && !isRegular && !hasHistory;
  });

  const hasHistory = Object.keys(historyAvg).length > 0;

  // Build structured context — all math already done
  const context = `
Month being analysed: ${latestMonthLabel}
Historical data available: ${hasHistory ? "YES (${historyMonths} months)" : "NO"}

PRE-DETECTED DUPLICATE CHARGES (same item charged multiple times this month):
${duplicates.length > 0
  ? duplicates.map(d => `DUPLICATE: "${d.description}" $${d.amount} charged ${d.count} times → extra charge = $${d.amount}`).join("\n")
  : "None"}

PRE-DETECTED SPENDING SPIKES (2x+ above historical monthly average):
${spikes.length > 0
  ? spikes.map(s => `SPIKE: "${s.description}" = $${s.amount} this month vs avg $${s.avg.toFixed(2)} → ${s.ratio.toFixed(1)}x above average`).join("\n")
  : "None"}

PRE-DETECTED LARGE ONE-OFF EXPENSES (over $300, no historical data):
${oneOff.length > 0
  ? oneOff.map(t => `LARGE: "${t.description}" = $${t.amount} on ${t.date}`).join("\n")
  : "None"}

ALL EXPENSES THIS MONTH (for reference only, do not flag unless in the lists above):
${latestExpenses.map(t => `${t.date} $${t.amount} "${t.description}"`).join("\n")}
`;

  const prompt = `You are writing anomaly report cards for a finance app. Convert the PRE-DETECTED issues above into user-friendly report cards.

IMPORTANT:
- ONLY report anomalies that are explicitly listed in PRE-DETECTED sections above
- Do NOT flag anything from the "ALL EXPENSES" reference list unless it is also in a PRE-DETECTED section
- Do NOT do any calculations yourself — all detection is already done above
- Severity: duplicate_charge = high, spike >3x = high, spike 2-3x = medium, large one-off = medium

${context}

Respond ONLY with valid JSON, no markdown:
{
  "anomalies": [
    {
      "type": "duplicate_charge"|"overspending"|"large_transaction",
      "severity": "high"|"medium"|"low",
      "title": "<short title>",
      "description": "<user-friendly explanation using the exact amounts from above>",
      "amount": <number>,
      "item": "<description name>"
    }
  ],
  "summary": "<1 sentence: how many issues found and what type>"
}`;

  const raw = await askGroq("You are a JSON-only financial anomaly reporter. Only report pre-detected issues. Never flag items not in the pre-detected lists.", prompt, 1024);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ anomalies: [], summary: "Analysis could not be completed." });

  const result = JSON.parse(match[0]);

  // Final safety: if no pre-detected issues, override LLM output
  if (duplicates.length === 0 && spikes.length === 0 && oneOff.length === 0) {
    return NextResponse.json({ anomalies: [], summary: "No anomalies detected. Your spending looks normal this month." });
  }

  return NextResponse.json(result);
}
