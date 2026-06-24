"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { cn } from "@/components/component.utils";
import type { DashboardFilters } from "../types";
import { fmtMoney } from "../lib/format";

export function RecentTradesCard({ filters }: { filters: DashboardFilters }) {
  const { data, isLoading } = trpc.trades.list.useQuery({
    page: 1,
    limit: 5,
    platformId: filters.platformId,
    symbolId: filters.symbolId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });
  const items = data?.items ?? [];

  return (
    <Card loading={isLoading} className="overflow-hidden lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full font-tabular text-xs">
            <thead>
              <tr className="border-b border-border text-[11px] text-text-tertiary">
                <th className="px-5 py-2 text-left font-medium">Date</th>
                <th className="px-2 py-2 text-left font-medium">Symbol</th>
                <th className="px-2 py-2 text-left font-medium">Side</th>
                <th className="px-2 py-2 text-right font-medium">Qty</th>
                <th className="px-2 py-2 text-right font-medium">Price</th>
                <th className="px-2 py-2 text-right font-medium">Total</th>
                <th className="px-5 py-2 text-right font-medium">P/L</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-text-tertiary">
                    No trades match the current filters.
                  </td>
                </tr>
              ) : (
                items.map((trade) => {
                  const total = Number(trade.quantity) * Number(trade.price);
                  const isBuy = trade.tradeType === "buy";
                  const pnl = trade.realizedPnl != null ? Number(trade.realizedPnl) : null;
                  return (
                    <tr
                      key={trade.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-[color:var(--surface-2)]/40"
                    >
                      <td className="px-5 py-2 text-text-secondary">{trade.tradeDate}</td>
                      <td className="px-2 py-2 font-medium text-text-primary">{trade.symbol?.ticker ?? "-"}</td>
                      <td className="px-2 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            isBuy
                              ? "bg-[color:var(--positive-soft)] text-[color:var(--positive)]"
                              : "bg-[color:var(--negative-soft)] text-[color:var(--negative)]",
                          )}
                        >
                          {trade.tradeType}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">{Number(trade.quantity)}</td>
                      <td className="px-2 py-2 text-right">${Number(trade.price).toFixed(2)}</td>
                      <td className="px-2 py-2 text-right text-text-secondary">${total.toFixed(2)}</td>
                      <td
                        className={cn(
                          "px-5 py-2 text-right font-medium",
                          isBuy || pnl == null
                            ? "text-text-tertiary"
                            : pnl >= 0
                              ? "text-[color:var(--positive)]"
                              : "text-[color:var(--negative)]",
                        )}
                      >
                        {isBuy || pnl == null ? "-" : `${pnl >= 0 ? "+" : ""}${fmtMoney(pnl, false)}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-5 py-3 text-xs">
          <Link href="/trades" className="text-[color:var(--info)] hover:underline">
            View all trades
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
