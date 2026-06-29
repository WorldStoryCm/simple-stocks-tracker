"use client";

import { formatPrice } from "@/lib/currency";
import type { ImportPreviewRow } from "../types";

function quantityCell(row: ImportPreviewRow) {
  if (row.quantity == null) return "-";
  return row.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function detailRow(row: ImportPreviewRow, replaceHistory: boolean, isSelected: boolean) {
  if (row.positionAdjustment) {
    return {
      label: "Position adjustment",
      primary: row.message ?? "Will add a non-cash opening lot before this sell.",
      secondary: `Adds ${row.positionAdjustment.quantity.toLocaleString("en-US", { maximumFractionDigits: 8 })} shares at ${formatPrice(row.positionAdjustment.price, row.currencyCode ?? "USD")}`,
      action: "Selected import creates the lot for FIFO matching without changing cash.",
    };
  }
  if (row.matched?.recordLabel) {
    const kind = row.matched.kind === "cash_event" ? "cash event" : "trade";
    const action = replaceHistory && isSelected
      ? "Replace mode: this row will be re-imported after existing history is deleted."
      : row.status === "possible_match"
      ? "Default: D skips as duplicate. Choose A only when this is a different transaction."
      : "This row is treated as duplicate and will not import.";
    return {
      label: `Matched existing ${kind}`,
      primary: row.matched.recordLabel,
      secondary: row.matched.reason,
      action,
    };
  }
  if (row.kind === "corporate_action") {
    const isMerger = row.corporateActionType === "merger_stock";
    return {
      label: row.status === "matched" ? "Corporate action already applied" : "Corporate action",
      primary: row.message ?? (isMerger ? "Will transfer lots between merger tickers." : "Will adjust open lots from broker share delta."),
      secondary: row.quantity == null ? undefined : `Revolut quantity delta: ${quantityCell(row)}`,
      action: row.status === "matched"
        ? "This row is treated as duplicate and will not import."
        : isMerger ? "Selected merger rows move cost basis without changing cash." : "Selected rows adjust share counts without changing cash.",
    };
  }
  return undefined;
}

export function hasImportPreviewRowDetail(row: ImportPreviewRow) {
  return Boolean(row.positionAdjustment || row.matched?.recordLabel || row.kind === "corporate_action");
}

export function ImportPreviewRowDetail({
  row,
  replaceHistory,
  isSelected,
}: {
  row: ImportPreviewRow;
  replaceHistory: boolean;
  isSelected: boolean;
}) {
  const detail = detailRow(row, replaceHistory, isSelected);
  if (!detail) return null;

  return (
    <tr className="border-b border-border/60 bg-[color:var(--surface-1)]/35">
      <td colSpan={11} className="px-2 pb-2 pl-[7.25rem] pr-3 pt-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-[color:var(--info)]/60 py-2 pl-3 text-xs text-text-secondary">
          <span className="font-medium text-text-primary">{detail.label}</span>
          <span className="min-w-0 truncate font-tabular" title={detail.primary}>{detail.primary}</span>
          <span className="text-text-tertiary">{detail.action}</span>
          {detail.secondary && (
            <span className="basis-full truncate text-text-tertiary" title={detail.secondary}>
              Reason: {detail.secondary}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
