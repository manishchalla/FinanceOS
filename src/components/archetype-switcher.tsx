"use client";
import { useState } from "react";
import { ARCHETYPES, type Archetype } from "@/lib/archetypes";

type Props = { current: Archetype; onSwitch: (a: Archetype) => void };

const colorMap: Record<string, string> = {
  red:    "text-red-400 border-red-500/40 bg-red-500/10",
  amber:  "text-amber-400 border-amber-500/40 bg-amber-500/10",
  green:  "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  purple: "text-purple-400 border-purple-500/40 bg-purple-500/10",
};

export function ArchetypeSwitcher({ current, onSwitch }: Props) {
  const [open, setOpen] = useState(false);
  const info = ARCHETYPES.find(a => a.id === current);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
          info ? colorMap[info.color] : "text-slate-400 border-slate-700 bg-slate-800"
        }`}
      >
        {info?.label ?? "Set archetype"} ▾
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          {ARCHETYPES.map(a => (
            <button
              key={a.id!}
              onClick={() => { onSwitch(a.id); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition-all hover:bg-slate-800 ${current === a.id ? "text-white font-medium" : "text-slate-400"}`}
            >
              <span className={`text-xs font-bold ${colorMap[a.color].split(" ")[0]}`}>{a.label}</span>
              <p className="text-xs text-slate-500 mt-0.5">{a.tagline}</p>
            </button>
          ))}
          <button
            onClick={() => { onSwitch(null); setOpen(false); }}
            className="w-full text-left px-4 py-3 text-xs text-slate-500 hover:bg-slate-800 transition-all border-t border-slate-800"
          >
            Default view
          </button>
        </div>
      )}
    </div>
  );
}
