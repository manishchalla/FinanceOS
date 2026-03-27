"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { SpendableBreakdown } from "@/lib/spendable";

type Props = { data: SpendableBreakdown };

const statusStyle = {
  green: "text-emerald-400",
  amber: "text-amber-400",
  red:   "text-red-400",
};

const bgStyle = {
  green: "bg-emerald-500/10 border-emerald-500/20",
  amber: "bg-amber-500/10 border-amber-500/20",
  red:   "bg-red-500/10 border-red-500/20",
};

export function SpendableHero({ data }: Props) {
  const [open, setOpen] = useState(false);
  const s = data.status;

  return (
    <div className={`rounded-2xl border p-6 ${bgStyle[s]}`}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm text-slate-400">Today you can spend</p>
        <span className="text-xs text-slate-500">{data.daysRemaining} days left in month</span>
      </div>
      <p className={`text-5xl font-bold ${statusStyle[s]} mb-1`}>
        {formatCurrency(data.dailySpendable)}
      </p>
      <p className="text-xs text-slate-500 mb-4">
        {formatCurrency(data.trueDiscretionary)} discretionary ÷ {data.daysRemaining} days
      </p>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        {open ? "Hide" : "Show"} breakdown ▾
      </button>

      {open && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          {[
            { label: "Income this month", value: data.incomeThisMonth, sign: "+" },
            { label: "Committed bills", value: data.committedBills, sign: "-" },
            { label: "Savings goal (10%)", value: data.savingsGoal, sign: "-" },
            { label: "Already spent", value: data.alreadySpent, sign: "-" },
            { label: "True discretionary", value: data.trueDiscretionary, sign: "=" },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-slate-400">{row.sign} {row.label}</span>
              <span className="text-slate-200 font-medium">{formatCurrency(row.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
