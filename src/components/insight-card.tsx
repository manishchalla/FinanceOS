import { formatCurrency } from "@/lib/utils";
import type { InsightStatus } from "@/lib/insights";

const statusStyles: Record<InsightStatus, { color: string; bg: string; border: string }> = {
  green: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  amber: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  red: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

type Props = {
  label: string;
  value: number;
  trend: string;
  status: InsightStatus;
  insight: string;
};

export function InsightCard({ label, value, trend, status, insight }: Props) {
  const s = statusStyles[status];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-400">{label}</p>
        <div className={`px-2 py-1 text-xs rounded-lg ${s.bg} border ${s.border}`}>
          {trend}
        </div>
      </div>
      <p className={`text-2xl font-bold ${s.color}`}>{formatCurrency(value)}</p>
      <p className="text-xs text-slate-500 mt-1">{insight}</p>
    </div>
  );
}

