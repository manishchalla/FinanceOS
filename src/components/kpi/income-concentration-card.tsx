import { formatCurrency } from "@/lib/utils";

type Source = { description: string; total: number; pct: number };

type Props = { sources: Source[]; totalIncome: number };

export function IncomeConcentrationCard({ sources, totalIncome }: Props) {
  const topSource = sources[0];
  const isRisky = topSource && topSource.pct > 40;

  return (
    <div className={`rounded-xl border p-5 ${isRisky ? "bg-amber-500/10 border-amber-500/20" : "bg-slate-900 border-slate-800"}`}>
      <p className="text-xs text-slate-400 mb-3">Income sources</p>
      {sources.length === 0 ? (
        <p className="text-sm text-slate-500">No income recorded this period</p>
      ) : (
        <div className="space-y-2">
          {sources.slice(0, 4).map(s => (
            <div key={s.description}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 truncate max-w-[160px]">{s.description}</span>
                <span className={`font-semibold ${s.pct > 40 ? "text-amber-400" : "text-slate-300"}`}>{s.pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.pct > 40 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {isRisky && (
        <p className="text-xs text-amber-400 mt-3 font-medium">⚠ Top source is {topSource.pct.toFixed(0)}% of income — concentration risk.</p>
      )}
    </div>
  );
}
