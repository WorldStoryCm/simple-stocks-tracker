"use client";

import { Card } from "@/components/card";
import { cn } from "@/components/component.utils";
import { formatAmount } from "@/lib/currency";
import type { DividendEvent } from "../types";

function EventBadge({ eventType }: { eventType: DividendEvent["eventType"] }) {
  const isTax = eventType === "dividend_tax";
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        isTax
          ? "bg-[color:var(--negative-soft)] text-[color:var(--negative)]"
          : "bg-[color:var(--positive-soft)] text-[color:var(--positive)]",
      )}
    >
      {isTax ? "Tax" : "Dividend"}
    </span>
  );
}

export function DividendsTable({
  items,
  isLoading,
}: {
  items: DividendEvent[];
  isLoading: boolean;
}) {
  return (
    <Card loading={isLoading} className="overflow-x-auto [scrollbar-gutter:stable]">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-[color:var(--surface-2)]/40">
          <tr className="border-b border-border">
            <th className="h-10 px-3 text-left text-xs font-medium uppercase tracking-wide text-text-tertiary">Date</th>
            <th className="h-10 px-3 text-left text-xs font-medium uppercase tracking-wide text-text-tertiary">Type</th>
            <th className="h-10 px-3 text-left text-xs font-medium uppercase tracking-wide text-text-tertiary">Symbol</th>
            <th className="h-10 px-3 text-left text-xs font-medium uppercase tracking-wide text-text-tertiary">Platform</th>
            <th className="h-10 px-3 text-right text-xs font-medium uppercase tracking-wide text-text-tertiary">Amount</th>
            <th className="h-10 px-3 text-left text-xs font-medium uppercase tracking-wide text-text-tertiary">Source</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={6} className="h-[280px]" /></tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={6} className="h-24 text-center text-text-tertiary">
                No dividend events match the current filters.
              </td>
            </tr>
          ) : (
            items.map((event) => {
              const amount = Number(event.amount);
              return (
                <tr key={event.id} className="border-b border-border transition-colors last:border-0 hover:bg-[color:var(--surface-2)]/40">
                  <td className="h-11 whitespace-nowrap px-3 text-text-secondary">{event.eventDate}</td>
                  <td className="h-11 whitespace-nowrap px-3"><EventBadge eventType={event.eventType} /></td>
                  <td className="h-11 whitespace-nowrap px-3 font-semibold">{event.symbol?.ticker ?? "-"}</td>
                  <td className="h-11 whitespace-nowrap px-3 text-text-secondary">{event.platform?.name ?? "-"}</td>
                  <td
                    className={cn(
                      "h-11 whitespace-nowrap px-3 text-right font-tabular font-semibold",
                      amount >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
                    )}
                  >
                    {amount >= 0 ? "+" : ""}
                    {formatAmount(amount, event.currencyCode)}
                  </td>
                  <td className="h-11 whitespace-nowrap px-3 text-xs text-text-tertiary">
                    {event.sourceSystem ?? "manual"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </Card>
  );
}
