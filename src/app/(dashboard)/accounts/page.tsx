"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Wallet, Edit2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  type: z.enum(["checking","savings","credit","investment","cash"]),
  balance: z.number(),
  currency: z.string().default("USD"),
  color: z.string(),
});
type F = z.infer<typeof schema>;

const COLORS = ["#6366f1","#22c55e","#f97316","#ec4899","#3b82f6","#14b8a6","#f59e0b","#ef4444","#8b5cf6","#0ea5e9"];

export default function AccountsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: () => fetch("/api/accounts").then(r => r.json()) });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { type: "checking", balance: 0, currency: "USD", color: "#6366f1" },
  });

  const createMutation = useMutation({
    mutationFn: (data: F) => fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); reset(); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const selectedColor = watch("color");
  const total = accounts.reduce((a: number, b: { balance: number }) => a + b.balance, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Total across all accounts</p>
          <p className="text-3xl font-bold text-white mt-1">{formatCurrency(total)}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all">
          <Plus className="h-4 w-4" />Add Account
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">New Account</h3>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm mb-1 block">Account Name</label>
                <input {...register("name")} placeholder="e.g. Main Checking" className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-1 block">Type</label>
                <select {...register("type")} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                  {["checking","savings","credit","investment","cash"].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-1 block">Initial Balance</label>
                <input {...register("balance", { valueAsNumber: true })} type="number" step="0.01" placeholder="0.00" className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-1 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setValue("color", c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColor === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all">Create Account</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-all">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc: { id: string; name: string; type: string; balance: number; color: string }) => (
          <div key={acc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${acc.color}20` }}>
                <Wallet className="h-5 w-5" style={{ color: acc.color }} />
              </div>
              <button onClick={() => deleteMutation.mutate(acc.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-slate-400 text-xs capitalize mb-1">{acc.type}</p>
            <p className="text-white font-semibold mb-2">{acc.name}</p>
            <div className="h-px bg-slate-800 mb-3" />
            <p className={`text-xl font-bold ${acc.balance >= 0 ? "text-white" : "text-red-400"}`}>{formatCurrency(acc.balance)}</p>
            <div className="mt-3 h-1 rounded-full" style={{ backgroundColor: `${acc.color}30` }}>
              <div className="h-1 rounded-full" style={{ backgroundColor: acc.color, width: "60%" }} />
            </div>
          </div>
        ))}
        {accounts.length === 0 && !showForm && (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No accounts yet. Add your first account to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
