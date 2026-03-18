import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, transactions, accounts, budgets } from "@/db";
import { eq, and, sum, count, sql } from "drizzle-orm";
import { groq, GROQ_MODEL } from "@/lib/groq";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;

  const { messages } = z.object({
    messages: z.array(z.object({ role: z.enum(["user","assistant"]), content: z.string() }))
  }).parse(await req.json());

  const [userAccounts, allTx, budgetList] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db.select({
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      date: transactions.date,
    }).from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(sql`${transactions.date} ASC`),
    db.select().from(budgets).where(eq(budgets.userId, userId)),
  ]);

  // Do ALL calculations in code — never let LLM calculate
  const totalBalance = userAccounts.reduce((a, b) => a + b.balance, 0);

  // Build exact monthly totals in code
  type MonthData = {
    income: number; expense: number;
    incomeItems: string[]; expenseItems: string[];
  };
  const monthly: Record<string, MonthData> = {};

  for (const tx of allTx) {
    const month = tx.date.slice(0, 7); // YYYY-MM
    if (!monthly[month]) monthly[month] = { income: 0, expense: 0, incomeItems: [], expenseItems: [] };
    if (tx.type === "income") {
      monthly[month].income += tx.amount;
      monthly[month].incomeItems.push(`$${tx.amount} "${tx.description}" on ${tx.date}`);
    } else if (tx.type === "expense") {
      monthly[month].expense += tx.amount;
      monthly[month].expenseItems.push(`$${tx.amount} "${tx.description}" on ${tx.date}`);
    }
  }

  const totalIncome  = allTx.filter(t => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const totalExpense = allTx.filter(t => t.type === "expense").reduce((a, t) => a + t.amount, 0);

  // Build the monthly table with pre-computed values
  const monthlyTable = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, d]) => {
      const net = d.income - d.expense;
      return `${m}: income=$${d.income.toFixed(2)} | expenses=$${d.expense.toFixed(2)} | net=$${net.toFixed(2)}`;
    }).join("\n");

  // Build per-description totals for category questions
  const descTotals: Record<string, number> = {};
  for (const tx of allTx) {
    if (tx.type === "expense") {
      descTotals[tx.description] = (descTotals[tx.description] ?? 0) + tx.amount;
    }
  }
  const topExpenses = Object.entries(descTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([d, t]) => `"${d}": $${t.toFixed(2)} total`)
    .join("\n");

  // Build detailed monthly breakdown with every transaction listed
  const detailedMonths = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, d]) => {
      return `\n${m} (income=$${d.income.toFixed(2)}, expenses=$${d.expense.toFixed(2)}, net=$${(d.income - d.expense).toFixed(2)}):\n  INCOME: ${d.incomeItems.join(" | ") || "none"}\n  EXPENSES: ${d.expenseItems.slice(0, 15).join(" | ") || "none"}`;
    }).join("\n");

  const systemPrompt = `You are a personal finance assistant. ALL numbers below are pre-calculated — do NOT recalculate, just look them up and quote them directly.

ACCOUNTS: ${userAccounts.map(a => `${a.name}=$${a.balance.toFixed(2)}`).join(", ")}
TOTAL BALANCE: $${totalBalance.toFixed(2)}
TOTAL INCOME ALL TIME: $${totalIncome.toFixed(2)}
TOTAL EXPENSES ALL TIME: $${totalExpense.toFixed(2)}
NET SAVINGS ALL TIME: $${(totalIncome - totalExpense).toFixed(2)}
ACTIVE BUDGETS: ${budgetList.length}

MONTHLY SUMMARY TABLE (use this for month-specific questions):
${monthlyTable}

TOP EXPENSES ALL TIME:
${topExpenses}

DETAILED MONTHLY TRANSACTIONS (use this when asked about specific transactions in a month):
${detailedMonths}

RULES:
- All numbers above are exact and pre-calculated. Quote them directly, do not add or subtract yourself.
- When asked about a month, find that month in the MONTHLY SUMMARY TABLE and quote the exact income/expense/net figures.
- When asked to list transactions, use the DETAILED MONTHLY TRANSACTIONS section.
- Be concise — 2 to 4 sentences max.
- Never say data is unavailable if it exists above.`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  return NextResponse.json({ reply: completion.choices[0]?.message?.content ?? "Could not generate a response." });
}