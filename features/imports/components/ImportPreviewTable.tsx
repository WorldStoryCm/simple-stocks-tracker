"use client";

import { Checkbox } from "@/components/checkbox";
import { cn } from "@/components/component.utils";
import { formatAmount, formatPrice } from "@/lib/currency";
import type { ImportPreviewRow, ImportStatus } from "../types";

const TYPE_LABELS: Record<string, string> = {
  buy: "buy",
  sell: "sell",
  dividend: "div",
  dividend_tax: "tax",
  fee: "fee",
  fee_reversal: "fee+",
  deposit: "dep",
  withdrawal: "wd",
  transfer: "xfer",
};

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

function impactCell(row: ImportPreviewRow) {
  if (row.cashImpact == null) return "-";
  return `${row.cashImpact >= 0 ? "+" : ""}${formatAmount(row.cashImpact, row.currencyCode ?? "USD")}`;
}

function statusLabel(status: ImportStatus) {
  if (status === "possible_match") return "possible";
  if (status === "needs_review") return "blocked";
  return status;
}

function typeLabel(row: ImportPreviewRow) {
  const value = row.tradeType ?? row.eventType ?? row.sourceType;
  return TYPE_LABELS[value] ?? value;
}

function quantityCell(row: ImportPreviewRow) {
  if (row.quantity == null) return "-";
  return row.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function canSelect(row: ImportPreviewRow) {
  return row.status === "new" || row.status === "possible_match";
}

function actionLetter(row: ImportPreviewRow, isSelected: boolean) {
  if (row.status === "new") return "A";
  if (row.status === "matched") return "D";
  if (row.status === "possible_match") return isSelected ? "A" : "D";
  if (row.status === "needs_review") return "R";
  if (row.status === "ignored") return "I";
  return "!";
}

function actionTitle(row: ImportPreviewRow, isSelected: boolean) {
  if (row.status === "new") return "Add this row";
  if (row.status === "matched") return "Duplicate: already matched, not imported";
  if (row.status === "possible_match") return isSelected ? "Not duplicate: import this row" : "Duplicate: skip this row";
  if (row.status === "needs_review") return "Blocked: fix source data before import";
  if (row.status === "ignored") return "Ignored by importer";
  return row.status;
}

function noteTitle(row: ImportPreviewRow) {
  return [row.message ?? row.matched?.reason, row.matched?.recordLabel ? `Matched: ${row.matched.recordLabel}` : undefined]
    .filter(Boolean)
    .join(" | ");
}

function PossibleMatchActions({
  row,
  selected,
  toggle,
}: {
  row: ImportPreviewRow;
  selected: boolean;
  toggle: (rowHash: string, checked: boolean) => void;
}) {
  const buttonClass = "inline-flex h-6 w-6 items-center justify-center rounded border text-[11px] font-semibold";
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={cn(buttonClass, !selected ? "border-border bg-[color:var(--surface-2)] text-text-primary" : "border-border text-text-tertiary")}
        title="D: duplicate, skip this row"
        onClick={() => toggle(row.rowHash, false)}
      >
        D
      </button>
      <button
        type="button"
        className={cn(buttonClass, selected ? "border-[color:var(--positive)] bg-[color:var(--positive-soft)] text-[color:var(--positive)]" : "border-border text-text-tertiary")}
        title="A: not duplicate, import this row"
        onClick={() => toggle(row.rowHash, true)}
      >
        A
      </button>
    </div>
  );
}

export function ImportPreviewTable({
  rows,
  selected,
  toggle,
  className,
}: {
  rows: ImportPreviewRow[];
  selected: Set<string>;
  toggle: (rowHash: string, checked: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("min-h-[280px] overflow-y-auto overflow-x-hidden rounded-md border border-border", className)}>
      <table className="w-full table-fixed text-xs">
        <colgroup>
          <col className="w-9" />
          <col className="w-11" />
          <col className="w-[82px]" />
          <col className="w-[58px]" />
          <col className="w-[88px]" />
          <col className="w-[62px]" />
          <col className="w-[78px]" />
          <col className="w-[86px]" />
          <col className="w-[104px]" />
          <col className="w-[104px]" />
          <col />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-[color:var(--surface-2)]">
          <tr className="border-b border-border">
            <th className="px-2 py-2 text-left"></th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Row</th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Status</th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Act</th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Date</th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Type</th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Symbol</th>
            <th className="px-2 py-2 text-right font-medium uppercase tracking-wide text-text-tertiary">Qty</th>
            <th className="px-2 py-2 text-right font-medium uppercase tracking-wide text-text-tertiary">Amount</th>
            <th className="px-2 py-2 text-right font-medium uppercase tracking-wide text-text-tertiary">Cash</th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-3 py-8 text-center text-text-tertiary">No preview rows yet.</td>
            </tr>
          ) : (
            rows.map((row) => {
              const selectable = canSelect(row);
              const isSelected = selected.has(row.rowHash);
              return (
                <tr key={`${row.rowIndex}-${row.rowHash}`} className="border-b border-border/60 last:border-0 hover:bg-[color:var(--surface-2)]/40">
                  <td className="px-2 py-2">
                    <Checkbox
                      checked={isSelected}
                      disabled={!selectable}
                      onCheckedChange={(value) => toggle(row.rowHash, value === true)}
                      aria-label={`Select row ${row.rowIndex}`}
                    />
                  </td>
                  <td className="px-2 py-2 font-tabular text-text-secondary">{row.rowIndex}</td>
                  <td className="px-2 py-2">
                    <span className={cn("inline-flex rounded px-2 py-0.5 font-medium", statusClass(row.status))}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-medium text-text-primary" title={actionTitle(row, isSelected)}>
                    {row.status === "possible_match" ? (
                      <PossibleMatchActions row={row} selected={isSelected} toggle={toggle} />
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-[color:var(--surface-1)] text-[11px]">
                        {actionLetter(row, isSelected)}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-tabular text-text-secondary">{row.date ?? "-"}</td>
                  <td className="truncate px-2 py-2 text-text-primary" title={row.tradeType ?? row.eventType ?? row.sourceType}>
                    {typeLabel(row)}
                  </td>
                  <td className="truncate px-2 py-2 font-semibold" title={row.ticker ?? "-"}>
                    {row.ticker ?? "-"}
                    {row.willCreateSymbol && <span className="ml-1 text-[10px] text-text-tertiary">new</span>}
                  </td>
                  <td className="truncate px-2 py-2 text-right font-tabular" title={row.quantity?.toString()}>
                    {quantityCell(row)}
                  </td>
                  <td className="truncate px-2 py-2 text-right font-tabular" title={moneyCell(row)}>{moneyCell(row)}</td>
                  <td className={cn(
                    "truncate px-2 py-2 text-right font-tabular font-medium",
                    (row.cashImpact ?? 0) >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
                  )} title={impactCell(row)}>
                    {impactCell(row)}
                  </td>
                  <td className="min-w-0 px-2 py-2 text-text-tertiary" title={noteTitle(row)}>
                    <div className="truncate">{row.message ?? row.matched?.reason ?? "-"}</div>
                    {row.matched?.recordLabel && (
                      <div className="truncate text-[11px] text-text-secondary">
                        Matched: {row.matched.recordLabel}
                      </div>
                    )}
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
