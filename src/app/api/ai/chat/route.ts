import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, transactions, accounts, budgets, categories, users } from "@/db";
import { eq, sql } from "drizzle-orm";
import { groq, GROQ_MODEL } from "@/lib/groq";
import { classifyIntent } from "@/lib/chat-router";
import { anonymizeForLLM } from "@/lib/privacy";
import { getCashRunway } from "@/lib/insights";
import { z } from "zod";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;

  const { messages } = z.object({
    messages: z.array(z.object({ role: z.enum(["user","assistant"]), content: z.string() }))
  }).parse(await req.json());

  const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
  const intent = classifyIntent(lastUserMessage);

  const [userAccounts, privacyRow, allTx, budgetList] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db.select({ privacyMode: users.privacyMode }).from(users).where(eq(users.id, userId)).limit(1),
    db.select({
      description: transactions.description,
      categoryName: categories.name,
      amount: transactions.amount,
      type: transactions.type,
      date: transactions.date,
    }).from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(sql`${transactions.date} ASC`),
    db.select().from(budgets).where(eq(budgets.userId, userId)),
  ]);

  const privacyMode = Boolean(privacyRow?.[0]?.privacyMode);

  // Do ALL calculations in code — never let LLM calculate numbers.
  const totalBalance = userAccounts.reduce((a, b) => a + b.balance, 0);

  type MonthData = {
    income: number; expense: number;
    incomeItems: string[]; expenseItems: string[];
  };
  const totalIncome  = allTx.filter(t => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const totalExpense = allTx.filter(t => t.type === "expense").reduce((a, t) => a + t.amount, 0);

  const llmTxs = privacyMode ? anonymizeForLLM(allTx) : allTx;

  const monthly: Record<string, MonthData> = {};
  for (const tx of llmTxs) {
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

  const monthKeysSorted = Object.keys(monthly).sort();
  const latestMonthKey = monthKeysSorted[monthKeysSorted.length - 1] ?? "";
  const prevMonthKey = monthKeysSorted.length >= 2 ? monthKeysSorted[monthKeysSorted.length - 2] : latestMonthKey;

  function monthLabelFromKey(key: string): string {
    if (!key) return "";
    const y = parseInt(key.slice(0, 4), 10);
    const m = parseInt(key.slice(5, 7), 10);
    return format(new Date(y, m - 1, 1), "MMMM yyyy");
  }

  const monthlyTable = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, d]) => {
      const net = d.income - d.expense;
      return `${m}: income=$${d.income.toFixed(2)} | expenses=$${d.expense.toFixed(2)} | net=$${net.toFixed(2)}`;
    }).join("\n");

  const descTotals: Record<string, number> = {};
  for (const tx of llmTxs) {
    if (tx.type === "expense") {
      descTotals[tx.description] = (descTotals[tx.description] ?? 0) + tx.amount;
    }
  }
  const topExpenses = Object.entries(descTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([d, t]) => `"${d}": $${t.toFixed(2)} total`)
    .join("\n");

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

  const q = lastUserMessage.toLowerCase();

  if (intent !== "ambiguous") {
    const avgExpense =
      monthKeysSorted.length > 0
        ? monthKeysSorted.reduce((a, k) => a + (monthly[k]?.expense ?? 0), 0) / monthKeysSorted.length
        : 0;

    if (intent === "data") {
      if (q.includes("total balance") || (q.includes("balance") && q.includes("total"))) {
        return NextResponse.json({
          reply: `Your total balance across all accounts is $${totalBalance.toFixed(2)}.`,
          source: "calculated",
          query: "accounts: sum(balance)",
        });
      }

      if (q.includes("net savings")) {
        const net = totalIncome - totalExpense;
        return NextResponse.json({
          reply: `Net savings are $${net.toFixed(2)}.`,
          source: "calculated",
          query: "transactions: sum(income) - sum(expense)",
        });
      }

      if (q.includes("income")) {
        const monthKey = q.includes("last month") ? prevMonthKey : latestMonthKey;
        const income = monthKey ? monthly[monthKey]?.income ?? 0 : 0;
        return NextResponse.json({
          reply: `Income in ${monthLabelFromKey(monthKey)} is $${income.toFixed(2)}.`,
          source: "calculated",
          query: "transactions: monthly income totals",
        });
      }

      if (q.includes("expenses") || q.includes("spending")) {
        const monthKey = q.includes("last month") ? prevMonthKey : latestMonthKey;
        const expense = monthKey ? monthly[monthKey]?.expense ?? 0 : 0;
        return NextResponse.json({
          reply: `Expenses in ${monthLabelFromKey(monthKey)} are $${expense.toFixed(2)}.`,
          source: "calculated",
          query: "transactions: monthly expense totals",
        });
      }

      if (q.includes("transactions") || q.includes("history")) {
        const totalCount = allTx.length;
        const expenseCount = allTx.filter(t => t.type === "expense").length;
        return NextResponse.json({
          reply: `You have ${totalCount} transactions in your history, including ${expenseCount} expenses.`,
          source: "calculated",
          query: "transactions: count(*)",
        });
      }

      return NextResponse.json({
        reply: `I can calculate totals and month-specific income/expenses. Try: "income in last month" or "average expenses".`,
        source: "calculated",
        query: "transactions: rule-based lookup",
      });
    }

    // planning
    const subMatch = lastUserMessage.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*month|per\s*month|monthly)\b/i);
    const hasAfford = q.includes("afford") || q.includes("subscription") || q.includes("can i afford");
    if (hasAfford && subMatch) {
      const subscriptionCost = parseFloat(subMatch[1] ?? "0");
      const adjustedAvgExpense = avgExpense + subscriptionCost;
      const runway = getCashRunway(adjustedAvgExpense, totalBalance);

      return NextResponse.json({
        reply: `With a ${subscriptionCost.toFixed(2)}/month subscription, your cash runway is about ${Number.isFinite(runway.monthsRemaining) ? runway.monthsRemaining.toFixed(1) : "∞"} months. (${runway.insight})`,
        source: "rule-based",
        query: "cash runway = totalBalance / (avgExpense + subscriptionCost)",
      });
    }

    return NextResponse.json({
      reply: `I can forecast if you share the monthly amount (e.g., "Can I afford a $50/month subscription?").`,
      source: "rule-based",
      query: "planning: missing subscription/monthly amount",
    });
  }

  // ambiguous => LLM
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  return NextResponse.json({
    reply: completion.choices[0]?.message?.content ?? "Could not generate a response.",
    source: "ai-estimate",
    query: "transactions+budgets: precomputed context for LLM",
  });
}
