"use client";

import { Checkbox } from "@/components/checkbox";
import { cn } from "@/components/component.utils";
import { formatAmount, formatPrice } from "@/lib/currency";
import type { ImportPreviewRow, ImportStatus } from "../types";
import { hasImportPreviewRowDetail, ImportPreviewRowDetail } from "./ImportPreviewRowDetail";

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

function statusLabel(status: ImportStatus) {
  if (status === "possible_match") return "possible";
  if (status === "needs_review") return "blocked";
  return status;
}

function statusTitle(row: ImportPreviewRow) {
  if (row.status === "new") return "New: selected by default and ready to import.";
  if (row.status === "matched") return "Matched duplicate: an existing record already matches this row; it will not import.";
  if (row.status === "possible_match") return "Possible duplicate: review the matched record below. D skips it, A imports it as not duplicate.";
  if (row.status === "needs_review") return "Blocked: this row needs manual review or unsupported position-adjustment logic.";
  if (row.status === "ignored") return "Ignored: this source row does not change the tracked ledger.";
  return row.status;
}

function moneyCell(row: ImportPreviewRow) {
  if (row.kind === "trade" && row.price != null) return formatPrice(row.price, row.currencyCode ?? "USD");
  if (row.amount != null) return formatAmount(row.amount, row.currencyCode ?? "USD");
  return "-";
}

function impactCell(row: ImportPreviewRow) {
  if (row.cashImpact == null) return "-";
  return `${row.cashImpact >= 0 ? "+" : ""}${formatAmount(row.cashImpact, row.currencyCode ?? "USD")}`;
}

function typeLabel(row: ImportPreviewRow) {
  const value = row.tradeType ?? row.eventType ?? row.sourceType;
  return TYPE_LABELS[value] ?? value;
}

function quantityCell(row: ImportPreviewRow) {
  if (row.quantity == null) return "-";
  return row.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function canSelect(row: ImportPreviewRow, replaceHistory: boolean) {
  if (replaceHistory) {
    return row.importable && (row.kind === "trade" || row.kind === "cash_event" || row.kind === "corporate_action")
      && (row.status === "new" || row.status === "matched" || row.status === "possible_match");
  }
  return row.status === "new" || row.status === "possible_match";
}

function actionLetter(row: ImportPreviewRow, isSelected: boolean, replaceHistory: boolean) {
  if (row.status === "new") return "A";
  if (row.status === "matched") return replaceHistory && isSelected ? "A" : "D";
  if (row.status === "possible_match") return isSelected ? "A" : "D";
  if (row.status === "needs_review") return "R";
  if (row.status === "ignored") return "I";
  return "!";
}

function actionTitle(row: ImportPreviewRow, isSelected: boolean, replaceHistory: boolean) {
  if (row.status === "new") return "A: add/import this row";
  if (row.status === "matched" && replaceHistory && isSelected) {
    return "A: replace mode will re-import this matched row";
  }
  if (row.status === "matched") return "D: duplicate, already matched and skipped";
  if (row.status === "possible_match") return isSelected ? "A: not duplicate, import this row" : "D: duplicate, skip this row";
  if (row.status === "needs_review") return "R: review required before import";
  if (row.status === "ignored") return "I: ignored by importer";
  return row.status;
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
        aria-label={`Mark row ${row.rowIndex} as duplicate and skip`}
        onClick={() => toggle(row.rowHash, false)}
      >
        D
      </button>
      <button
        type="button"
        className={cn(buttonClass, selected ? "border-[color:var(--positive)] bg-[color:var(--positive-soft)] text-[color:var(--positive)]" : "border-border text-text-tertiary")}
        title="A: not duplicate, import this row"
        aria-label={`Mark row ${row.rowIndex} as not duplicate and import`}
        onClick={() => toggle(row.rowHash, true)}
      >
        A
      </button>
    </div>
  );
}

export function ImportPreviewTableRow({
  row,
  selected,
  toggle,
  replaceHistory,
}: {
  row: ImportPreviewRow;
  selected: Set<string>;
  toggle: (rowHash: string, checked: boolean) => void;
  replaceHistory: boolean;
}) {
  const selectable = canSelect(row, replaceHistory);
  const isSelected = selected.has(row.rowHash);
  const hasDetail = hasImportPreviewRowDetail(row);

  return (
    <>
      <tr className={cn("border-b border-border/60 hover:bg-[color:var(--surface-2)]/40", hasDetail && "border-b-0")}>
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
          <span
            className={cn("inline-flex cursor-help rounded px-2 py-0.5 font-medium", statusClass(row.status))}
            title={statusTitle(row)}
            aria-label={statusTitle(row)}
          >
            {statusLabel(row.status)}
          </span>
        </td>
        <td className="px-2 py-2 font-medium text-text-primary" title={actionTitle(row, isSelected, replaceHistory)}>
          {row.status === "possible_match" ? (
            <PossibleMatchActions row={row} selected={isSelected} toggle={toggle} />
          ) : (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-[color:var(--surface-1)] text-[11px]">
              {actionLetter(row, isSelected, replaceHistory)}
            </span>
          )}
        </td>
        <td
          className="whitespace-nowrap px-2 py-2 font-tabular text-text-secondary"
          title={row.executedAt ?? row.date ?? "-"}
        >
          <span>{row.date ?? "-"}</span>
          {row.executedAt && (
            <span className="block text-[10px] text-text-tertiary">{row.executedAt.slice(11)}</span>
          )}
        </td>
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
        <td
          className={cn(
            "truncate px-2 py-2 text-right font-tabular font-medium",
            (row.cashImpact ?? 0) >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
          )}
          title={impactCell(row)}
        >
          {impactCell(row)}
        </td>
        <td className="min-w-0 px-2 py-2 text-text-tertiary" title={row.message ?? row.matched?.reason}>
          <div className="truncate">{row.message ?? row.matched?.reason ?? "-"}</div>
        </td>
      </tr>
      <ImportPreviewRowDetail row={row} replaceHistory={replaceHistory} isSelected={isSelected} />
    </>
  );
}
