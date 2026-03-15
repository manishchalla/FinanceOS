"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Tag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  icon: z.string().default("📦"),
  color: z.string(),
  type: z.enum(["income","expense","both"]),
});
type F = z.infer<typeof schema>;

const ICONS = ["📦","💼","💻","📈","🍔","🚗","🛍️","🏠","⚕️","🎬","📚","💡","✈️","🎮","💇","🐾","🎁","📱","⛽","🏋️"];
const COLORS = ["#6366f1","#22c55e","#f97316","#ec4899","#3b82f6","#14b8a6","#f59e0b","#ef4444","#8b5cf6","#0ea5e9","#78716c","#a3a3a3"];

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => fetch("/api/categories").then(r => r.json()) });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { type: "expense", icon: "📦", color: "#6366f1" },
  });

  const createMutation = useMutation({
    mutationFn: (data: F) => fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); reset({ type: "expense", icon: "📦", color: "#6366f1" }); setShowForm(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const selColor = watch("color");
  const selIcon = watch("icon");
  type Cat = { id: string; name: string; icon: string; color: string; type: string };
  const income = categories.filter((c: Cat) => c.type === "income");
  const expense = categories.filter((c: Cat) => c.type === "expense");
  const both = categories.filter((c: Cat) => c.type === "both");

  function CatGroup({ title, items }: { title: string; items: Cat[] }) {
    return items.length > 0 ? (
      <div>
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map(c => (
            <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3 group hover:border-slate-700 transition-all">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${c.color}20` }}>{c.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{c.name}</p>
                <div className="w-4 h-1 rounded-full mt-1" style={{ backgroundColor: c.color }} />
              </div>
              <button onClick={() => deleteMutation.mutate(c.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all shrink-0">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    ) : null;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Categories</h2>
          <p className="text-slate-400 text-sm">{categories.length} categories total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all">
          <Plus className="h-4 w-4" />Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">New Category</h3>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm mb-1 block">Name</label>
                <input {...register("name")} placeholder="Category name" className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-1 block">Type</label>
                <select {...register("type")} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-slate-300 text-sm mb-2 block">Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map(ic => (
                  <button type="button" key={ic} onClick={() => setValue("icon", ic)}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${selIcon === ic ? "bg-emerald-500/20 border-2 border-emerald-500" : "bg-slate-800 border-2 border-transparent hover:border-slate-600"}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-slate-300 text-sm mb-2 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button type="button" key={c} onClick={() => setValue("color", c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${selColor === c ? "border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold">Create Category</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
          <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No categories yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <CatGroup title="Income" items={income} />
          <CatGroup title="Expenses" items={expense} />
          <CatGroup title="Both" items={both} />
        </div>
      )}
    </div>
  );
}
