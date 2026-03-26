"use client";
import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Search, Upload, X, Check, Pencil, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { formatCurrency } from "@/lib/utils";

type Tx = {
  id: string; description: string; amount: number; type: string;
  date: string; accountId: string; categoryId: string | null;
  accountName: string | null; accountColor: string | null;
  catName: string | null; catIcon: string | null; catColor: string | null;
};
type Account = { id: string; name: string; color: string };
type Category = { id: string; name: string; icon: string; color: string };

const txSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  categoryId: z.string().optional(),
  amount: z.number().positive("Must be positive"),
  type: z.enum(["income", "expense", "transfer"]),
  description: z.string().min(1, "Required"),
  notes: z.string().optional(),
  date: z.string(),
});
type TxForm = z.infer<typeof txSchema>;

const DATE_PRESETS = [
  { label: "This month",    from: () => format(startOfMonth(new Date()), "yyyy-MM-dd"), to: () => format(endOfMonth(new Date()), "yyyy-MM-dd") },
  { label: "Last month",    from: () => format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"), to: () => format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd") },
  { label: "Last 3 months", from: () => format(subMonths(new Date(), 3), "yyyy-MM-dd"), to: () => format(new Date(), "yyyy-MM-dd") },
  { label: "This year",     from: () => format(startOfYear(new Date()), "yyyy-MM-dd"), to: () => format(new Date(), "yyyy-MM-dd") },
  { label: "All time",      from: () => "", to: () => "" },
  { label: "Custom",        from: () => "", to: () => "" },
];

function detectCol(headers: string[], keys: string[]) {
  for (const k of keys) {
    const i = headers.findIndex(h => h.toLowerCase().includes(k.toLowerCase()));
    if (i !== -1) return i;
  }
  return -1;
}

function parseCSV(text: string): string[][] {
  // Strip BOM (Excel adds \uFEFF at start of CSV files)
  const clean = text.replace(/^\uFEFF/, "").trim();
  return clean.split("\n").map(line => {
    // Strip carriage returns from Windows line endings
    const cleanLine = line.replace(/\r$/, "");
    const cells: string[] = [];
    let cur = "", inQ = false;
    for (const ch of cleanLine) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

const INPUT = "w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500";

function TxFields({ accounts, categories, reg, errors }: {
  accounts: Account[]; categories: Category[];
  reg: ReturnType<typeof useForm<TxForm>>["register"];
  errors: ReturnType<typeof useForm<TxForm>>["formState"]["errors"];
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label className="text-slate-300 text-sm mb-1 block">Type</label>
        <select {...reg("type")} className={INPUT}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>
      <div>
        <label className="text-slate-300 text-sm mb-1 block">Amount</label>
        <input {...reg("amount", { valueAsNumber: true })} type="number" step="0.01" placeholder="0.00" className={INPUT} />
        {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
      </div>
      <div>
        <label className="text-slate-300 text-sm mb-1 block">Date</label>
        <input {...reg("date")} type="date" className={INPUT} />
      </div>
      <div>
        <label className="text-slate-300 text-sm mb-1 block">Account</label>
        <select {...reg("accountId")} className={INPUT}>
          <option value="">Select account</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {errors.accountId && <p className="text-red-400 text-xs mt-1">{errors.accountId.message}</p>}
      </div>
      <div>
        <label className="text-slate-300 text-sm mb-1 block">Category</label>
        <select {...reg("categoryId")} className={INPUT}>
          <option value="">No category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-slate-300 text-sm mb-1 block">Description</label>
        <input {...reg("description")} placeholder="What was this for?" className={INPUT} />
        {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
      </div>
    </div>
  );
}

function EditModal({ tx, accounts, categories, onClose, onSaved }: {
  tx: Tx; accounts: Account[]; categories: Category[];
  onClose: () => void; onSaved: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      accountId: tx.accountId, categoryId: tx.categoryId ?? "",
      amount: tx.amount, type: tx.type as TxForm["type"],
      description: tx.description, date: tx.date,
    },
  });
  async function onSubmit(data: TxForm) {
    await fetch(`/api/transactions/${tx.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, categoryId: data.categoryId || null }) });
    onSaved(); onClose();
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-white font-semibold text-lg">Edit Transaction</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <TxFields accounts={accounts} categories={categories} reg={register} errors={errors} />
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CSVImport({ accounts, categories, onClose, onImported }: {
  accounts: Account[]; categories: Category[];
  onClose: () => void; onImported: () => void;
}) {
  const [step, setStep] = useState<"upload"|"map"|"preview"|"done">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({ date: -1, description: -1, amount: -1, typeCol: -1 });
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [defType, setDefType] = useState<"auto"|"expense"|"income">("auto");
  const [importing, setImporting] = useState(false);
  const [count, setCount] = useState(0);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function load(file: File) {
    const r = new FileReader();
    r.onload = e => {
      const parsed = parseCSV(e.target?.result as string);
      if (parsed.length < 2) return;
      const hdrs = parsed[0];
      setHeaders(hdrs); setRows(parsed.slice(1).filter(r => r.some(c => c)));
      setMapping({
        date: detectCol(hdrs, ["date","time","posted","transaction date"]),
        description: detectCol(hdrs, ["description","memo","details","narration","particulars","name"]),
        amount: detectCol(hdrs, ["amount","debit","credit","sum","value"]),
        // Some CSVs include an explicit income/expense column; if not found we'll fall back to sign-based auto-detection.
        typeCol: detectCol(hdrs, ["type","transaction type","category type","income expense","debit credit"]),
      });
      setStep("map");
    };
    r.readAsText(file);
  }

  function preview() {
    return rows.slice(0,5).map(r => ({
      date: mapping.date >= 0 ? r[mapping.date] : format(new Date(),"yyyy-MM-dd"),
      description: mapping.description >= 0 ? r[mapping.description] : "Imported",
      amount: Math.abs(parseFloat((mapping.amount >= 0 ? r[mapping.amount] : "0").replace(/[^0-9.-]/g,""))||0),
    }));
  }

  async function doImport() {
    setImporting(true);
    setImportError("");
    const payload = rows.map(r => {
      const rawAmt = parseFloat((mapping.amount >= 0 ? r[mapping.amount] : "0").replace(/[^0-9.-]/g,"")) || 0;
      const amt = Math.abs(rawAmt);
      // Priority: 1) explicit type column in CSV, 2) user override, 3) auto-detect from sign
      const csvType = mapping.typeCol >= 0 ? r[mapping.typeCol]?.toLowerCase().trim() : "";
      const csvTypeValid = csvType === "income" || csvType === "expense";
      const autoType: "income"|"expense" = rawAmt < 0 ? "expense" : "income";
      const type: "income"|"expense" = csvTypeValid ? (csvType as "income"|"expense") : (defType === "auto" ? autoType : defType);
      let date = mapping.date >= 0 ? r[mapping.date] : format(new Date(),"yyyy-MM-dd");
      // Only parse if NOT already in yyyy-MM-dd format (avoids timezone shift)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        try {
          // Parse as local date by splitting manually to avoid UTC conversion
          const parts = date.split(/[\/\-\.\s]/);
          if (parts.length === 3) {
            // Handle MM/DD/YYYY or DD/MM/YYYY or YYYY/MM/DD
            let y: string, m: string, d2: string;
            if (parts[0].length === 4) { [y, m, d2] = parts; }           // YYYY-MM-DD
            else if (parseInt(parts[2]) > 31) { [m, d2, y] = parts; }    // MM/DD/YYYY
            else { [d2, m, y] = parts; }                                  // DD/MM/YYYY
            const parsed = new Date(parseInt(y), parseInt(m) - 1, parseInt(d2));
            if (!isNaN(parsed.getTime())) date = format(parsed, "yyyy-MM-dd");
          }
        } catch {}
      }
      return { accountId, amount: amt||0.01, type, description: mapping.description >= 0 ? (r[mapping.description]||"Imported") : "Imported", date };
    }).filter(r => r.amount > 0);
    try {
      const res = await fetch("/api/transactions/import", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({rows: payload}) });
      const json = await res.json();
      if (!res.ok) {
        setImportError(json.error ?? "Import failed");
        setImporting(false);
        return;
      }
      setCount(json.imported ?? 0); setImporting(false); setStep("done");
    } catch (e) {
      setImportError("Network error — please try again");
      setImporting(false);
    }
  }

  const steps = ["Upload","Map columns","Preview","Done"];
  const stepIdx = ["upload","map","preview","done"].indexOf(step);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-white font-semibold text-lg">Import from CSV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-6">
            {steps.map((s,i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${stepIdx >= i ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"}`}>
                  {stepIdx > i ? <Check className="h-3 w-3" /> : i+1}
                </div>
                <span className={`text-xs font-medium ${stepIdx >= i ? "text-white" : "text-slate-500"}`}>{s}</span>
                {i < 3 && <div className={`h-px w-6 ${stepIdx > i ? "bg-emerald-500/50" : "bg-slate-700"}`} />}
              </div>
            ))}
          </div>

          {step === "upload" && (
            <div>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-10 text-center cursor-pointer transition-all group"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) load(f); }}>
                <Upload className="h-10 w-10 text-slate-500 group-hover:text-emerald-400 mx-auto mb-3 transition-colors" />
                <p className="text-white font-medium mb-1">Drop your CSV file here</p>
                <p className="text-slate-400 text-sm">or click to browse — works with most bank exports</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f) load(f); }} />
              </div>
              <p className="text-slate-500 text-xs mt-3 text-center">Supports HDFC, SBI, Chase, Barclays, and most standard bank CSV formats</p>
            </div>
          )}

          {step === "map" && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">We auto-detected your columns. Adjust if needed.</p>
              <div className="grid grid-cols-2 gap-3">
                {(["date","description","amount"] as const).map(f => (
                  <div key={f}>
                    <label className="text-slate-300 text-sm mb-1 block capitalize">{f} column</label>
                    <select value={mapping[f]} onChange={e => setMapping(m => ({...m,[f]:+e.target.value}))} className={INPUT}>
                      <option value={-1}>— not in CSV —</option>
                      {headers.map((h,i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="text-slate-300 text-sm mb-1 block">Type column <span className="text-slate-500">(optional)</span></label>
                  <select value={mapping.typeCol} onChange={e => setMapping(m => ({...m, typeCol:+e.target.value}))} className={INPUT}>
                    <option value={-1}>— not in CSV —</option>
                    {headers.map((h,i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                  <p className="text-slate-500 text-xs mt-1">If your CSV has an &quot;income&quot;/&quot;expense&quot; column</p>
                </div>
                <div>
                  <label className="text-slate-300 text-sm mb-1 block">Import to account</label>
                  <select value={accountId} onChange={e => setAccountId(e.target.value)} className={INPUT}>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm mb-1 block">Transaction type</label>
                  <select value={defType} onChange={e => setDefType(e.target.value as "auto"|"expense"|"income")} className={INPUT}>
                    <option value="auto">Auto-detect (recommended)</option>
                    <option value="expense">All expenses</option>
                    <option value="income">All income</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <p className="text-slate-500 text-sm">{rows.length} rows detected</p>
                <button onClick={() => setStep("preview")} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold">Preview →</button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">Showing first 5 of <span className="text-white font-medium">{rows.length}</span> transactions</p>
              <div className="rounded-xl overflow-hidden border border-slate-800">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-800/50">
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">Date</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">Description</th>
                    <th className="text-right px-3 py-2 text-slate-400 font-medium">Amount</th>
                  </tr></thead>
                  <tbody>{preview().map((r,i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="px-3 py-2 text-slate-300 text-xs">{r.date}</td>
                      <td className="px-3 py-2 text-slate-200 truncate max-w-[200px]">{r.description}</td>
                      <td className="px-3 py-2 text-right text-white font-medium">{formatCurrency(r.amount)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="flex justify-between pt-1">
                <button onClick={() => setStep("map")} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm">← Back</button>
                <button onClick={doImport} disabled={importing} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  {importing ? "Importing..." : `Import all ${rows.length} transactions`}
                </button>
              </div>
              {importError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mt-2">
                  {importError}
                </div>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">Import complete!</h3>
              <p className="text-slate-400 mb-6">{count} transactions imported successfully.</p>
              <button onClick={() => { onImported(); onClose(); }} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState(4);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [editingTx, setEditingTx] = useState<Tx | null>(null);

  const isCustom = datePreset === DATE_PRESETS.length - 1;
  const fromDate = isCustom ? customFrom : DATE_PRESETS[datePreset].from();
  const toDate   = isCustom ? customTo   : DATE_PRESETS[datePreset].to();

  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["transactions", typeFilter, fromDate, toDate],
    queryFn: () => {
      const p = new URLSearchParams();
      if (typeFilter !== "all") p.set("type", typeFilter);
      if (fromDate) p.set("from", fromDate);
      if (toDate)   p.set("to", toDate);
      return fetch(`/api/transactions?${p}`).then(r => r.json());
    },
  });
  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ["accounts"], queryFn: () => fetch("/api/accounts").then(r => r.json()) });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["categories"], queryFn: () => fetch("/api/categories").then(r => r.json()) });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: { type: "expense", date: format(new Date(), "yyyy-MM-dd") },
  });

  const createMutation = useMutation({
    mutationFn: (d: TxForm) => fetch("/api/transactions", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({queryKey:["transactions"], exact: false}); qc.invalidateQueries({queryKey:["accounts"]}); reset({type:"expense",date:format(new Date(),"yyyy-MM-dd")}); setShowForm(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/transactions/${id}`,{method:"DELETE"}),
    onSuccess: () => { qc.invalidateQueries({queryKey:["transactions"], exact: false}); qc.invalidateQueries({queryKey:["accounts"]}); },
  });

  const filtered = useMemo(() =>
    search.trim() ? txns.filter((t: Tx) =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.catName?.toLowerCase().includes(search.toLowerCase())
    ) : txns,
    [txns, search]
  );

  const totalIncome   = filtered.filter((t: Tx) => t.type === "income").reduce((a: number, t: Tx) => a + t.amount, 0);
  const totalExpenses = filtered.filter((t: Tx) => t.type === "expense").reduce((a: number, t: Tx) => a + t.amount, 0);
  const invalidate = () => { qc.invalidateQueries({queryKey:["transactions"], exact: false}); qc.invalidateQueries({queryKey:["accounts"]}); };

  return (
    <div className="space-y-5 max-w-5xl">
      {editingTx && <EditModal tx={editingTx} accounts={accounts} categories={categories} onClose={() => setEditingTx(null)} onSaved={invalidate} />}
      {showCSV && <CSVImport accounts={accounts} categories={categories} onClose={() => setShowCSV(false)} onImported={invalidate} />}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          {["all","income","expense"].map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${typeFilter === f ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
              {f}
            </button>
          ))}
          {/* Date preset dropdown */}
          <div className="relative">
            <button onClick={() => setShowDatePicker(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-all">
              {isCustom && customFrom ? `${customFrom} → ${customTo}` : DATE_PRESETS[datePreset].label}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showDatePicker && (
              <div className="absolute top-10 left-0 z-20 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 min-w-[220px]">
                {DATE_PRESETS.slice(0,-1).map((p,i) => (
                  <button key={p.label} onClick={() => { setDatePreset(i); setShowDatePicker(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${datePreset === i ? "bg-emerald-500/10 text-emerald-400" : "text-slate-300 hover:bg-slate-800"}`}>
                    {p.label}
                  </button>
                ))}
                <div className="border-t border-slate-700 mt-2 pt-2 px-1 space-y-2">
                  <p className="text-slate-500 text-xs px-2">Custom range</p>
                  <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setDatePreset(DATE_PRESETS.length - 1); }}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500" />
                  <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setDatePreset(DATE_PRESETS.length - 1); }}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="bg-slate-800 border border-slate-700 text-white rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 w-40" />
          </div>
          <button onClick={() => setShowCSV(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all">
            <Upload className="h-3.5 w-3.5" />Import CSV
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all">
            <Plus className="h-3.5 w-3.5" />Add
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Income",   value: totalIncome,                   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Expenses", value: totalExpenses,                  color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
            { label: "Net",      value: totalIncome - totalExpenses,    color: (totalIncome - totalExpenses) >= 0 ? "text-white" : "text-red-400", bg: "bg-slate-800/50 border-slate-700" },
          ].map(s => (
            <div key={s.label} className={`border rounded-xl px-4 py-3 ${s.bg}`}>
              <p className="text-slate-400 text-xs mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">New Transaction</h3>
          <form onSubmit={handleSubmit(d => createMutation.mutate({...d,categoryId:d.categoryId||undefined}))} className="space-y-4">
            <TxFields accounts={accounts} categories={categories} reg={register} errors={errors} />
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold">Add</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction list */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {isLoading ? (
          Array.from({length:5}).map((_,i) => (
            <div key={i} className={`flex items-center gap-4 px-5 py-3.5 ${i!==0?"border-t border-slate-800":""}`}>
              <div className="w-9 h-9 rounded-xl bg-slate-800 animate-pulse shrink-0"/>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-800 rounded animate-pulse w-48"/>
                <div className="h-2.5 bg-slate-800/70 rounded animate-pulse w-32"/>
              </div>
              <div className="h-4 bg-slate-800 rounded animate-pulse w-20"/>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 opacity-30"/>
            <p className="font-medium text-slate-400">No transactions found</p>
            <p className="text-sm mt-1">{search ? `No results for "${search}"` : "Add one or import from CSV"}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center px-5 py-2 border-b border-slate-800 bg-slate-800/30">
              <span className="text-xs text-slate-500 font-medium flex-1">Transaction</span>
              <span className="text-xs text-slate-500 font-medium w-28 text-right hidden sm:block">Account</span>
              <span className="text-xs text-slate-500 font-medium w-28 text-right">Amount</span>
              <span className="w-16"/>
            </div>
            {filtered.map((tx: Tx, i: number) => (
              <div key={tx.id} className={`flex items-center gap-3 px-5 py-3.5 ${i!==0?"border-t border-slate-800":""} hover:bg-slate-800/40 group transition-colors`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{backgroundColor:`${tx.catColor??"#6366f1"}20`}}>
                  {tx.catIcon ?? "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{tx.description}</p>
                  <p className="text-xs text-slate-500">{tx.catName ?? "Uncategorized"} · {tx.date}</p>
                </div>
                <div className="w-28 text-right hidden sm:block">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: tx.accountColor??"#6366f1"}}/>
                    <span className="text-xs text-slate-400 truncate">{tx.accountName}</span>
                  </div>
                </div>
                <div className="w-28 flex items-center justify-end gap-1">
                  {tx.type === "income" ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 shrink-0"/> : <ArrowDownLeft className="h-3.5 w-3.5 text-red-400 shrink-0"/>}
                  <span className={`text-sm font-bold ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                </div>
                <div className="w-16 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => setEditingTx(tx)} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all">
                    <Pencil className="h-3.5 w-3.5"/>
                  </button>
                  <button onClick={() => deleteMutation.mutate(tx.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="h-3.5 w-3.5"/>
                  </button>
                </div>
              </div>
            ))}
            <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-800/20 flex justify-between">
              <span className="text-xs text-slate-500">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</span>
              {search && <span className="text-xs text-slate-500">filtered by "{search}"</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
