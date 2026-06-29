import type { PreviewImportRow } from "./types";

function isLaterSameTickerTrade(row: PreviewImportRow, action: PreviewImportRow) {
  if (row.kind !== "trade" || row.ticker !== action.ticker || !row.date || !action.date) return false;
  return row.date > action.date || (row.date === action.date && row.rowIndex > action.rowIndex);
}

function mergerKey(row: PreviewImportRow) {
  return row.date || row.raw.Date || "";
}

export function expandSelectedRowsWithRequiredCorporateActions(
  rows: PreviewImportRow[],
  selectedRowHashes: Iterable<string>,
) {
  const selected = new Set(selectedRowHashes);
  const selectableActions = rows.filter((row) =>
    row.kind === "corporate_action" && row.status === "new" && row.importable,
  );

  let changed = true;
  while (changed) {
    changed = false;
    const selectedRows = rows.filter((row) => selected.has(row.rowHash));

    for (const row of selectableActions) {
      const before = selected.size;
      if (
        row.corporateActionType === "stock_split"
        && selectedRows.some((selectedRow) => isLaterSameTickerTrade(selectedRow, row))
      ) {
        selected.add(row.rowHash);
      }

      if (
        row.corporateActionType === "merger_stock"
        && selectedRows.some((selectedRow) =>
          selectedRow.rowHash === row.rowHash || isLaterSameTickerTrade(selectedRow, row),
        )
      ) {
        const key = mergerKey(row);
        for (const pairedRow of selectableActions) {
          if (pairedRow.corporateActionType === "merger_stock" && mergerKey(pairedRow) === key) {
            selected.add(pairedRow.rowHash);
          }
        }
      }
      if (selected.size !== before) changed = true;
    }
  }

  return selected;
}
