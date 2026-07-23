import { parseCsv } from "../csv";
import { parseExecution } from "../execution";
import { sha256, stableJson } from "../hash";
import type { NormalizedImportRow } from "../types";

const CASH_EVENT_TYPES = new Set([
  "dividend",
  "dividend_tax",
  "fee",
  "fee_reversal",
  "deposit",
  "withdrawal",
  "transfer",
  "other",
]);

function parseNumber(value: string | undefined) {
  const text = value?.trim();
  if (!text) return undefined;
  const parsed = Number(text.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function rowHash(raw: Record<string, string>) {
  return sha256(`manual:${stableJson({
    kind: raw.Kind,
    date: raw.Date,
    type: raw.Type,
    ticker: raw.Ticker?.toUpperCase(),
    quantity: raw.Quantity,
    price: raw.Price,
    amount: raw.Amount,
    currency: raw.Currency,
    fee: raw.Fee,
  })}`);
}

function baseRow(rowIndex: number, raw: Record<string, string>) {
  const execution = parseExecution(raw.Date);
  return {
    rowIndex,
    rowHash: rowHash(raw),
    raw,
    sourceType: raw.Type,
    date: execution.date,
    executedAt: execution.executedAt,
    executionOrder: rowIndex,
    ticker: raw.Ticker?.trim().toUpperCase() || undefined,
    amount: parseNumber(raw.Amount),
    currencyCode: raw.Currency?.trim().toUpperCase() || "USD",
    fxRate: parseNumber(raw["FX Rate"]),
  };
}

function normalizeRow(rowIndex: number, raw: Record<string, string>): NormalizedImportRow {
  const kind = raw.Kind?.trim().toLowerCase();
  const type = raw.Type?.trim().toLowerCase();
  const base = baseRow(rowIndex, raw);

  if (kind === "trade" && (type === "buy" || type === "sell")) {
    const quantity = parseNumber(raw.Quantity);
    const price = parseNumber(raw.Price);
    const fee = parseNumber(raw.Fee) ?? 0;
    const fallbackImpact = quantity == null || price == null
      ? undefined
      : type === "buy"
        ? -(quantity * price + fee)
        : quantity * price - fee;

    return {
      ...base,
      kind: "trade",
      tradeType: type,
      quantity,
      price,
      fee,
      cashImpact: base.amount ?? fallbackImpact,
      importable: true,
      message: raw.Notes || undefined,
    };
  }

  if (kind === "cash_event") {
    const eventType = CASH_EVENT_TYPES.has(type) ? type : "other";
    return {
      ...base,
      kind: "cash_event",
      eventType: eventType as NormalizedImportRow["eventType"],
      cashImpact: base.amount,
      importable: true,
      message: raw.Notes || undefined,
    };
  }

  return {
    ...base,
    kind: "unsupported",
    importable: false,
    message: `Unsupported manual backup row: ${raw.Kind || "Unknown"} / ${raw.Type || "Unknown"}`,
  };
}

export function parseManualCsv(content: string): NormalizedImportRow[] {
  const matrix = parseCsv(content.replace(/^\uFEFF/, ""));
  const [headers, ...dataRows] = matrix;
  if (!headers?.length) return [];

  return dataRows.map((cells, index) => {
    const raw = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
      acc[header.trim()] = cells[headerIndex]?.trim() ?? "";
      return acc;
    }, {});
    return normalizeRow(index + 1, raw);
  });
}
