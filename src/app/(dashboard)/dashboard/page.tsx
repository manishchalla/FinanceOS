import { auth } from "@/auth";
import { db, accounts, transactions, categories, users } from "@/db";
import { eq, and, gte, lte, sum, sql, count } from "drizzle-orm";
import { startOfMonth, endOfMonth, format, subMonths, getDaysInMonth, getDate, startOfYear } from "date-fns";
import { getCashRunway } from "@/lib/insights";
import { detectRecurring } from "@/lib/subscriptions";
import { computeDailySpendable } from "@/lib/spendable";
import { computeYoY } from "@/lib/analytics";
import { DashboardClient } from "./client";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id!;
  const now = new Date();

  // Get user archetype
  const [userRow] = await db.select({ userArchetype: users.userArchetype })
    .from(users).where(eq(users.id, userId)).limit(1);
  const archetype = userRow?.userArchetype ?? null;

  const [dateRange] = await db.select({
    earliest: sql<string>`min(${transactions.date})`,
    latest:   sql<string>`max(${transactions.date})`,
    total:    count(transactions.id),
  }).from(transactions).where(eq(transactions.userId, userId));

  const hasTransactions = (dateRange?.total ?? 0) > 0;
  const latestDate = dateRange?.latest ? new Date(dateRange.latest) : now;
  const activeMonth = hasTransactions ? latestDate : now;
  const ams = format(startOfMonth(activeMonth), "yyyy-MM-dd");
  const ame = format(endOfMonth(activeMonth), "yyyy-MM-dd");
  const sixMonthsAgo = format(startOfMonth(subMonths(activeMonth, 5)), "yyyy-MM-dd");

  // YoY: current year vs previous year
  const thisYearStart = format(startOfYear(activeMonth), "yyyy-MM-dd");
  const thisYearEnd = format(endOfMonth(activeMonth), "yyyy-MM-dd");
  const lastYearStart = format(startOfYear(new Date(activeMonth.getFullYear() - 1, 0, 1)), "yyyy-MM-dd");
  const lastYearEnd = format(endOfMonth(new Date(activeMonth.getFullYear() - 1, activeMonth.getMonth(), 1)), "yyyy-MM-dd");

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
    thisYearExpenseRes,
    lastYearExpenseRes,
    incomeBySource,
  ] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)),

    db.select({ t: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "income"), gte(transactions.date, ams), lte(transactions.date, ame))),

    db.select({ t: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), gte(transactions.date, ams), lte(transactions.date, ame))),

    db.select({
      id: transactions.id, description: transactions.description,
      amount: transactions.amount, type: transactions.type, date: transactions.date,
      catName: categories.name, catIcon: categories.icon, catColor: categories.color,
    }).from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(sql`${transactions.date} DESC`)
      .limit(8),

    db.select({ month: sql<string>`strftime('%Y-%m', ${transactions.date})`, total: sum(transactions.amount) })
      .from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.type, "income"), gte(transactions.date, sixMonthsAgo), lte(transactions.date, ame)))
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`),

    db.select({ month: sql<string>`strftime('%Y-%m', ${transactions.date})`, total: sum(transactions.amount) })
      .from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), gte(transactions.date, sixMonthsAgo), lte(transactions.date, ame)))
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`),

    db.select({ month: sql<string>`strftime('%Y-%m', ${transactions.date})`, total: sum(transactions.amount) })
      .from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.type, "transfer"), gte(transactions.date, sixMonthsAgo), lte(transactions.date, ame)))
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`),

    db.select({ name: categories.name, icon: categories.icon, color: categories.color, total: sum(transactions.amount) })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), gte(transactions.date, ams), lte(transactions.date, ame)))
      .groupBy(categories.id).orderBy(sql`sum(${transactions.amount}) DESC`).limit(6),

    db.select({ description: transactions.description, amount: transactions.amount, date: transactions.date, type: transactions.type })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.date, sixMonthsAgo), lte(transactions.date, ame))),

    // YoY expense comparison
    db.select({ t: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), gte(transactions.date, thisYearStart), lte(transactions.date, thisYearEnd))),

    db.select({ t: sum(transactions.amount) }).from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense"), gte(transactions.date, lastYearStart), lte(transactions.date, lastYearEnd))),

    // Income sources for concentration analysis
    db.select({ description: transactions.description, total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "income"), gte(transactions.date, sixMonthsAgo), lte(transactions.date, ame)))
      .groupBy(transactions.description)
      .orderBy(sql`sum(${transactions.amount}) DESC`)
      .limit(10),
  ]);

  const incomeByMonth  = Object.fromEntries(chartRawIncome.map(r => [r.month, Number(r.total ?? 0)]));
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

  // Spendable calculation
  const daysInMonth = getDaysInMonth(activeMonth);
  const dayOfMonth = hasTransactions ? getDate(latestDate) : getDate(now);
  const spendable = computeDailySpendable(monthlyIncome, monthlyExpenses, recurringSubscriptions, totalBalance, daysInMonth, dayOfMonth);

  // YoY
  const thisYearExp = Number(thisYearExpenseRes[0]?.t ?? 0);
  const lastYearExp = Number(lastYearExpenseRes[0]?.t ?? 0);
  const expenseYoY = computeYoY(thisYearExp, lastYearExp);

  // Income concentration
  const totalIncomeInPeriod = incomeBySource.reduce((a, r) => a + Number(r.total ?? 0), 0);
  const incomeSources = incomeBySource.map(r => ({
    description: r.description,
    total: Number(r.total ?? 0),
    pct: totalIncomeInPeriod > 0 ? (Number(r.total ?? 0) / totalIncomeInPeriod) * 100 : 0,
  }));

  // Savings rate trend (last 6 months)
  const savingsRateTrend = monthSeries.map(m => {
    const inc = incomeByMonth[m.key] ?? 0;
    const exp = expenseByMonth[m.key] ?? 0;
    return inc > 0 ? ((inc - exp) / inc) * 100 : 0;
  });
  const currentSavingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  return <DashboardClient data={{
    totalBalance, monthlyIncome, monthlyExpenses,
    netSavings: monthlyIncome - monthlyExpenses,
    activeMonthLabel,
    accounts: userAccounts,
    recent: recent.map(r => ({ ...r, catName: r.catName ?? null, catIcon: r.catIcon ?? null, catColor: r.catColor ?? null })),
    chartData, netWorthChartData, cashRunway,
    recurringSubscriptions,
    catSpend: catSpend.map(c => ({ ...c, total: Number(c.total ?? 0) })),
    archetype,
    spendable,
    expenseYoY,
    incomeSources,
    savingsRateTrend,
    currentSavingsRate,
    avgMonthlyExpenses,
  }} />;
}
