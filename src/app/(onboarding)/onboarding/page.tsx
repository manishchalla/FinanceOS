"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ARCHETYPES } from "@/lib/archetypes";

const colorMap: Record<string, string> = {
  red:    "border-red-500/40 bg-red-500/10 text-red-400",
  amber:  "border-amber-500/40 bg-amber-500/10 text-amber-400",
  green:  "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  purple: "border-purple-500/40 bg-purple-500/10 text-purple-400",
};

const selectedMap: Record<string, string> = {
  red:    "ring-2 ring-red-500 border-red-500",
  amber:  "ring-2 ring-amber-500 border-amber-500",
  green:  "ring-2 ring-emerald-500 border-emerald-500",
  purple: "ring-2 ring-purple-500 border-purple-500",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!selected) return;
    setSaving(true);
    await fetch("/api/user-preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archetype: selected }),
    });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">What describes you best?</h1>
          <p className="text-slate-400">Your dashboard will show the KPIs that matter for your situation. You can change this any time in settings.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {ARCHETYPES.map(a => (
            <button
              key={a.id!}
              onClick={() => setSelected(a.id!)}
              className={`text-left p-5 rounded-2xl border transition-all ${
                selected === a.id
                  ? selectedMap[a.color]
                  : "border-slate-700 bg-slate-900 hover:border-slate-600"
              }`}
            >
              <div className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold mb-3 ${colorMap[a.color]}`}>
                {a.label}
              </div>
              <p className="text-white font-medium text-sm">{a.tagline}</p>
              <p className="text-slate-500 text-xs mt-1.5">"{a.fear}"</p>
            </button>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={save}
            disabled={!selected || saving}
            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl font-semibold transition-all"
          >
            {saving ? "Saving…" : "Set up my dashboard"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="block mx-auto mt-3 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
