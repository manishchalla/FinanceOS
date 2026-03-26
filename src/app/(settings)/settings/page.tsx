"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/user-preferences");
        if (!res.ok) throw new Error("Failed to load");
        const json = (await res.json()) as { privacyMode: boolean };
        setPrivacyMode(Boolean(json.privacyMode));
      } catch {
        setError("Could not load settings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save(next: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyMode: next }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setPrivacyMode(next);
    } catch {
      setError("Could not save privacy mode.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-white font-semibold text-xl">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Privacy controls for your AI assistant.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-white font-medium">Privacy mode</p>
            <p className="text-slate-400 text-sm mt-1">
              When enabled, transaction descriptions are anonymized before being sent to the LLM.
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={privacyMode}
              disabled={loading || saving}
              onChange={(e) => save(e.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
            <span className={`text-sm ${privacyMode ? "text-emerald-400" : "text-slate-500"}`}>
              {privacyMode ? "On" : "Off"}
            </span>
          </label>
        </div>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
      {saving && <div className="text-slate-400 text-sm">Saving…</div>}
    </div>
  );
}

