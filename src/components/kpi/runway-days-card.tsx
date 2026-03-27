import { formatCurrency } from "@/lib/utils";
import type { InsightStatus } from "@/lib/insights";

type Props = {
  monthsRemaining: number;
  totalBalance: number;
  avgMonthlyExpenses: number;
  status: InsightStatus;
};

const statusColor = { green: "text-emerald-400", amber: "text-amber-400", red: "text-red-400" };
const statusBg = { green: "bg-emerald-500/10 border-emerald-500/20", amber: "bg-amber-500/10 border-amber-500/20", red: "bg-red-500/10 border-red-500/20" };

export function RunwayDaysCard({ monthsRemaining, totalBalance, avgMonthlyExpenses, status }: Props) {
  const daysRemaining = Number.isFinite(monthsRemaining) ? Math.round(monthsRemaining * 30) : 999;
  const label = daysRemaining >= 999 ? "∞" : String(daysRemaining);

  return (
    <div className={`rounded-xl border p-5 ${statusBg[status]}`}>
      <p className="text-xs text-slate-400 mb-2">Runway</p>
      <p className={`text-4xl font-bold ${statusColor[status]}`}>{label}<span className="text-xl ml-1">days</span></p>
      <p className="text-xs text-slate-500 mt-2">
        {formatCurrency(totalBalance)} ÷ {formatCurrency(avgMonthlyExpenses)}/mo
      </p>
      {status === "red" && (
        <p className="text-xs text-red-400 mt-2 font-medium">⚠ Less than 3 months. Review expenses now.</p>
      )}
    </div>
  );
}
