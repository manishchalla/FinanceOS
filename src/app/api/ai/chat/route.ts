import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, transactions, accounts, budgets, categories, users } from "@/db";
import { eq, sql } from "drizzle-orm";
import { groq, GROQ_MODEL } from "@/lib/groq";
import { anonymizeForLLM } from "@/lib/privacy";
import { computeConfidence, confidenceLabel } from "@/lib/confidence";
import { z } from "zod";

// Keywords that suggest the user wants individual transaction details
const DETAIL_KEYWORDS = [
  "which", "what transaction", "list", "show me", "breakdown", "individual",
  "specific", "each", "all transactions", "every", "itemize",
];

function needsDetailedTx(messages: { role: string; content: string }[]): boolean {
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return false;
  const q = lastUser.content.toLowerCase();
  return DETAIL_KEYWORDS.some(k => q.includes(k));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;

  const { messages } = z.object({
    messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
  }).parse(await req.json());

  // Only send last 6 messages to LLM — not the full history
  const recentMessages = messages.slice(-6);

  const [userAccounts, privacyRow, allTx, budgetList] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db.select({ privacyMode: users.privacyMode }).from(users).where(eq(users.id, userId)).limit(1),
    db.select({
      description: transactions.description,
      categoryName: categories.name,
      amount: transactions.amount,
      type: transactions.type,
      date: transactions.date,
    })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(sql`${transactions.date} ASC`),
    db.select().from(budgets).where(eq(budgets.userId, userId)),
  ]);

  const privacyMode = Boolean(privacyRow?.[0]?.privacyMode);
  const llmTxs = privacyMode ? anonymizeForLLM(allTx) : allTx;

  const daysOfHistory = llmTxs.length > 0
    ? Math.floor(
        (new Date(llmTxs[llmTxs.length - 1]!.date).getTime() - new Date(llmTxs[0]!.date).getTime())
        / (1000 * 60 * 60 * 24)
      )
    : 0;
  const confidence = computeConfidence(llmTxs.length, daysOfHistory);
  const totalBalance = userAccounts.reduce((a, b) => a + b.balance, 0);

  // ── Monthly rollups ──────────────────────────────────────────
  type MonthData = {
    income: number;
    expense: number;
    txs: { desc: string; cat: string; amount: number; type: string; date: string }[];
  };
  const monthly: Record<string, MonthData> = {};

  for (const tx of llmTxs) {
    const month = tx.date.slice(0, 7);
    if (!monthly[month]) monthly[month] = { income: 0, expense: 0, txs: [] };
    if (tx.type === "income")  monthly[month].income  += tx.amount;
    if (tx.type === "expense") monthly[month].expense += tx.amount;
    monthly[month].txs.push({
      desc: tx.description,
      cat: tx.categoryName ?? "Uncategorized",
      amount: tx.amount,
      type: tx.type,
      date: tx.date,
    });
  }

  const monthKeysSorted = Object.keys(monthly).sort();

  // ── Category totals (all time) ───────────────────────────────
  const categoryTotals: Record<string, number> = {};
  for (const tx of llmTxs) {
    if (tx.type === "expense") {
      const cat = tx.categoryName ?? "Uncategorized";
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + tx.amount;
    }
  }

  // ── Category totals per month ────────────────────────────────
  const monthlyCatTotals: Record<string, Record<string, number>> = {};
  for (const tx of llmTxs) {
    if (tx.type === "expense") {
      const month = tx.date.slice(0, 7);
      const cat = tx.categoryName ?? "Uncategorized";
      if (!monthlyCatTotals[month]) monthlyCatTotals[month] = {};
      monthlyCatTotals[month]![cat] = (monthlyCatTotals[month]![cat] ?? 0) + tx.amount;
    }
  }

  // ── Totals ───────────────────────────────────────────────────
  const totalIncome  = llmTxs.filter(t => t.type === "income").reduce((a, t)  => a + t.amount, 0);
  const totalExpense = llmTxs.filter(t => t.type === "expense").reduce((a, t) => a + t.amount, 0);

  // ── Build compact prompt sections ───────────────────────────
  const accountsSection = userAccounts
    .map(a => `  ${a.name} (${a.type}): $${a.balance.toFixed(2)}`)
    .join("\n");

  const monthlyTable = monthKeysSorted
    .map(m => {
      const d = monthly[m]!;
      return `${m}: income=$${d.income.toFixed(2)} expenses=$${d.expense.toFixed(2)} net=$${(d.income - d.expense).toFixed(2)}`;
    })
    .join("\n");

  const categoryTable = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => `  ${cat}: $${total.toFixed(2)}`)
    .join("\n");

  const monthlyCategoryTable = monthKeysSorted
    .map(m => {
      const cats = monthlyCatTotals[m];
      if (!cats || Object.keys(cats).length === 0) return null;
      const lines = Object.entries(cats)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, total]) => `    ${cat}: $${total.toFixed(2)}`)
        .join("\n");
      return `  ${m}:\n${lines}`;
    })
    .filter(Boolean)
    .join("\n");

  // ── Conditionally include per-transaction detail ─────────────
  // Only injected when the user's question needs it — keeps token usage low
  let detailSection = "";
  if (needsDetailedTx(recentMessages)) {
    // Find which month(s) the user is asking about
    const lastMsg = [...recentMessages].reverse().find(m => m.role === "user")?.content.toLowerCase() ?? "";
    const relevantMonths = monthKeysSorted.filter(m => {
      const [year, mo] = m.split("-");
      const monthName = new Date(`${m}-01`).toLocaleString("en-US", { month: "long" }).toLowerCase();
      const shortName = new Date(`${m}-01`).toLocaleString("en-US", { month: "short" }).toLowerCase();
      return lastMsg.includes(m) || lastMsg.includes(monthName) || lastMsg.includes(shortName) || lastMsg.includes(year!);
    });

    // Default to last 2 months if no specific month detected
    const targetMonths = relevantMonths.length > 0
      ? relevantMonths
      : monthKeysSorted.slice(-2);

    detailSection = "\n\nDETAILED TRANSACTIONS (for the relevant period only):\n" +
      targetMonths.map(m => {
        const d = monthly[m]!;
        // Cap at 15 transactions per month to stay within token limits
        const lines = d.txs
          .slice(0, 15)
          .map(t => `    ${t.date} | ${t.type === "income" ? "+" : "-"}$${t.amount.toFixed(2)} | ${t.desc} [${t.cat}]`)
          .join("\n");
        const truncated = d.txs.length > 15 ? `\n    ...and ${d.txs.length - 15} more` : "";
        return `  ${m} (${d.txs.length} transactions):\n${lines}${truncated}`;
      }).join("\n");
  }

  const systemPrompt = `You are a personal finance assistant with direct access to the user's complete transaction history. Answer using ONLY the data below — do not guess or fabricate numbers.

DATA QUALITY: ${confidence.level} — ${confidenceLabel(confidence.level)} (${confidence.reason})

ACCOUNTS:
${accountsSection}
Total balance: $${totalBalance.toFixed(2)}

ALL-TIME TOTALS (${llmTxs.length} transactions, ${monthKeysSorted[0] ?? "n/a"} to ${monthKeysSorted[monthKeysSorted.length - 1] ?? "n/a"}):
  Total income: $${totalIncome.toFixed(2)}
  Total expenses: $${totalExpense.toFixed(2)}
  Net savings: $${(totalIncome - totalExpense).toFixed(2)}
  Active budgets: ${budgetList.length}

MONTHLY SUMMARY:
${monthlyTable}

EXPENSE TOTALS BY CATEGORY (all time):
${categoryTable}

EXPENSE BY CATEGORY PER MONTH:
${monthlyCategoryTable}${detailSection}

RULES:
1. For a specific month, use the MONTHLY SUMMARY table (YYYY-MM format).
2. For category questions, use EXPENSE TOTALS BY CATEGORY.
3. For month + category, use EXPENSE BY CATEGORY PER MONTH.
4. Never say $0 unless the data genuinely shows $0.
5. Quote exact figures. Do not round or estimate.
6. Be concise: 1–3 sentences. State the number, then one useful observation.
7. If data for a requested period doesn't exist, say so clearly.`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      ...recentMessages,
    ],
  });

  return NextResponse.json({
    reply: completion.choices[0]?.message?.content ?? "Could not generate a response.",
    source: "ai",
    confidence: confidence.level,
  });
}