type Props = { savingsRate: number; trend: number[] };

export function SavingsRateCard({ savingsRate, trend }: Props) {
  const color = savingsRate >= 20 ? "text-emerald-400" : savingsRate >= 10 ? "text-amber-400" : "text-red-400";
  const bg = savingsRate >= 20 ? "bg-emerald-500/10 border-emerald-500/20" : savingsRate >= 10 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";
  const lastVsPrev = trend.length >= 2 ? ((trend[trend.length-1]! - trend[trend.length-2]!) / Math.abs(trend[trend.length-2]! || 1)) * 100 : 0;

  return (
    <div className={`rounded-xl border p-5 ${bg}`}>
      <p className="text-xs text-slate-400 mb-2">Savings rate</p>
      <p className={`text-4xl font-bold ${color}`}>{savingsRate.toFixed(1)}<span className="text-xl ml-1">%</span></p>
      {trend.length >= 2 && (
        <p className={`text-xs mt-2 ${lastVsPrev >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {lastVsPrev >= 0 ? "+" : ""}{lastVsPrev.toFixed(1)}% vs last month
        </p>
      )}
      {savingsRate < 10 && (
        <p className="text-xs text-red-400 mt-2 font-medium">Target: 20%. Audit recurring expenses.</p>
      )}
    </div>
  );
}
