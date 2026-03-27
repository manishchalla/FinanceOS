"use client";
import { useEffect, useState } from "react";
import { ARCHETYPES } from "@/lib/archetypes";

type Prefs = { privacyMode: boolean; archetype: string | null };

const colorMap: Record<string, string> = {
  red:    "bg-red-500/10 border-red-500/30 text-red-400",
  amber:  "bg-amber-500/10 border-amber-500/30 text-amber-400",
  green:  "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  purple: "bg-purple-500/10 border-purple-500/30 text-purple-400",
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Prefs>({ privacyMode: false, archetype: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user-preferences")
      .then(r => r.json())
      .then((j: Prefs) => { setPrefs(j); setLoading(false); })
      .catch(() => { setError("Could not load settings."); setLoading(false); });
  }, []);

  async function savePrefs(next: Partial<Prefs>) {
    setSaving(true); setError(null); setSaved(false);
    const updated = { ...prefs, ...next };
    try {
      const res = await fetch("/api/user-preferences", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyMode: updated.privacyMode, archetype: updated.archetype }),
      });
      if (!res.ok) throw new Error("Failed");
      setPrefs(updated); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { setError("Could not save settings."); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-white font-semibold text-xl">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Personalize your dashboard and AI assistant.</p>
      </div>

      {/* Archetype */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-white font-medium mb-1">Dashboard mode</h2>
        <p className="text-slate-400 text-sm mb-4">Choose your financial archetype. Your dashboard KPIs will adapt.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ARCHETYPES.map(a => {
            const isActive = prefs.archetype === a.id;
            const c = colorMap[a.color];
            return (
              <button
                key={a.id!}
                disabled={saving}
                onClick={() => savePrefs({ archetype: a.id! })}
                className={`text-left px-4 py-3 rounded-xl border transition-all ${isActive ? c : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"}`}
              >
                <p className={`text-sm font-semibold ${isActive ? "" : "text-slate-300"}`}>{a.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{a.tagline}</p>
              </button>
            );
          })}
          <button
            disabled={saving}
            onClick={() => savePrefs({ archetype: null })}
            className={`text-left px-4 py-3 rounded-xl border transition-all ${prefs.archetype === null ? "border-slate-500 bg-slate-800 text-slate-300" : "border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-600"}`}
          >
            <p className="text-sm font-semibold">Default view</p>
            <p className="text-xs text-slate-500 mt-0.5">Standard dashboard, all KPIs</p>
          </button>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white font-medium">Privacy mode</h2>
            <p className="text-slate-400 text-sm mt-1">
              Anonymize merchant names before sending to the AI. Descriptions become MERCHANT_CATEGORY_N tokens.
            </p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={prefs.privacyMode}
              disabled={loading || saving}
              onChange={e => savePrefs({ privacyMode: e.target.checked })}
              className="h-4 w-4 accent-emerald-400"
            />
            <span className={`text-sm ${prefs.privacyMode ? "text-emerald-400" : "text-slate-500"}`}>
              {prefs.privacyMode ? "On" : "Off"}
            </span>
          </label>
        </div>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
      {saved && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">Saved!</div>}
      {saving && <div className="text-slate-400 text-sm">Saving…</div>}
    </div>
  );
}
