import type { ConfidenceLevel } from "@/lib/confidence";
import { confidenceLabel } from "@/lib/confidence";

type Props = { level: ConfidenceLevel };

const styles: Record<ConfidenceLevel, string> = {
  HIGH:    "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  MEDIUM:  "bg-amber-500/10 border-amber-500/30 text-amber-400",
  LOW:     "bg-red-500/10 border-red-500/30 text-red-400",
  UNKNOWN: "bg-slate-500/10 border-slate-500/30 text-slate-400",
};

export function ConfidenceBadge({ level }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${styles[level]}`}
      title={confidenceLabel(level)}
    >
      {level}
    </span>
  );
}
