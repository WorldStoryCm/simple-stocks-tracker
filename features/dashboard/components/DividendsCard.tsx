"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { cn } from "@/components/component.utils";
import { formatAmount } from "@/lib/currency";
import type { DashboardFilters } from "../types";

export function DividendsCard({ filters }: { filters: DashboardFilters }) {
  const { data, isLoading } = trpc.dividends.summary.useQuery({
    platformId: filters.platformId,
    symbolId: filters.symbolId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });
  const currencyCode = data?.currencyCode ?? "USD";
  const rows = data?.recent ?? [];

  return (
    <Card loading={isLoading} className="overflow-hidden lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">Dividends</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <div className="grid grid-cols-3 border-y border-border bg-[color:var(--surface-2)]/20">
          <div className="px-5 py-3">
            <div className="text-[10px] uppercase tracking-wide text-text-tertiary">Gross</div>
            <div className="font-tabular text-sm font-semibold text-[color:var(--positive)]">
              {formatAmount(data?.grossDividends ?? 0, currencyCode)}
            </div>
          </div>
          <div className="px-5 py-3">
            <div className="text-[10px] uppercase tracking-wide text-text-tertiary">Tax</div>
            <div className="font-tabular text-sm font-semibold text-[color:var(--negative)]">
              {formatAmount(data?.dividendTax ?? 0, currencyCode)}
            </div>
          </div>
          <div className="px-5 py-3">
            <div className="text-[10px] uppercase tracking-wide text-text-tertiary">Net</div>
            <div className="font-tabular text-sm font-semibold text-text-primary">
              {formatAmount(data?.netDividends ?? 0, currencyCode)}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-tabular text-xs">
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-text-tertiary">No dividends match the current filters.</td>
                </tr>
              ) : (
                rows.map((event) => {
                  const amount = Number(event.amount);
                  return (
                    <tr key={event.id} className="border-b border-border/60 last:border-0 hover:bg-[color:var(--surface-2)]/40">
                      <td className="px-5 py-2 text-text-secondary">{event.eventDate}</td>
                      <td className="px-2 py-2 font-medium text-text-primary">{event.symbol?.ticker ?? "-"}</td>
                      <td className="px-2 py-2 text-text-secondary">{event.platform?.name ?? "-"}</td>
                      <td
                        className={cn(
                          "px-5 py-2 text-right font-medium",
                          amount >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
                        )}
                      >
                        {amount >= 0 ? "+" : ""}
                        {formatAmount(amount, event.currencyCode)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-5 py-3 text-xs">
          <Link href="/dividends" className="text-[color:var(--info)] hover:underline">
            View dividends
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
