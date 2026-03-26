import { auth } from "@/auth";
import { db, accounts, transactions, categories } from "@/db";
import { eq, and, gte, lte, sum, sql, count } from "drizzle-orm";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { getCashRunway } from "@/lib/insights";
import { detectRecurring } from "@/lib/subscriptions";
import { DashboardClient } from "./client";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id!;
  const now = new Date();
  const ms = format(startOfMonth(now), "yyyy-MM-dd");
  const me = format(endOfMonth(now), "yyyy-MM-dd");

  // Find the actual date range of user's transactions (don't assume current month)
  const [dateRange] = await db.select({
    earliest: sql<string>`min(${transactions.date})`,
    latest:   sql<string>`max(${transactions.date})`,
    total:    count(transactions.id),
  }).from(transactions).where(eq(transactions.userId, userId));

  // If user has transactions, use the month of their latest transaction
  // Otherwise fall back to current month
  const hasTransactions = (dateRange?.total ?? 0) > 0;
  const latestDate = dateRange?.latest ? new Date(dateRange.latest) : now;
  const activeMonth = hasTransactions ? latestDate : now;
  const ams = format(startOfMonth(activeMonth), "yyyy-MM-dd");
  const ame = format(endOfMonth(activeMonth), "yyyy-MM-dd");

  // Chart: show 6 months ending at the latest transaction month
  const sixMonthsAgo = format(startOfMonth(subMonths(activeMonth, 5)), "yyyy-MM-dd");

  const [
    userAccounts,
    monthlyIncomeRes,
    monthlyExpRes,
    recent,
    chartRawIncome,
    chartRawExpense,
    chartRawTransfer,
    catSpend,
    lastSixMonthsTx,
  ] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)),

    // Monthly income for active month
    db.select({ t: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "income"),
        gte(transactions.date, ams), lte(transactions.date, ame))),

    // Monthly expenses for active month
    db.select({ t: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"),
        gte(transactions.date, ams), lte(transactions.date, ame))),

    // Recent 8 transactions
    db.select({
      id: transactions.id, description: transactions.description,
      amount: transactions.amount, type: transactions.type, date: transactions.date,
      catName: categories.name, catIcon: categories.icon, catColor: categories.color,
    }).from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(sql`${transactions.date} DESC`)
      .limit(8),

    // Chart income grouped by month
    db.select({
      month: sql<string>`strftime('%Y-%m', ${transactions.date})`,
      total: sum(transactions.amount),
    }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "income"),
        gte(transactions.date, sixMonthsAgo), lte(transactions.date, ame)))
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`),

    // Chart expenses grouped by month
    db.select({
      month: sql<string>`strftime('%Y-%m', ${transactions.date})`,
      total: sum(transactions.amount),
    }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"),
        gte(transactions.date, sixMonthsAgo), lte(transactions.date, ame)))
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`),

    // Chart transfers grouped by month (treated as -amount impact on balances)
    db.select({
      month: sql<string>`strftime('%Y-%m', ${transactions.date})`,
      total: sum(transactions.amount),
    }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "transfer"),
        gte(transactions.date, sixMonthsAgo), lte(transactions.date, ame)))
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`),

    // Category spend for active month
    db.select({
      name: categories.name, icon: categories.icon, color: categories.color,
      total: sum(transactions.amount),
    }).from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"),
        gte(transactions.date, ams), lte(transactions.date, ame)))
      .groupBy(categories.id)
      .orderBy(sql`sum(${transactions.amount}) DESC`)
      .limit(6),

    // Last 6 months transactions for recurring subscription detection
    db.select({
      description: transactions.description,
      amount: transactions.amount,
      date: transactions.date,
      type: transactions.type,
    }).from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, sixMonthsAgo),
        lte(transactions.date, ame),
      )),
  ]);

  const incomeByMonth  = Object.fromEntries(chartRawIncome.map(r  => [r.month, Number(r.total ?? 0)]));
  const expenseByMonth = Object.fromEntries(chartRawExpense.map(r => [r.month, Number(r.total ?? 0)]));
  const transferByMonth = Object.fromEntries(chartRawTransfer.map(r => [r.month, Number(r.total ?? 0)]));

  const totalBalance = userAccounts.reduce((a, b) => a + b.balance, 0);

  const monthSeries = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(activeMonth, 5 - i);
    const key = format(d, "yyyy-MM");
    return { key, monthLabel: format(d, "MMM") };
  });

  const chartData = monthSeries.map(m => ({
    month: m.monthLabel,
    income: incomeByMonth[m.key] ?? 0,
    expenses: expenseByMonth[m.key] ?? 0,
  }));

  const monthlyDeltas = monthSeries.map(m => {
    const income = incomeByMonth[m.key] ?? 0;
    const expenses = expenseByMonth[m.key] ?? 0;
    const transfers = transferByMonth[m.key] ?? 0;
    return income - expenses - transfers;
  });

  const totalDeltaInWindow = monthlyDeltas.reduce((a, b) => a + b, 0);
  const netWorthBaseline = totalBalance - totalDeltaInWindow;

  let cumulativeDelta = 0;
  const netWorthChartData = monthSeries.map((m, i) => {
    cumulativeDelta += monthlyDeltas[i] ?? 0;
    return { month: m.monthLabel, netWorth: netWorthBaseline + cumulativeDelta };
  });

  const avgMonthlyExpenses = chartData.length ? chartData.reduce((a, b) => a + b.expenses, 0) / chartData.length : 0;
  const cashRunway = getCashRunway(avgMonthlyExpenses, totalBalance);
  const recurringSubscriptions = detectRecurring(lastSixMonthsTx);

  const monthlyIncome   = Number(monthlyIncomeRes[0]?.t ?? 0);
  const monthlyExpenses = Number(monthlyExpRes[0]?.t ?? 0);
  const activeMonthLabel = format(activeMonth, "MMMM yyyy");

  return <DashboardClient data={{
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    netSavings: monthlyIncome - monthlyExpenses,
    activeMonthLabel,
    accounts: userAccounts,
    recent: recent.map(r => ({ ...r, catName: r.catName ?? null, catIcon: r.catIcon ?? null, catColor: r.catColor ?? null })),
    chartData,
    netWorthChartData,
    cashRunway,
    recurringSubscriptions,
    catSpend: catSpend.map(c => ({ ...c, total: Number(c.total ?? 0) })),
  }} />;
}
