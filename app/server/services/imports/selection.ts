import type { PreviewImportRow } from "./types";

function isLaterSameTickerTrade(row: PreviewImportRow, action: PreviewImportRow) {
  if (row.kind !== "trade" || row.ticker !== action.ticker || !row.date || !action.date) return false;
  return row.date > action.date || (row.date === action.date && row.rowIndex > action.rowIndex);
}

export function expandSelectedRowsWithRequiredCorporateActions(
  rows: PreviewImportRow[],
  selectedRowHashes: Iterable<string>,
) {
  const selected = new Set(selectedRowHashes);
  const selectedRows = rows.filter((row) => selected.has(row.rowHash));

  for (const row of rows) {
    if (
      row.kind !== "corporate_action"
      || row.corporateActionType !== "stock_split"
      || row.status !== "new"
      || !row.importable
    ) {
      continue;
    }

    if (selectedRows.some((selectedRow) => isLaterSameTickerTrade(selectedRow, row))) {
      selected.add(row.rowHash);
    }
  }

  return selected;
}
