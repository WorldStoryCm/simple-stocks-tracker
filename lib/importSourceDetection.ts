export type DetectedImportSource = "revolut" | "manual";

function firstHeaderCells(content: string) {
  const firstLine = content.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  return firstLine.split(",").map((cell) => cell.trim().toLowerCase());
}

function hasHeaders(headers: string[], required: string[]) {
  return required.every((header) => headers.includes(header));
}

export function detectImportSourceSystem(fileName: string, content: string): DetectedImportSource | undefined {
  const lowerName = fileName.toLowerCase();
  const headers = firstHeaderCells(content);

  if (
    hasHeaders(headers, ["kind", "platform", "date", "type", "ticker", "quantity", "price", "amount"])
    || (lowerName.startsWith("stock-tracker-") && lowerName.includes("-backup-"))
  ) {
    return "manual";
  }

  if (hasHeaders(headers, ["date", "ticker", "type", "quantity", "price per share", "total amount", "currency"])) {
    return "revolut";
  }

  return undefined;
}
