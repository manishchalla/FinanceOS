import type { YoYResult } from "@/lib/analytics";

type Props = { yoy: YoYResult };

export function YoYBadge({ yoy }: Props) {
  if (yoy.deltaPct === null) return <span className="text-xs text-slate-500">No prior year data</span>;
  const up = yoy.direction === "up";
  const flat = yoy.direction === "flat";
  const color = flat ? "text-slate-400" : up ? "text-red-400" : "text-emerald-400";
  const sign = up ? "+" : "";
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {sign}{yoy.deltaPct.toFixed(1)}% vs last year
    </span>
  );
}
