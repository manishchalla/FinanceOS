"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, PieChart } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1),
  categoryId: z.string().optional(),
  amount: z.number().positive(),
  period: z.enum(["monthly","weekly","yearly"]),
  startDate: z.string(),
});
type F = z.infer<typeof schema>;

export default function BudgetsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data: budgets = [] } = useQuery({ queryKey: ["budgets"], queryFn: () => fetch("/api/budgets").then(r => r.json()) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => fetch("/api/categories").then(r => r.json()) });
  const { data: txns = [] } = useQuery({
    queryKey: ["transactions-month"],
    queryFn: () => {
      const now = new Date();
      const from = format(startOfMonth(now), "yyyy-MM-dd");
      const to = format(endOfMonth(now), "yyyy-MM-dd");
      return fetch(`/api/transactions?from=${from}&to=${to}&type=expense`).then(r => r.json());
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { period: "monthly", startDate: format(startOfMonth(new Date()), "yyyy-MM-dd") },
  });

  const createMutation = useMutation({
    mutationFn: (data: F) => fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budgets"] }); reset(); setShowForm(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/budgets/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });

  function getSpent(categoryId: string | null) {
    return txns.filter((t: { categoryId: string }) => t.categoryId === categoryId).reduce((a: number, t: { amount: number }) => a + t.amount, 0);
  }

  type Budget = { id: string; name: string; amount: number; period: string; categoryId: string | null };
  type Category = { id: string; name: string; icon: string; color: string };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Monthly Budgets</h2>
          <p className="text-slate-400 text-sm mt-1">Track your spending against targets</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all">
          <Plus className="h-4 w-4" />Add Budget
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">New Budget</h3>
          <form onSubmit={handleSubmit(d => createMutation.mutate({ ...d, categoryId: d.categoryId || undefined }))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm mb-1 block">Budget Name</label>
                <input {...register("name")} placeholder="e.g. Food Budget" className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-1 block">Amount</label>
                <input {...register("amount", { valueAsNumber: true })} type="number" step="0.01" placeholder="500.00" className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-1 block">Category</label>
                <select {...register("categoryId")} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">All expenses</option>
                  {categories.filter((c: Category) => c.name !== "Transfer").map((c: Category) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-1 block">Period</label>
                <select {...register("period")} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold">Create Budget</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {budgets.length === 0 && !showForm ? (
          <div className="text-center py-16 text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
            <PieChart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No budgets yet. Create one to start tracking.</p>
          </div>
        ) : budgets.map((b: Budget) => {
          const cat = categories.find((c: Category) => c.id === b.categoryId);
          const spent = getSpent(b.categoryId);
          const pct = Math.min((spent / b.amount) * 100, 100);
          const over = spent > b.amount;
          return (
            <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat?.icon ?? "💰"}</span>
                  <div>
                    <p className="text-white font-medium">{b.name}</p>
                    <p className="text-slate-400 text-xs capitalize">{b.period} · {cat?.name ?? "All expenses"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${over ? "text-red-400" : "text-white"}`}>{formatCurrency(spent)}</p>
                    <p className="text-xs text-slate-400">of {formatCurrency(b.amount)}</p>
                  </div>
                  <button onClick={() => deleteMutation.mutate(b.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${over ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-emerald-500"}`}
                  style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-slate-500">{pct.toFixed(0)}% used</span>
                <span className={`text-xs ${over ? "text-red-400" : "text-slate-500"}`}>
                  {over ? `${formatCurrency(spent - b.amount)} over budget` : `${formatCurrency(b.amount - spent)} remaining`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
