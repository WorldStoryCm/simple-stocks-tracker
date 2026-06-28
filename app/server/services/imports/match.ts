import type { PreviewImportRow, PreviewMatch, NormalizedImportRow, SourceSystem } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

type ExistingTrade = {
  id: string;
  tradeType: "buy" | "sell";
  tradeDate: string;
  quantity: string | number;
  price: string | number;
  sourceSystem: string | null;
  sourceRowHash: string | null;
  symbol?: { ticker: string } | null;
};

type ExistingCashEvent = {
  id: string;
  eventType: string;
  eventDate: string;
  amount: string | number;
  sourceSystem: string | null;
  sourceRowHash: string | null;
  symbol?: { ticker: string } | null;
};

function dateDistanceDays(left?: string, right?: string) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  const leftDate = new Date(`${left}T00:00:00Z`).getTime();
  const rightDate = new Date(`${right}T00:00:00Z`).getTime();
  return Math.abs(Math.round((leftDate - rightDate) / DAY_MS));
}

function quantityClose(left?: number, rightValue?: string | number) {
  if (left == null || rightValue == null) return false;
  const right = Number(rightValue);
  const diff = Math.abs(left - right);
  const relative = diff / Math.max(Math.abs(left), Math.abs(right), 1);
  return diff <= 0.001 || relative <= 0.001;
}

function amountClose(left?: number, rightValue?: string | number) {
  if (left == null || rightValue == null) return false;
  return Math.abs(left - Number(rightValue)) <= 0.01;
}

function priceClose(left?: number, rightValue?: string | number) {
  if (left == null || rightValue == null) return true;
  const right = Number(rightValue);
  const diff = Math.abs(left - right);
  return diff <= Math.max(0.02, Math.abs(left) * 0.002);
}

function sourceMatch(row: NormalizedImportRow, sourceSystem: SourceSystem, item: ExistingTrade | ExistingCashEvent) {
  return item.sourceSystem === sourceSystem && item.sourceRowHash === row.rowHash;
}

function compactNumber(value: string | number | undefined, maxDigits = 4) {
  if (value == null) return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString("en-US", {
    maximumFractionDigits: maxDigits,
    minimumFractionDigits: 0,
  });
}

function tradeRecordLabel(trade: ExistingTrade) {
  const symbol = trade.symbol?.ticker ?? "-";
  return `${trade.tradeDate} ${trade.tradeType.toUpperCase()} ${symbol} ${compactNumber(trade.quantity)} @ ${compactNumber(trade.price, 2)}`;
}

function cashEventRecordLabel(event: ExistingCashEvent) {
  const symbol = event.symbol?.ticker ? ` ${event.symbol.ticker}` : "";
  return `${event.eventDate} ${event.eventType}${symbol} ${compactNumber(event.amount, 2)}`;
}

function matchTrade(
  row: NormalizedImportRow,
  sourceSystem: SourceSystem,
  trades: ExistingTrade[],
): PreviewMatch | undefined {
  const direct = trades.find((trade) => sourceMatch(row, sourceSystem, trade));
  if (direct) {
    return {
      id: direct.id,
      kind: "trade",
      confidence: 1,
      reason: "Source row already imported",
      recordLabel: tradeRecordLabel(direct),
    };
  }

  const candidates = trades
    .filter((trade) => trade.symbol?.ticker === row.ticker && trade.tradeType === row.tradeType)
    .filter((trade) => quantityClose(row.quantity, trade.quantity))
    .map((trade) => ({
      trade,
      days: dateDistanceDays(row.date, trade.tradeDate),
      priceOk: priceClose(row.price, trade.price),
    }))
    .filter((candidate) => candidate.days <= 14)
    .sort((a, b) => a.days - b.days);

  const best = candidates[0];
  if (!best) return undefined;
  const confidence = best.days <= 3 && best.priceOk ? 0.95 : 0.75;
  return {
    id: best.trade.id,
    kind: "trade",
    confidence,
    reason: best.days === 0 ? "Same ticker, side, quantity, and date" : `Within ${best.days} days`,
    recordLabel: tradeRecordLabel(best.trade),
  };
}

function matchCashEvent(
  row: NormalizedImportRow,
  sourceSystem: SourceSystem,
  events: ExistingCashEvent[],
): PreviewMatch | undefined {
  const direct = events.find((event) => sourceMatch(row, sourceSystem, event));
  if (direct) {
    return {
      id: direct.id,
      kind: "cash_event",
      confidence: 1,
      reason: "Source row already imported",
      recordLabel: cashEventRecordLabel(direct),
    };
  }

  const candidates = events
    .filter((event) => event.eventType === row.eventType)
    .filter((event) => (row.ticker ? event.symbol?.ticker === row.ticker : !event.symbol))
    .filter((event) => amountClose(row.amount, event.amount))
    .map((event) => ({ event, days: dateDistanceDays(row.date, event.eventDate) }))
    .filter((candidate) => candidate.days <= 14)
    .sort((a, b) => a.days - b.days);

  const best = candidates[0];
  if (!best) return undefined;
  return {
    id: best.event.id,
    kind: "cash_event",
    confidence: best.days <= 3 ? 0.95 : 0.75,
    reason: best.days === 0 ? "Same event, amount, symbol, and date" : `Within ${best.days} days`,
    recordLabel: cashEventRecordLabel(best.event),
  };
}

export function classifyImportRow({
  row,
  sourceSystem,
  trades,
  cashEvents,
  symbolExists,
}: {
  row: NormalizedImportRow;
  sourceSystem: SourceSystem;
  trades: ExistingTrade[];
  cashEvents: ExistingCashEvent[];
  symbolExists: boolean;
}): PreviewImportRow {
  if (!row.importable) {
    return {
      ...row,
      status: row.kind === "ignored" ? "ignored" : "needs_review",
      confidence: 0,
    };
  }

  if (row.kind === "trade" && (!row.ticker || !row.tradeType || !row.date || !row.quantity || !row.price)) {
    return { ...row, status: "needs_review", confidence: 0, message: "Trade row is missing required values." };
  }
  if (row.kind === "cash_event" && (!row.eventType || !row.date || row.amount == null)) {
    return { ...row, status: "needs_review", confidence: 0, message: "Cash-event row is missing required values." };
  }

  const match = row.kind === "trade"
    ? matchTrade(row, sourceSystem, trades)
    : matchCashEvent(row, sourceSystem, cashEvents);
  if (!match) return { ...row, status: "new", confidence: 0, willCreateSymbol: !!row.ticker && !symbolExists };

  return {
    ...row,
    status: match.confidence >= 0.9 ? "matched" : "possible_match",
    confidence: match.confidence,
    matched: match,
    willCreateSymbol: !!row.ticker && !symbolExists,
  };
}
