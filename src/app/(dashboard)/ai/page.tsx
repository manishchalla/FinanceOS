"use client";
import { useState, useRef, useEffect } from "react";
import { Brain, MessageSquare, AlertTriangle, Zap, Send, Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { ConfidenceBadge } from "@/components/confidence-badge";
import type { ConfidenceLevel } from "@/lib/confidence";

type HealthScore = {
  score: number; grade: string; summary: string;
  breakdown: Record<string, { score: number; label: string; insight: string }>;
  topInsights: string[]; actionItems: string[];
};
type Anomaly = {
  type: string; severity: "high" | "medium" | "low";
  title: string; description: string;
  amount: number | null; category: string | null;
  reason?: string; transaction_id?: string;
};
type AnomalyResult = { anomalies: Anomaly[]; summary: string };
type ChatSource = "ai" | "calculated" | "ai-estimate" | "rule-based";
type ChatMessage = { role: "user"|"assistant"; content: string; source?: ChatSource; query?: string; confidence?: ConfidenceLevel };

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 54, circ = 2 * Math.PI * r;
  const fill = circ - (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg width="144" height="144" className="-rotate-90">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-white">{score}</p>
        <p className="text-lg font-bold" style={{ color }}>{grade}</p>
      </div>
    </div>
  );
}

function BreakdownBar({ label, score, insight }: { label: string; score: number; insight: string }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : score >= 40 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300 font-medium capitalize">{label.replace(/([A-Z])/g, " $1")}</span>
        <span className="text-slate-400">{score}/100</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-slate-500">{insight}</p>
    </div>
  );
}

const SEVERITY: Record<string, string> = {
  high:   "bg-red-500/10 border-red-500/30 text-red-400",
  medium: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  low:    "bg-blue-500/10 border-blue-500/30 text-blue-400",
};

const SUGGESTED = [
  "Am I spending too much on food?",
  "What is my biggest expense?",
  "Can I afford a $50/month subscription?",
  "How is my savings rate?",
  "Where should I cut spending?",
];

const TABS = [
  { id: "score",     label: "Health Score",  icon: Brain },
  { id: "chat",      label: "Finance Chat",  icon: MessageSquare },
  { id: "anomalies", label: "Anomaly Radar", icon: AlertTriangle },
];

export default function AIPage() {
  const [tab, setTab] = useState("score");
  const [healthData, setHealthData] = useState<HealthScore | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [anomalyData, setAnomalyData] = useState<AnomalyResult | null>(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [anomalyError, setAnomalyError] = useState("");
  const [anomalyFeedback, setAnomalyFeedback] = useState<Record<string, "confirmed" | "false_alarm">>({});

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadHealthScore() {
    setHealthLoading(true); setHealthError("");
    try {
      const res = await fetch("/api/ai/health-score");
      if (!res.ok) throw new Error("Failed");
      setHealthData(await res.json());
    } catch { setHealthError("Could not load. Check GROQ_API_KEY in .env.local"); }
    finally { setHealthLoading(false); }
  }

  async function loadAnomalies() {
    setAnomalyLoading(true); setAnomalyError("");
    try {
      const res = await fetch("/api/ai/anomalies");
      if (!res.ok) throw new Error("Failed");
      setAnomalyData(await res.json());
    } catch { setAnomalyError("Could not run detection. Check GROQ_API_KEY in .env.local"); }
    finally { setAnomalyLoading(false); }
  }

  async function sendChat(msg: string) {
    if (!msg.trim() || chatLoading) return;
    const updated: ChatMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(updated); setInput(""); setChatLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const json = await res.json();
      setMessages(m => [...m, {
        role: "assistant",
        content: json.reply ?? "Sorry, try again.",
        source: json.source as ChatSource | undefined,
        query: typeof json.query === "string" ? json.query : undefined,
        confidence: json.confidence as ConfidenceLevel | undefined,
      }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Network error. Please try again." }]);
    } finally { setChatLoading(false); }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <Zap className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-lg">AI Finance Assistant</h2>
          <p className="text-slate-400 text-sm">Powered by Groq · Llama 3.3 70B · Free</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "text-slate-400 hover:text-white"}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === "score" && (
        <div className="space-y-4">
          {!healthData && !healthLoading && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
              <Brain className="h-12 w-12 text-purple-400/40 mx-auto mb-4" />
              <h3 className="text-white font-semibold text-lg mb-2">Financial Health Score</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">AI scores your finances 0-100 based on savings rate, spending control, and budget adherence with specific actions to improve.</p>
              <button onClick={loadHealthScore} className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-semibold transition-all">Analyse My Finances</button>
            </div>
          )}
          {healthLoading && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Analysing your financial patterns...</p>
            </div>
          )}
          {healthError && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{healthError}</div>}
          {healthData && !healthLoading && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6">
                <ScoreRing score={healthData.score} grade={healthData.grade} />
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Overall Assessment</p>
                  <p className="text-white text-sm leading-relaxed">{healthData.summary}</p>
                  <button onClick={loadHealthScore} className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-400 transition-colors mx-auto sm:mx-0">
                    <RefreshCw className="h-3 w-3" />Refresh
                  </button>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-5">Score Breakdown</h3>
                <div className="space-y-5">
                  {Object.entries(healthData.breakdown).map(([key, val]) => (
                    <BreakdownBar key={key} label={key} score={val.score} insight={val.insight} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" />Key Insights</h3>
                  <div className="space-y-2">
                    {healthData.topInsights.map((ins, i) => (
                      <div key={i} className="flex gap-2 text-sm"><span className="text-emerald-400 mt-0.5 shrink-0">•</span><span className="text-slate-300">{ins}</span></div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" />Action Items</h3>
                  <div className="space-y-2">
                    {healthData.actionItems.map((act, i) => (
                      <div key={i} className="flex gap-2 text-sm"><span className="text-amber-400 font-bold shrink-0">{i+1}.</span><span className="text-slate-300">{act}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-purple-400" />
                <div>
                  <h3 className="text-white font-semibold">Finance Chat</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Fast answers when possible; LLM fallback when needed</p>
                </div>
              </div>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-slate-700 px-3 py-1.5 rounded-lg">Clear</button>
              )}
            </div>

            <div className="mt-4 bg-slate-950/40 border border-slate-800 rounded-xl p-3">
              {messages.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-slate-400 text-sm">Ask about totals, averages, or "can I afford $X/month"</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {SUGGESTED.map(s => (
                      <button key={s} onClick={() => sendChat(s)} className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:border-purple-500/50 transition-all">{s}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-purple-500 text-white rounded-tr-sm" : "bg-slate-800 text-white rounded-tl-sm border border-slate-700"}`}>
                        {m.content}
                      </div>
                      {m.role === "assistant" && (m.source || m.confidence) && (
                        <div className="flex items-center gap-2 mt-1">
                          {m.source && <span className="text-[11px] text-slate-400">Source: <span className="text-purple-300">{m.source}</span></span>}
                          {m.confidence && <ConfidenceBadge level={m.confidence} />}
                        </div>
                      )}
                      {m.role === "assistant" && m.query && (
                        <details className="text-[11px] text-slate-500 mt-1">
                          <summary className="cursor-pointer hover:text-purple-300 transition-colors">View query</summary>
                          <pre className="mt-2 whitespace-pre-wrap p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300">{m.query}</pre>
                        </details>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2 items-start">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(input); } }}
                placeholder="Ask a question or give a command..."
                className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors" />
              <button onClick={() => sendChat(input)} disabled={!input.trim() || chatLoading}
                className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white rounded-xl transition-all font-semibold text-sm">
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : <Send className="h-4 w-4 mx-auto" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "anomalies" && (
        <div className="space-y-4">
          {!anomalyData && !anomalyLoading && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-400/40 mx-auto mb-4" />
              <h3 className="text-white font-semibold text-lg mb-2">Anomaly Radar</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">Compares recent spending against historical averages. Flags duplicate charges, spending spikes, and large one-offs. Thresholds auto-tune from your feedback.</p>
              <button onClick={loadAnomalies} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-all">Scan My Transactions</button>
            </div>
          )}
          {anomalyLoading && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
              <Loader2 className="h-8 w-8 text-amber-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Scanning for unusual patterns...</p>
            </div>
          )}
          {anomalyError && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{anomalyError}</div>}
          {anomalyData && !anomalyLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">{anomalyData.summary}</p>
                <button onClick={loadAnomalies} className="text-xs text-slate-500 hover:text-amber-400 flex items-center gap-1 transition-colors">
                  <RefreshCw className="h-3 w-3" />Rescan
                </button>
              </div>
              {anomalyData.anomalies.length === 0 ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                  <p className="text-emerald-400 font-medium">No anomalies detected</p>
                  <p className="text-slate-400 text-sm mt-1">Your spending looks normal.</p>
                </div>
              ) : anomalyData.anomalies.map((a, i) => (
                <div key={i} className={`border rounded-xl p-4 ${SEVERITY[a.severity]}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${SEVERITY[a.severity]}`}>{a.severity}</span>
                        {a.category && <span className="text-xs text-slate-500">{a.category}</span>}
                      </div>
                      <p className="font-semibold text-sm">{a.title}</p>
                      <p className="text-xs mt-1 opacity-80">{a.description}</p>
                      {a.reason && <p className="text-xs mt-2 text-slate-400 opacity-95 font-medium">Why: {a.reason}</p>}
                    </div>
                    {a.amount != null && <p className="text-sm font-bold shrink-0">${a.amount.toFixed(2)}</p>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={!a.transaction_id || anomalyFeedback[`${a.type}-${a.transaction_id}`] !== undefined}
                      onClick={async () => {
                        if (!a.transaction_id) return;
                        const key = `${a.type}-${a.transaction_id}`;
                        setAnomalyFeedback(prev => ({ ...prev, [key]: "confirmed" }));
                        await fetch("/api/anomaly-feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transaction_id: a.transaction_id, type: a.type, user_verdict: "confirmed" }) });
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 disabled:opacity-50"
                    >{anomalyFeedback[`${a.type}-${a.transaction_id}`] === "confirmed" ? "✓ Confirmed" : "Confirm"}</button>
                    <button
                      disabled={!a.transaction_id || anomalyFeedback[`${a.type}-${a.transaction_id}`] !== undefined}
                      onClick={async () => {
                        if (!a.transaction_id) return;
                        const key = `${a.type}-${a.transaction_id}`;
                        setAnomalyFeedback(prev => ({ ...prev, [key]: "false_alarm" }));
                        await fetch("/api/anomaly-feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transaction_id: a.transaction_id, type: a.type, user_verdict: "false_alarm" }) });
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 disabled:opacity-50"
                    >{anomalyFeedback[`${a.type}-${a.transaction_id}`] === "false_alarm" ? "✓ Noted" : "False alarm"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
