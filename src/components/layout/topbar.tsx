"use client";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import type { User } from "next-auth";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard", "/transactions": "Transactions",
  "/accounts": "Accounts", "/budgets": "Budgets", "/categories": "Categories",
};

export function TopBar({ user }: { user: User }) {
  const path = usePathname();
  const title = titles[path] ?? "FinanceOS";
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        <p className="text-xs text-slate-400">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
          <Bell className="h-4 w-4" />
        </button>
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <span className="text-xs font-bold text-emerald-400">{user?.name?.[0]?.toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
}
