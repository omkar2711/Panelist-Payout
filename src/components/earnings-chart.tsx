"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";

export function EarningsChart({
  data,
}: {
  data: { label: string; amount: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#898781" }}
            axisLine={{ stroke: "#e1e0d9" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#898781" }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e1e0d9",
              boxShadow: "0 4px 12px rgba(11,11,11,0.08)",
              fontSize: 13,
            }}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Bar dataKey="amount" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
