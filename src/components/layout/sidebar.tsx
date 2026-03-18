"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Wallet, PieChart, Tag, TrendingUp, LogOut, Sparkles } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { User } from "next-auth";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/ai", label: "AI Assistant", icon: Sparkles },
];

export function Sidebar({ user }: { user: User }) {
  const path = usePathname();
  return (
    <aside className="w-64 flex flex-col bg-slate-900 border-r border-slate-800 shrink-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="text-lg font-bold text-white">FinanceOS</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link key={href} href={href} className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}>
              <Icon className="h-4 w-4" />{label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{user?.name}</p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut className="h-4 w-4" />Sign Out
        </button>
      </div>
    </aside>
  );
}
