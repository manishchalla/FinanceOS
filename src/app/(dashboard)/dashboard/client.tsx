"use client";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { InsightCard } from "@/components/insight-card";
import { NetWorthChart } from "@/components/net-worth-chart";
import { SubscriptionsCard } from "@/components/subscriptions-card";
import { AnomalyAlertCard } from "@/components/anomaly-alert-card";
import { SpendableHero } from "@/components/spendable-hero";
import { ArchetypeSwitcher } from "@/components/archetype-switcher";
import { RunwayDaysCard } from "@/components/kpi/runway-days-card";
import { SavingsRateCard } from "@/components/kpi/savings-rate-card";
import { FireTimelineCard } from "@/components/kpi/fire-timeline-card";
import { IncomeConcentrationCard } from "@/components/kpi/income-concentration-card";
import { YoYBadge } from "@/components/yoy-badge";
import { computeMonthStatus, getTrendVsAverage, type InsightStatus } from "@/lib/insights";
import type { RecurringSubscription } from "@/lib/subscriptions";
import type { SpendableBreakdown } from "@/lib/spendable";
import type { YoYResult } from "@/lib/analytics";
import type { Archetype } from "@/lib/archetypes";
import { formatCurrency } from "@/lib/utils";

type IncomeSource = { description: string; total: number; pct: number };

type Props = {
  data: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    netSavings: number;
    activeMonthLabel: string;
    accounts: { id: string; name: string; type: string; balance: number; color: string; accountPurpose?: string }[];
    recent: { id: string; description: string; amount: number; type: string; date: string; catName: string | null; catIcon: string | null; catColor: string | null }[];
    chartData: { month: string; income: number; expenses: number }[];
    netWorthChartData: { month: string; netWorth: number }[];
    cashRunway: { monthsRemaining: number; status: InsightStatus; insight: string };
    recurringSubscriptions: RecurringSubscription[];
    catSpend: { name: string | null; icon: string | null; color: string | null; total: number }[];
    archetype: Archetype;
    spendable: SpendableBreakdown;
    expenseYoY: YoYResult;
    incomeSources: IncomeSource[];
    savingsRateTrend: number[];
    currentSavingsRate: number;
    avgMonthlyExpenses: number;
  };
};

const COLORS = ["#6366f1","#22c55e","#f97316","#ec4899","#3b82f6","#14b8a6"];

function typeIcon(type: string) {
  if (type === "income") return <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />;
  if (type === "expense") return <ArrowDownLeft className="h-3.5 w-3.5 text-red-400" />;
  return <ArrowUpRight className="h-3.5 w-3.5 text-blue-400" />;
}

export function DashboardClient({ data }: Props) {
  const [archetype, setArchetype] = useState<Archetype>(data.archetype);

  const avgIncome = data.chartData.length
    ? data.chartData.reduce((a, b) => a + b.income, 0) / data.chartData.length : 0;
  const avgExpenses = data.chartData.length
    ? data.chartData.reduce((a, b) => a + b.expenses, 0) / data.chartData.length : 0;

  const incomeTrend = getTrendVsAverage(data.monthlyIncome, avgIncome);
  const expenseTrend = getTrendVsAverage(data.monthlyExpenses, avgExpenses);
  const savingsTrend = getTrendVsAverage(data.netSavings, avgIncome - avgExpenses);

  const incomeStatus = computeMonthStatus(incomeTrend.pct, { isGoodWhenHigher: true });
  const expenseStatus = computeMonthStatus(expenseTrend.pct, { isGoodWhenHigher: false });
  const savingsStatus = computeMonthStatus(savingsTrend.pct, { isGoodWhenHigher: true });

  async function handleArchetypeSwitch(a: Archetype) {
    setArchetype(a);
    await fetch("/api/user-preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archetype: a }),
    });
  }

  const showSpendable = archetype === "cash_surfer" || archetype === "debt_destroyer";
  const showRunway = archetype === "cash_surfer" || archetype === "credit_rebuilder";
  const showSavingsRate = archetype === "wealth_builder";
  const showFIRE = archetype === "wealth_builder";
  const showIncomeConcentration = archetype === "cash_surfer";
  const annualExpenses = data.avgMonthlyExpenses * 12;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-slate-400 text-sm">{data.activeMonthLabel}</p>
          <p className="text-3xl font-bold text-white mt-1">{formatCurrency(data.totalBalance)}</p>
          <p className="text-slate-500 text-sm">Total balance across all accounts</p>
        </div>
        <ArchetypeSwitcher current={archetype} onSwitch={handleArchetypeSwitch} />
      </div>

      {/* Archetype-specific hero: daily spendable */}
      {showSpendable && (
        <SpendableHero data={data.spendable} />
      )}

      {/* Archetype KPIs row */}
      {(showRunway || showSavingsRate || showFIRE || showIncomeConcentration) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {showRunway && (
            <RunwayDaysCard
              monthsRemaining={data.cashRunway.monthsRemaining}
              totalBalance={data.totalBalance}
              avgMonthlyExpenses={data.avgMonthlyExpenses}
              status={data.cashRunway.status}
            />
          )}
          {showSavingsRate && (
            <SavingsRateCard
              savingsRate={data.currentSavingsRate}
              trend={data.savingsRateTrend}
            />
          )}
          {showFIRE && (
            <FireTimelineCard
              totalBalance={data.totalBalance}
              annualExpenses={annualExpenses}
            />
          )}
          {showIncomeConcentration && (
            <IncomeConcentrationCard
              sources={data.incomeSources}
              totalIncome={data.incomeSources.reduce((a, s) => a + s.total, 0)}
            />
          )}
        </div>
      )}

      {/* Standard insight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InsightCard label="Income" value={data.monthlyIncome} trend={incomeTrend.trend} status={incomeStatus} insight={incomeTrend.insight} />
        <InsightCard label="Expenses" value={data.monthlyExpenses} trend={expenseTrend.trend} status={expenseStatus} insight={expenseTrend.insight} />
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-400">Net savings</p>
            <YoYBadge yoy={data.expenseYoY} />
          </div>
          <p className={`text-2xl font-bold ${data.netSavings >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(data.netSavings)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{savingsTrend.insight}</p>
        </div>
      </div>

      {/* Anomaly banner */}
      <AnomalyAlertCard />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.chartData}>
              <defs>
                <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={v => formatCurrency(v)} />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} labelStyle={{ color: "#f1f5f9", fontWeight: 500 }} formatter={(v: number) => [formatCurrency(v)]} />
              <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#ig)" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="#f97316" fill="url(#eg)" strokeWidth={2} name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-1">Spending by category</h3>
          <p className="text-slate-400 text-xs mb-4">{data.activeMonthLabel}</p>
          {data.catSpend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.catSpend} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                  {data.catSpend.map((entry, i) => (
                    <Cell key={i} fill={entry.color ?? COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} formatter={(v: number) => [formatCurrency(v)]} />
                <Legend formatter={v => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">No spending data</div>
          )}
        </div>
      </div>

      {/* Net Worth Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <NetWorthChart data={data.netWorthChartData} />
      </div>

      {/* Subscriptions + Cash Runway side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubscriptionsCard items={data.recurringSubscriptions} />
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-1">Cash runway</h3>
          <p className="text-slate-400 text-xs mb-4">At current avg monthly expenses</p>
          <p className={`text-3xl font-bold ${data.cashRunway.status === "green" ? "text-emerald-400" : data.cashRunway.status === "amber" ? "text-amber-400" : "text-red-400"}`}>
            {Number.isFinite(data.cashRunway.monthsRemaining) ? `${data.cashRunway.monthsRemaining.toFixed(1)} mo` : "∞"}
          </p>
          <p className="text-xs text-slate-500 mt-1">{data.cashRunway.insight}</p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Recent transactions</h3>
          <a href="/transactions" className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">View all</a>
        </div>
        <div className="space-y-2">
          {data.recent.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-800 text-sm flex-shrink-0">
                {tx.catIcon ?? "💸"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{tx.description}</p>
                <p className="text-xs text-slate-500">{tx.catName ?? "Uncategorized"} · {tx.date}</p>
              </div>
              <div className="flex items-center gap-1">
                {typeIcon(tx.type)}
                <span className={`text-sm font-semibold ${tx.type === "income" ? "text-emerald-400" : tx.type === "expense" ? "text-red-400" : "text-blue-400"}`}>
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accounts */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: acc.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{acc.name}</p>
                <p className="text-xs text-slate-500 capitalize">{acc.type}{acc.accountPurpose && acc.accountPurpose !== "personal" ? ` · ${acc.accountPurpose}` : ""}</p>
              </div>
              <p className={`text-sm font-bold flex-shrink-0 ${acc.balance >= 0 ? "text-white" : "text-red-400"}`}>
                {formatCurrency(acc.balance)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
