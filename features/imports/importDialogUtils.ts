import type { ImportPreviewRow } from "./types";

export function defaultSelectedRows(rows: ImportPreviewRow[], replaceHistory: boolean) {
  return rows.filter((row) => {
    if (!replaceHistory) return row.status === "new";
    return row.importable && (row.kind === "trade" || row.kind === "cash_event")
      && (row.status === "new" || row.status === "matched" || row.status === "possible_match");
  });
}

export function downloadCsv(fileName: string, fileContent: string) {
  const blob = new Blob([fileContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
