import { sha256, stableJson } from "../hash";
import type { NormalizedImportRow } from "../types";

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function parseMoney(value: string | undefined) {
  const text = value?.trim();
  if (!text) return { amount: undefined, currencyCode: undefined };
  const match = text.match(/^([A-Z]{3})\s+(-?[\d,]+(?:\.\d+)?)$/);
  if (!match) return { amount: Number(text.replace(/[^\d.-]/g, "")), currencyCode: undefined };
  return {
    currencyCode: match[1],
    amount: Number(match[2].replace(/,/g, "")),
  };
}

function parseNumber(value: string | undefined) {
  const text = value?.trim();
  if (!text) return undefined;
  const parsed = Number(text.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function rowHash(raw: Record<string, string>) {
  return sha256(`revolut:${stableJson({
    date: raw.Date,
    ticker: raw.Ticker?.toUpperCase(),
    type: raw.Type,
    quantity: raw.Quantity,
    price: raw["Price per share"],
    amount: raw["Total Amount"],
    currency: raw.Currency,
  })}`);
}

function ignored(rowIndex: number, raw: Record<string, string>, message: string): NormalizedImportRow {
  return {
    rowIndex,
    rowHash: rowHash(raw),
    raw,
    kind: "ignored",
    sourceType: raw.Type,
    date: raw.Date?.slice(0, 10),
    ticker: raw.Ticker?.trim().toUpperCase() || undefined,
    importable: false,
    message,
  };
}

function normalizeRow(rowIndex: number, raw: Record<string, string>): NormalizedImportRow {
  const type = raw.Type?.trim().toUpperCase() ?? "";
  const date = raw.Date?.slice(0, 10);
  const ticker = raw.Ticker?.trim().toUpperCase() || undefined;
  const quantity = parseNumber(raw.Quantity);
  const price = parseMoney(raw["Price per share"]).amount;
  const total = parseMoney(raw["Total Amount"]);
  const currencyCode = raw.Currency?.trim() || total.currencyCode || "USD";
  const fxRate = parseNumber(raw["FX Rate"]);
  const base = {
    rowIndex,
    rowHash: rowHash(raw),
    raw,
    sourceType: raw.Type,
    date,
    ticker,
    amount: total.amount,
    currencyCode,
    fxRate,
  };

  if (type.startsWith("BUY")) {
    return {
      ...base,
      kind: "trade",
      tradeType: "buy",
      quantity,
      price,
      importable: true,
    };
  }
  if (type.startsWith("SELL")) {
    return {
      ...base,
      kind: "trade",
      tradeType: "sell",
      quantity,
      price,
      importable: true,
    };
  }
  if (type === "DIVIDEND") {
    return { ...base, kind: "cash_event", eventType: "dividend", importable: true };
  }
  if (type === "DIVIDEND TAX (CORRECTION)") {
    return { ...base, kind: "cash_event", eventType: "dividend_tax", importable: true };
  }
  if (type === "STOCK SPLIT" || type === "MERGER - STOCK") {
    return {
      ...base,
      kind: "corporate_action",
      quantity,
      importable: false,
      message: "Corporate actions need explicit position-adjustment support before import.",
    };
  }
  if (type === "CUSTODY FEE" || type === "CUSTODY FEE REVERSAL") {
    return ignored(rowIndex, raw, "Custody fees are visible in preview but not imported in this phase.");
  }
  if (type.includes("TRANSFER") || type === "CASH TOP-UP" || type === "CASH WITHDRAWAL") {
    return ignored(rowIndex, raw, "Cash movement rows are not imported in this dividend/trade phase.");
  }

  return {
    ...base,
    kind: "unsupported",
    importable: false,
    message: `Unsupported Revolut row type: ${raw.Type || "Unknown"}`,
  };
}

export function parseRevolutCsv(content: string): NormalizedImportRow[] {
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
