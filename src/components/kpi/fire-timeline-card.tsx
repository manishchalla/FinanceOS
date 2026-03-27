import { formatCurrency } from "@/lib/utils";

type Props = { totalBalance: number; annualExpenses: number };

export function FireTimelineCard({ totalBalance, annualExpenses }: Props) {
  // FIRE = 25× annual expenses (4% rule)
  const fireNumber = annualExpenses * 25;
  const pct = fireNumber > 0 ? Math.min(100, (totalBalance / fireNumber) * 100) : 0;
  const remaining = Math.max(0, fireNumber - totalBalance);

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-5">
      <p className="text-xs text-slate-400 mb-2">FIRE progress</p>
      <p className="text-2xl font-bold text-purple-400">{pct.toFixed(1)}<span className="text-lg ml-1">%</span></p>
      <div className="h-2 bg-slate-800 rounded-full mt-3 mb-2 overflow-hidden">
        <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-500">
        Target: {formatCurrency(fireNumber)} · {formatCurrency(remaining)} to go
      </p>
    </div>
  );
}
