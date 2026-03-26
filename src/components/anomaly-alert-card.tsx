"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

type Anomaly = {
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  amount: number | null;
  category?: string | null;
};

type AnomalyResult = {
  anomalies: Anomaly[];
  summary: string;
};

const severityStyles: Record<Anomaly["severity"], string> = {
  high: "text-red-400 border-red-500/30 bg-red-500/10",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  low: "text-blue-400 border-blue-500/30 bg-blue-500/10",
};

export function AnomalyAlertCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnomalyResult | null>(null);

  async function scan() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/anomalies");
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json()) as AnomalyResult;
      setResult(json);
    } catch {
      setError("Could not run anomaly scan right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="text-white font-semibold">Anomaly Alerts</h3>
        </div>
        <a href="/ai" className="text-xs text-slate-400 hover:text-amber-400 transition-colors">
          Open Radar
        </a>
      </div>

      {!result && !loading && !error && (
        <div className="text-sm text-slate-400">
          <p>Scan latest transactions for unusual charges or spending spikes.</p>
          <button
            onClick={scan}
            className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-all"
          >
            Run Scan
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          Scanning for anomalies...
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && !loading && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">{result.summary}</p>
          {result.anomalies.length === 0 ? (
            <div className="text-sm text-emerald-400">No anomalies detected.</div>
          ) : (
            result.anomalies.slice(0, 3).map((a, idx) => (
              <div key={`${a.type}-${idx}`} className={`border rounded-lg p-3 ${severityStyles[a.severity]}`}>
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs opacity-90 mt-1">{a.description}</p>
              </div>
            ))
          )}
          <button
            onClick={scan}
            className="mt-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          >
            Rescan
          </button>
        </div>
      )}
    </div>
  );
}

