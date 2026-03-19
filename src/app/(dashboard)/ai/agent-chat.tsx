"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Trash2, Zap, Brain, CheckCircle, Database, PieChart, Tag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type Message = { role: "user"|"assistant"; content: string; toolCalls?: ToolCall[] };
type ToolCall = { name: string; result?: string };

const TOOL_ICONS: Record<string, { icon: typeof Zap; label: string; color: string }> = {
  query_transactions:    { icon: Database,   label: "Querying transactions",  color: "text-blue-400" },
  get_spending_summary:  { icon: PieChart,   label: "Loading summary",        color: "text-purple-400" },
  create_budget:         { icon: CheckCircle,label: "Creating budget",        color: "text-emerald-400" },
  categorize_transaction:{ icon: Tag,        label: "Categorizing",           color: "text-amber-400" },
  save_memory:           { icon: Brain,      label: "Saving to memory",       color: "text-pink-400" },
  get_accounts:          { icon: Database,   label: "Loading accounts",       color: "text-blue-400" },
};

const SUGGESTED = [
  "What was my total income in December 2025?",
  "Which month had the highest expenses?",
  "Set a $500 monthly food budget",
  "How much did I spend on food in total?",
  "What is my savings rate?",
  "Categorize all Netflix transactions as Entertainment",
];

export default function AgentChat() {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load chat history from DB on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/ai/history");
        if (!res.ok) return;
        const data = await res.json();
        if (data.length > 0) {
          setMessages(data.map((m: { role: "user"|"assistant"; content: string }) => ({
            role: m.role,
            content: m.content,
            toolCalls: [],
          })));
        }
      } catch {}
    }
    loadHistory();
  }, []); // runs once on mount

  // Scroll to bottom when messages change
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(msg: string) {
    if (!msg.trim() || streaming) return;
    setInput("");
    setStreaming(true);
    setActiveTools([]);

    const userMsg: Message = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);

    // Placeholder for assistant reply
    const assistantIdx = messages.length + 1;
    setMessages(prev => [...prev, { role: "assistant", content: "", toolCalls: [] }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("Request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      const toolCalls: ToolCall[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("0:")) {
            // Text chunk
            try {
              const text = JSON.parse(line.slice(2));
              fullText += text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullText, toolCalls };
                return updated;
              });
            } catch {}
          } else if (line.startsWith("9:")) {
            // Tool call start
            try {
              const data = JSON.parse(line.slice(2));
              const toolName = data.toolName;
              if (toolName) {
                setActiveTools(prev => [...prev, toolName]);
                toolCalls.push({ name: toolName });
              }
            } catch {}
          } else if (line.startsWith("a:")) {
            // Tool result
            try {
              const data = JSON.parse(line.slice(2));
              setActiveTools([]);
              if (toolCalls.length > 0) {
                toolCalls[toolCalls.length - 1].result = JSON.stringify(data.result);
              }
            } catch {}
          }
        }
      }

      // Invalidate queries if AI took actions
      if (toolCalls.some(t => ["create_budget","categorize_transaction"].includes(t.name))) {
        qc.invalidateQueries({ queryKey: ["budgets"], exact: false });
        qc.invalidateQueries({ queryKey: ["transactions"], exact: false });
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
      setActiveTools([]);
    }
  }

  async function clearHistory() {
    await fetch("/api/ai/agent", { method: "DELETE" });
    setMessages([]);
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <Zap className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">AI Finance Agent</h2>
            <p className="text-slate-400 text-xs">Groq · Llama 3.3 · Tool calling · Persistent memory</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 rounded-lg text-xs transition-all">
            <Trash2 className="h-3.5 w-3.5" />Clear history
          </button>
        )}
      </div>

      {/* Capabilities */}
      {messages.length === 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Database,    color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    title: "Read your data", desc: "Queries transactions, accounts, spending summaries" },
            { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", title: "Take actions",    desc: "Creates budgets, categorizes transactions" },
            { icon: Brain,       color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/20",    title: "Remembers you",  desc: "Saves preferences across sessions" },
          ].map(c => (
            <div key={c.title} className={`${c.bg} border ${c.border} rounded-xl p-4`}>
              <c.icon className={`h-5 w-5 ${c.color} mb-2`} />
              <p className="text-white text-sm font-medium">{c.title}</p>
              <p className="text-slate-400 text-xs mt-1">{c.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chat window */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col" style={{ height: "520px" }}>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <p className="text-slate-400 text-sm mb-1">Ask anything or give a command</p>
              <p className="text-slate-600 text-xs mb-5">The AI can read your data AND take actions</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-purple-500/20 hover:text-purple-300 border border-slate-700 hover:border-purple-400/50 rounded-full text-xs text-slate-300 transition-all text-left">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              {/* Tool call badges */}
              {m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {m.toolCalls.map((t, ti) => {
                    const info = TOOL_ICONS[t.name];
                    if (!info) return null;
                    return (
                      <div key={ti} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs">
                        <info.icon className={`h-3 w-3 ${info.color}`} />
                        <span className="text-slate-200 font-medium">{info.label}</span>
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-purple-500 text-white rounded-tr-sm"
                  : "bg-slate-800 text-white rounded-tl-sm border border-slate-700"
              }`}>
                {m.content || (m.role === "assistant" && streaming && i === messages.length - 1 ? (
                  <span className="text-slate-500 italic">thinking...</span>
                ) : "")}
                {/* Streaming cursor */}
                {m.role === "assistant" && streaming && i === messages.length - 1 && m.content && (
                  <span className="inline-block w-1.5 h-3.5 bg-purple-400 ml-0.5 animate-pulse rounded-sm" />
                )}
              </div>
            </div>
          ))}

          {/* Active tool indicator */}
          {activeTools.length > 0 && (
            <div className="flex items-start">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {activeTools.map((tool, i) => {
                    const info = TOOL_ICONS[tool];
                    return info ? (
                      <div key={i} className="flex items-center gap-1.5">
                        <Loader2 className={`h-3.5 w-3.5 ${info.color} animate-spin`} />
                        <span className="text-slate-400 text-xs">{info.label}...</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask a question or give a command..."
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button onClick={() => send(input)} disabled={!input.trim() || streaming}
              className="p-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white rounded-xl transition-all">
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-slate-600 text-xs mt-2 text-center">Chat history saved across sessions · AI can create budgets and categorize transactions</p>
        </div>
      </div>
    </div>
  );
}