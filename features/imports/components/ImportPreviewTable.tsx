"use client";

import { Checkbox } from "@/components/checkbox";
import { cn } from "@/components/component.utils";
import { formatAmount, formatPrice } from "@/lib/currency";
import type { ImportPreviewRow, ImportStatus } from "../types";

function statusClass(status: ImportStatus) {
  if (status === "new") return "bg-[color:var(--positive-soft)] text-[color:var(--positive)]";
  if (status === "matched") return "bg-[color:var(--surface-2)] text-text-secondary";
  if (status === "possible_match" || status === "needs_review") return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
  if (status === "error") return "bg-[color:var(--negative-soft)] text-[color:var(--negative)]";
  return "bg-[color:var(--surface-2)] text-text-tertiary";
}

function moneyCell(row: ImportPreviewRow) {
  if (row.kind === "trade" && row.price != null) {
    return formatPrice(row.price, row.currencyCode ?? "USD");
  }
  if (row.amount != null) {
    return formatAmount(row.amount, row.currencyCode ?? "USD");
  }
  return "-";
}

export function ImportPreviewTable({
  rows,
  selected,
  toggle,
}: {
  rows: ImportPreviewRow[];
  selected: Set<string>;
  toggle: (rowHash: string, checked: boolean) => void;
}) {
  return (
    <div className="max-h-[360px] overflow-auto rounded-md border border-border">
      <table className="w-full min-w-[900px] text-xs">
        <thead className="sticky top-0 z-10 bg-[color:var(--surface-2)]">
          <tr className="border-b border-border">
            <th className="w-10 px-3 py-2 text-left"></th>
            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Row</th>
            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Status</th>
            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Date</th>
            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Type</th>
            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Symbol</th>
            <th className="px-3 py-2 text-right font-medium uppercase tracking-wide text-text-tertiary">Qty</th>
            <th className="px-3 py-2 text-right font-medium uppercase tracking-wide text-text-tertiary">Price/Amount</th>
            <th className="px-3 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-text-tertiary">No preview rows yet.</td>
            </tr>
          ) : (
            rows.map((row) => {
              const canSelect = row.status === "new";
              return (
                <tr key={`${row.rowIndex}-${row.rowHash}`} className="border-b border-border/60 last:border-0 hover:bg-[color:var(--surface-2)]/40">
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={selected.has(row.rowHash)}
                      disabled={!canSelect}
                      onCheckedChange={(value) => toggle(row.rowHash, value === true)}
                      aria-label={`Select row ${row.rowIndex}`}
                    />
                  </td>
                  <td className="px-3 py-2 font-tabular text-text-secondary">{row.rowIndex}</td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-flex rounded px-2 py-0.5 font-medium", statusClass(row.status))}>
                      {row.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-tabular text-text-secondary">{row.date ?? "-"}</td>
                  <td className="px-3 py-2 text-text-primary">{row.tradeType ?? row.eventType ?? row.sourceType}</td>
                  <td className="px-3 py-2 font-semibold">
                    {row.ticker ?? "-"}
                    {row.willCreateSymbol && <span className="ml-1 text-[10px] text-text-tertiary">new</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-tabular">{row.quantity == null ? "-" : row.quantity.toFixed(8)}</td>
                  <td className="px-3 py-2 text-right font-tabular">{moneyCell(row)}</td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-text-tertiary" title={row.message ?? row.matched?.reason}>
                    {row.message ?? row.matched?.reason ?? "-"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
