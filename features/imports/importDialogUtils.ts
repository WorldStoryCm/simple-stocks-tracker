import type { ImportPreviewRow } from "./types";

export function defaultSelectedRows(rows: ImportPreviewRow[], replaceHistory: boolean) {
  return rows.filter((row) => {
    if (replaceHistory) {
      return row.importable && (row.kind === "trade" || row.kind === "cash_event" || row.kind === "corporate_action");
    }
    if (row.status !== "new") return false;
    return true;
  });
}
