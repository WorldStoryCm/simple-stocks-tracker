import type { ImportPreviewRow } from "./types";

export function defaultSelectedRows(rows: ImportPreviewRow[], replaceHistory: boolean) {
  return rows.filter((row) => {
    if (row.status !== "new") return false;
    if (!replaceHistory) return true;
    return row.importable && (row.kind === "trade" || row.kind === "cash_event" || row.kind === "corporate_action");
  });
}
