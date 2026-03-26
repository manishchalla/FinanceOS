"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { InsightCard } from "@/components/insight-card";
import { NetWorthChart } from "@/components/net-worth-chart";
import { SubscriptionsCard } from "@/components/subscriptions-card";
import { AnomalyAlertCard } from "@/components/anomaly-alert-card";
import { computeMonthStatus, getTrendVsAverage } from "@/lib/insights";
import type { RecurringSubscription } from "@/lib/subscriptions";
import { formatCurrency } from "@/lib/utils";

type Props = {
  data: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    netSavings: number;
    activeMonthLabel: string;
    accounts: { id: string; name: string; type: string; balance: number; color: string }[];
    recent: { id: string; description: string; amount: number; type: string; date: string; catName: string | null; catIcon: string | null; catColor: string | null }[];
    chartData: { month: string; income: number; expenses: number }[];
    netWorthChartData: { month: string; netWorth: number }[];
    cashRunway: { monthsRemaining: number; status: "green" | "amber" | "red"; insight: string };
    recurringSubscriptions: RecurringSubscription[];
    catSpend: { name: string | null; icon: string | null; color: string | null; total: number }[];
  };
};

export function DashboardClient({ data }: Props) {
  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

  const cashRunwayStyles: Record<"green" | "amber" | "red", { color: string; bg: string; border: string }> = {
    green: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    amber: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    red: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  };

  const incomeHistory = data.chartData.map(d => d.income);
  const expenseHistory = data.chartData.map(d => d.expenses);
  const netSavingsHistory = data.chartData.map(d => d.income - d.expenses);

  // `chartData` is 6 months ending at the active month. Use the first 5 months as baseline.
  const incomeAvg = avg(incomeHistory.slice(0, 5));
  const expenseAvg = avg(expenseHistory.slice(0, 5));
  const netSavingsAvg = avg(netSavingsHistory.slice(0, 5));

  const incomeTrend = getTrendVsAverage(data.monthlyIncome, incomeAvg);
  const expensesTrend = getTrendVsAverage(data.monthlyExpenses, expenseAvg);
  const netSavingsTrend = getTrendVsAverage(data.netSavings, netSavingsAvg);

  const incomeStatus = computeMonthStatus(incomeTrend.pct, { isGoodWhenHigher: true });
  const expensesStatus = computeMonthStatus(expensesTrend.pct, { isGoodWhenHigher: false });
  const netSavingsStatus = computeMonthStatus(netSavingsTrend.pct, { isGoodWhenHigher: true });

  const insightCards = [
    {
      label: "Total Balance",
      value: data.totalBalance,
      trend: netSavingsTrend.trend,
      status: netSavingsStatus,
      insight: netSavingsTrend.insight.replace("average", "average cashflow"),
    },
    {
      label: "Income",
      value: data.monthlyIncome,
      trend: incomeTrend.trend,
      status: incomeStatus,
      insight: incomeTrend.insight,
    },
    {
      label: "Expenses",
      value: data.monthlyExpenses,
      trend: expensesTrend.trend,
      status: expensesStatus,
      insight: expensesTrend.insight,
    },
    {
      label: "Net Savings",
      value: data.netSavings,
      trend: netSavingsTrend.trend,
      status: netSavingsStatus,
      insight: netSavingsTrend.insight,
    },
  ];

  const hasChartData = data.chartData.some(d => d.income > 0 || d.expenses > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {insightCards.map(card => (
          <InsightCard
            key={card.label}
            label={card.label}
            value={card.value}
            trend={card.trend}
            status={card.status}
            insight={card.insight}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Area Chart */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-1">Income vs Expenses</h3>
          <p className="text-slate-400 text-xs mb-4">Last 6 months ending {data.activeMonthLabel}</p>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }}
                  labelStyle={{ color: "#f1f5f9", fontWeight: 500, marginBottom: 4 }}
                  itemStyle={{ color: "#cbd5e1" }}
                  formatter={(v: number) => [formatCurrency(v)]}
                />
                <Area type="monotone" dataKey="income"   stroke="#10b981" fill="url(#ig)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#eg)" strokeWidth={2} name="Expenses" />
                <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
              No transaction data for this period
            </div>
          )}

          <NetWorthChart data={data.netWorthChartData} />
        </div>

        {/* Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-1">Spending by Category</h3>
          <p className="text-slate-400 text-xs mb-2">{data.activeMonthLabel}</p>
          {data.catSpend.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={data.catSpend} dataKey="total" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {data.catSpend.map((c, i) => <Cell key={i} fill={c.color ?? "#6366f1"} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }}
                    labelStyle={{ color: "#f1f5f9", fontWeight: 500 }}
                    itemStyle={{ color: "#cbd5e1" }}
                    formatter={(v: number, name: string) => [formatCurrency(v), name ?? "Amount"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {data.catSpend.slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color ?? "#6366f1" }} />
                      <span className="text-slate-300">{c.icon} {c.name ?? "Other"}</span>
                    </div>
                    <span className="text-slate-400">{formatCurrency(c.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">No expense data</div>
          )}
        </div>

        {/* Cash Runway */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3">Cash Runway</h3>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Months remaining</p>
            <div className={`px-2 py-1 text-xs rounded-lg ${cashRunwayStyles[data.cashRunway.status].bg} border ${cashRunwayStyles[data.cashRunway.status].border}`}>
              {data.cashRunway.status.toUpperCase()}
            </div>
          </div>
          <p className={`text-2xl font-bold ${cashRunwayStyles[data.cashRunway.status].color}`}>
            {Number.isFinite(data.cashRunway.monthsRemaining)
              ? Math.max(0, Math.round(data.cashRunway.monthsRemaining * 10) / 10).toString()
              : "∞"}
          </p>
          <p className="text-xs text-slate-500 mt-1">{data.cashRunway.insight}</p>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Recent Transactions</h3>
          {data.recent.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No transactions yet</p>
          ) : data.recent.map((tx, i) => (
            <div key={tx.id} className={`flex items-center justify-between py-2.5 ${i !== 0 ? "border-t border-slate-800" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ backgroundColor: `${tx.catColor ?? "#64748b"}20` }}>
                  {tx.catIcon ?? "📦"}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{tx.description}</p>
                  <p className="text-xs text-slate-500">{tx.catName ?? "Uncategorized"} · {tx.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {tx.type === "income"
                  ? <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                  : <ArrowDownLeft className="h-3 w-3 text-red-400" />}
                <span className={`text-sm font-semibold ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Accounts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Accounts</h3>
          {data.accounts.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No accounts yet</p>
          ) : data.accounts.map(acc => (
            <div key={acc.id} className="flex items-center justify-between p-3 mb-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                <div>
                  <p className="text-sm font-medium text-slate-200">{acc.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{acc.type}</p>
                </div>
              </div>
              <p className={`text-sm font-bold ${acc.balance >= 0 ? "text-white" : "text-red-400"}`}>
                {formatCurrency(acc.balance)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SubscriptionsCard items={data.recurringSubscriptions} />
        <AnomalyAlertCard />
      </div>
    </div>
  );
}