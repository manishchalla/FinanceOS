"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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
    catSpend: { name: string | null; icon: string | null; color: string | null; total: number }[];
  };
};

export function DashboardClient({ data }: Props) {
  const stats = [
    { label: "Total Balance",    value: data.totalBalance,    icon: Wallet,      color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    sub: "across all accounts" },
    { label: "Income",           value: data.monthlyIncome,   icon: TrendingUp,  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", sub: data.activeMonthLabel },
    { label: "Expenses",         value: data.monthlyExpenses, icon: TrendingDown,color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     sub: data.activeMonthLabel },
    { label: "Net Savings",      value: data.netSavings,      icon: PiggyBank,
      color: data.netSavings >= 0 ? "text-emerald-400" : "text-red-400",
      bg:    data.netSavings >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      border:data.netSavings >= 0 ? "border-emerald-500/20" : "border-red-500/20",
      sub: data.activeMonthLabel },
  ];

  const hasChartData = data.chartData.some(d => d.income > 0 || d.expenses > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-400">{s.label}</p>
              <div className={`p-2 rounded-lg ${s.bg} border ${s.border}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
            <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
          </div>
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
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
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
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                    formatter={(v: number) => [formatCurrency(v)]}
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
                  style={{ backgroundColor: `${tx.catColor ?? "#6366f1"}20` }}>
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
    </div>
  );
}
