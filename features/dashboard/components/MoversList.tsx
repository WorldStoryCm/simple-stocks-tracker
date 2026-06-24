"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { cn } from "@/components/component.utils";
import type { DashboardMover } from "../types";
import { fmtMoney, fmtPct } from "../lib/format";

export function MoversList({
  title,
  rows,
  positive,
  loading,
}: {
  title: string;
  rows: DashboardMover[];
  positive: boolean;
  loading?: boolean;
}) {
  return (
    <Card loading={loading} className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border/60 px-0 pt-0">
        {rows.length === 0 ? (
          <div className="px-5 py-6 text-sm text-text-tertiary">No data.</div>
        ) : (
          rows.map((row) => (
            <div key={row.ticker} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary" title={row.ticker}>
                {row.ticker}
              </span>
              <span
                className={cn(
                  "shrink-0 whitespace-nowrap font-tabular text-sm tabular-nums",
                  positive ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
                )}
              >
                {fmtMoney(row.pnl)}
                <span className="ml-2 text-xs text-text-tertiary">{fmtPct(row.pct)}</span>
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
