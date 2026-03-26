"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

export type NetWorthChartPoint = {
  month: string;
  netWorth: number;
};

type Props = {
  data: NetWorthChartPoint[];
};

export function NetWorthChart({ data }: Props) {
  const hasData = data.some(d => d.netWorth !== 0);

  return (
    <div className="mt-6">
      <h3 className="text-white font-semibold mb-1">Net Worth Timeline</h3>
      <p className="text-slate-400 text-xs mb-4">Reconstructed from account balances</p>

      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={v => formatCurrency(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }}
              labelStyle={{ color: "#f1f5f9", fontWeight: 500, marginBottom: 4 }}
              itemStyle={{ color: "#cbd5e1" }}
              formatter={(v: number) => [formatCurrency(v)]}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#8b5cf6"
              fill="url(#nw)"
              strokeWidth={2}
              name="Net Worth"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
          No net worth data for this period
        </div>
      )}
    </div>
  );
}

