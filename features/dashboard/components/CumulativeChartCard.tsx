"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { cn } from "@/components/component.utils";
import { chart, status, surface, text } from "@/lib/ui/tokens";
import { fmtMoney } from "../lib/format";

export function CumulativeChartCard({
  data,
  loading,
}: {
  data: { period: string; cumulativePnl: number }[];
  loading?: boolean;
}) {
  return (
    <Card loading={loading} className="overflow-hidden lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">Cumulative P/L (All-time)</CardTitle>
        <div className="hidden rounded-full border border-border bg-[color:var(--surface-1)] p-0.5 text-[11px] sm:inline-flex">
          {["1M", "3M", "1Y", "All-time"].map((label, index) => (
            <button
              key={label}
              type="button"
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                index === 3
                  ? "bg-[color:var(--surface-2)] text-text-primary"
                  : "text-text-tertiary hover:text-text-primary",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="h-[240px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-text-tertiary">
            No realized P/L history yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cumPnlFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={status.positive} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={status.positive} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chart.grid} vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                stroke={chart.axis}
                fontSize={11}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke={chart.axis}
                fontSize={11}
                width={48}
                tickFormatter={(value) =>
                  Math.abs(Number(value)) >= 1000 ? `$${(Number(value) / 1000).toFixed(0)}K` : `$${value}`
                }
              />
              <RechartsTooltip
                cursor={{ stroke: surface.s3, strokeWidth: 1 }}
                contentStyle={{
                  background: surface.s2,
                  border: `1px solid ${surface.border}`,
                  borderRadius: 10,
                  color: text.primary,
                  fontSize: 12,
                }}
                formatter={(value) => [fmtMoney(Number(value ?? 0)), "Cumulative P/L"]}
              />
              <Area
                type="monotone"
                dataKey="cumulativePnl"
                stroke={status.positive}
                strokeWidth={2}
                fill="url(#cumPnlFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
