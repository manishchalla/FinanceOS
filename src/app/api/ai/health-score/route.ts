import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, transactions, accounts, budgets } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { askGroq } from "@/lib/groq";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;

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

  if (allTx.length === 0) {
    return NextResponse.json({ error: "No transactions found" }, { status: 400 });
  }

  // Do ALL calculations in code
  const monthly: Record<string, { income: number; expense: number }> = {};
  for (const tx of allTx) {
    const m = tx.date.slice(0, 7);
    if (!monthly[m]) monthly[m] = { income: 0, expense: 0 };
    if (tx.type === "income")  monthly[m].income  += tx.amount;
    if (tx.type === "expense") monthly[m].expense += tx.amount;
  }

  const months      = Object.values(monthly);
  const numMonths   = months.length;
  const totalIncome  = months.reduce((a, m) => a + m.income, 0);
  const totalExpense = months.reduce((a, m) => a + m.expense, 0);
  const avgIncome    = totalIncome  / numMonths;
  const avgExpense   = totalExpense / numMonths;
  const avgSavings   = avgIncome - avgExpense;
  const savingsRate  = avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0;
  const expenseRatio = avgIncome > 0 ? (avgExpense / avgIncome) * 100 : 100;
  const totalBalance = userAccounts.reduce((a, b) => a + b.balance, 0);
  const totalNet     = totalIncome - totalExpense;

  // Compute scores entirely in code — do not let LLM score
  const srScore  = savingsRate >= 40 ? 90 : savingsRate >= 30 ? 75 : savingsRate >= 20 ? 60 : savingsRate >= 10 ? 40 : savingsRate > 0 ? 20 : 0;
  const scScore  = expenseRatio <= 50 ? 90 : expenseRatio <= 60 ? 75 : expenseRatio <= 70 ? 60 : expenseRatio <= 80 ? 45 : 25;
  const baScore  = budgetList.length === 0 ? 30 : Math.min(30 + budgetList.length * 10, 70);
  const adScore  = userAccounts.length >= 3 ? 80 : userAccounts.length === 2 ? 60 : 30;
  const overall  = Math.round((srScore * 0.35) + (scScore * 0.35) + (baScore * 0.15) + (adScore * 0.15));
  const grade    = overall >= 85 ? "A" : overall >= 70 ? "B" : overall >= 55 ? "C" : overall >= 40 ? "D" : "F";

  // Top expense descriptions
  const descMap: Record<string, number> = {};
  for (const tx of allTx) {
    if (tx.type === "expense") descMap[tx.description] = (descMap[tx.description] ?? 0) + tx.amount;
  }
  const topExpenses = Object.entries(descMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const earliestMonth = Object.keys(monthly).sort()[0];
  const latestMonth   = Object.keys(monthly).sort().reverse()[0];

  // Monthly table
  const monthTable = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, d]) => `${m}: income=$${d.income.toFixed(2)} expenses=$${d.expense.toFixed(2)} net=$${(d.income - d.expense).toFixed(2)}`)
    .join("\n");

  // Now send pre-computed scores to LLM — only ask for text descriptions
  const prompt = `You are a financial analyst writing a report. All scores and numbers below are already calculated. Write insights and summaries using ONLY these exact numbers — do not recalculate anything.

PRE-COMPUTED DATA (${numMonths} months: ${earliestMonth} to ${latestMonth}):
- Overall score: ${overall}/100  Grade: ${grade}
- Average monthly income: $${avgIncome.toFixed(2)}
- Average monthly expenses: $${avgExpense.toFixed(2)}
- Average monthly savings: $${avgSavings.toFixed(2)}
- Savings rate: ${savingsRate.toFixed(1)}%
- Expense-to-income ratio: ${expenseRatio.toFixed(1)}%
- Total income all time: $${totalIncome.toFixed(2)}
- Total expenses all time: $${totalExpense.toFixed(2)}
- Total net savings: $${totalNet.toFixed(2)}
- Total balance: $${totalBalance.toFixed(2)}
- Active budgets: ${budgetList.length}
- Number of accounts: ${userAccounts.length}
- Top expenses: ${topExpenses.map(([d, t]) => `"${d}" $${t.toFixed(2)}`).join(", ")}

MONTHLY BREAKDOWN:
${monthTable}

PRE-COMPUTED SCORES (use exactly these numbers):
- savingsRate score: ${srScore}/100
- spendingControl score: ${scScore}/100
- budgetAdherence score: ${baScore}/100
- accountDiversity score: ${adScore}/100

Write a JSON response with insights and recommendations. Use the exact scores above.
Respond ONLY with valid JSON, no markdown:
{
  "score": ${overall},
  "grade": "${grade}",
  "summary": "<2 sentences using the actual numbers above>",
  "breakdown": {
    "savingsRate":     { "score": ${srScore}, "label": "<Excellent|Good|Fair|Poor>", "insight": "<1 sentence quoting the ${savingsRate.toFixed(1)}% savings rate>" },
    "spendingControl": { "score": ${scScore}, "label": "<Excellent|Good|Fair|Poor>", "insight": "<1 sentence quoting the ${expenseRatio.toFixed(1)}% expense ratio>" },
    "budgetAdherence": { "score": ${baScore}, "label": "<Excellent|Good|Fair|Poor>", "insight": "<1 sentence about ${budgetList.length} active budgets>" },
    "accountDiversity":{ "score": ${adScore}, "label": "<Excellent|Good|Fair|Poor>", "insight": "<1 sentence about ${userAccounts.length} account(s)>" }
  },
  "topInsights": [
    "<insight 1 with an actual dollar figure from the data>",
    "<insight 2 with an actual dollar figure from the data>",
    "<insight 3 with an actual dollar figure from the data>"
  ],
  "actionItems": [
    "<specific action 1>",
    "<specific action 2>",
    "<specific action 3>"
  ]
}`;

  const raw = await askGroq("You are a JSON-only financial report writer. Use only the numbers provided. Never recalculate.", prompt, 1024);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "AI response invalid" }, { status: 500 });

  const result = JSON.parse(match[0]);

  // Override scores with our calculated values — never trust LLM scores
  result.score = overall;
  result.grade = grade;
  result.breakdown.savingsRate.score     = srScore;
  result.breakdown.spendingControl.score = scScore;
  result.breakdown.budgetAdherence.score = baScore;
  result.breakdown.accountDiversity.score = adScore;

  return NextResponse.json(result);
}