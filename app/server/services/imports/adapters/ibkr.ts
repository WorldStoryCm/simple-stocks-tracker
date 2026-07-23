import { parseCsv } from "../csv";
import { parseExecution } from "../execution";
import { sha256, stableJson } from "../hash";
import type { NormalizedImportRow } from "../types";

const CASH_EVENT_BY_TYPE: Record<string, NormalizedImportRow["eventType"]> = {
  adjustment: "other",
  deposit: "deposit",
  dividend: "dividend",
  "fees": "fee",
  "fee": "fee",
  "fee reversal": "fee_reversal",
  "foreign tax withholding": "dividend_tax",
  "forex trade component": "other",
  "payment in lieu of dividend": "dividend",
  transfer: "transfer",
  withdrawal: "withdrawal",
  "withholding tax": "dividend_tax",
};

function clean(value: string | undefined) {
  const text = value?.trim();
  return !text || text === "-" ? undefined : text;
}

function parseNumber(value: string | undefined) {
  const text = clean(value);
  if (!text) return undefined;
  const parsed = Number(text.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function currency(value: string | undefined) {
  return clean(value)?.toUpperCase();
}

function ticker(value: string | undefined) {
  return clean(value)?.toUpperCase();
}

function executionValue(raw: Record<string, string>) {
  return clean(
    raw["Date/Time"]
    ?? raw["Trade Date/Time"]
    ?? raw.DateTime
    ?? raw.TradeDate
    ?? raw.Date,
  );
}

function rowHash(rowIndex: number, raw: Record<string, string>) {
  return sha256(`ibkr:${stableJson({
    rowIndex,
    date: executionValue(raw),
    account: raw.Account,
    description: raw.Description,
    type: raw["Transaction Type"],
    symbol: raw.Symbol?.toUpperCase(),
    quantity: raw.Quantity,
    price: raw.Price,
    gross: raw["Gross Amount"],
    commission: raw.Commission,
    net: raw["Net Amount"],
  })}`);
}

function findBaseCurrency(matrix: string[][]) {
  for (const row of matrix) {
    if (row[0]?.trim() !== "Summary" || row[1]?.trim() !== "Data") continue;
    if (row[2]?.trim().toLowerCase() === "base currency") {
      return currency(row[3]) ?? "USD";
    }
  }
  return "USD";
}

function findStatementPeriod(matrix: string[][]) {
  const row = matrix.find((cells) =>
    cells[0]?.trim() === "Statement"
    && cells[1]?.trim() === "Data"
    && cells[2]?.trim().toLowerCase() === "period",
  );
  return clean(row?.[3]);
}

function signedAmount(value: number | undefined, direction: "positive" | "negative") {
  if (value == null) return undefined;
  const absolute = Math.abs(value);
  return direction === "positive" ? absolute : -absolute;
}

function baseTradePrice(raw: Record<string, string>, baseCurrency: string) {
  const quantity = Math.abs(parseNumber(raw.Quantity) ?? 0);
  const grossAmount = parseNumber(raw["Gross Amount"]);
  if (quantity > 0 && grossAmount != null) return Math.abs(grossAmount) / quantity;

  const sourcePrice = parseNumber(raw.Price);
  const priceCurrency = currency(raw["Price Currency"]);
  return priceCurrency === baseCurrency ? sourcePrice : undefined;
}

function eventTicker(type: string, symbol: string | undefined) {
  if (
    type === "dividend"
    || type === "foreign tax withholding"
    || type === "payment in lieu of dividend"
    || type === "withholding tax"
  ) {
    return ticker(symbol);
  }
  return undefined;
}

function normalizeRow(rowIndex: number, raw: Record<string, string>, baseCurrency: string): NormalizedImportRow {
  const sourceType = clean(raw["Transaction Type"]) ?? "Unknown";
  const type = sourceType.toLowerCase();
  const execution = parseExecution(executionValue(raw));
  const netAmount = parseNumber(raw["Net Amount"]);
  const commission = parseNumber(raw.Commission);
  const base = {
    rowIndex,
    rowHash: rowHash(rowIndex, raw),
    raw,
    sourceType,
    date: execution.date,
    executedAt: execution.executedAt,
    executionOrder: -rowIndex,
    amount: netAmount,
    currencyCode: baseCurrency,
  };

  if (type === "buy" || type === "sell") {
    const quantity = parseNumber(raw.Quantity);
    const tradeQuantity = quantity == null ? undefined : Math.abs(quantity);
    const price = baseTradePrice(raw, baseCurrency);
    const fallbackImpact = tradeQuantity == null || price == null
      ? undefined
      : type === "buy"
        ? -(tradeQuantity * price + Math.abs(commission ?? 0))
        : tradeQuantity * price - Math.abs(commission ?? 0);

    return {
      ...base,
      kind: "trade",
      ticker: ticker(raw.Symbol),
      tradeType: type,
      quantity: tradeQuantity,
      price,
      fee: Math.abs(commission ?? 0),
      cashImpact: netAmount ?? fallbackImpact,
      importable: true,
      message: currency(raw["Price Currency"]) && currency(raw["Price Currency"]) !== baseCurrency
        ? `IBKR ${raw["Price Currency"]} trade mapped to ${baseCurrency} using statement gross/net amounts.`
        : undefined,
    };
  }

  const eventType = CASH_EVENT_BY_TYPE[type];
  if (eventType) {
    const amount = type === "deposit"
      ? signedAmount(netAmount, "positive")
      : type === "withdrawal"
        ? signedAmount(netAmount, "negative")
        : netAmount;

    return {
      ...base,
      kind: "cash_event",
      ticker: eventTicker(type, raw.Symbol),
      eventType,
      amount,
      cashImpact: amount,
      importable: true,
    };
  }

  return {
    ...base,
    kind: "unsupported",
    ticker: ticker(raw.Symbol),
    importable: false,
    message: `Unsupported IBKR transaction type: ${sourceType}`,
  };
}

export function parseIbkrCsv(content: string): NormalizedImportRow[] {
  const matrix = parseCsv(content.replace(/^\uFEFF/, ""));
  const baseCurrency = findBaseCurrency(matrix);
  let headers: string[] = [];
  let rowIndex = 0;
  const rows: NormalizedImportRow[] = [];

  for (const cells of matrix) {
    if (cells[0]?.trim() !== "Transaction History") continue;
    const rowType = cells[1]?.trim();
    if (rowType === "Header") {
      headers = cells.slice(2).map((header) => header.trim());
      continue;
    }
    if (rowType !== "Data" || headers.length === 0) continue;

    rowIndex += 1;
    const raw = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
      acc[header] = cells[headerIndex + 2]?.trim() ?? "";
      return acc;
    }, {});
    rows.push(normalizeRow(rowIndex, raw, baseCurrency));
  }

  const datedRows = rows.filter((row) => row.date);
  const firstDate = datedRows[0]?.date;
  const comparisonDate = datedRows.find((row) => row.date !== firstDate)?.date;
  const sourceDirection = firstDate && comparisonDate && firstDate < comparisonDate ? 1 : -1;
  const statementPeriod = findStatementPeriod(matrix);
  const firstTradeIndex = rows.findIndex((row) => row.kind === "trade");
  const hasExactTradeTimes = rows.some((row) => row.kind === "trade" && row.executedAt);

  return rows.map((row, index) => {
    const warnings = index === firstTradeIndex
      ? [
        !hasExactTradeTimes
          ? "This IBKR export has dates only; same-day execution order is inferred from CSV row order."
          : undefined,
        statementPeriod
          ? `Statement period: ${statementPeriod}. Opening cost basis must already exist for realized P/L to be complete.`
          : undefined,
      ].filter(Boolean)
      : [];
    return {
      ...row,
      executionOrder: sourceDirection * row.rowIndex,
      message: [row.message, ...warnings].filter(Boolean).join(" "),
    };
  });
}
