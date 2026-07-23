import type { PreviewImportRow } from "./types";
import { compareImportRows } from "./ordering";

const ZERO_EPSILON = 0.000001;

type OpenQuantityInput = {
  ticker?: string;
  tradeType?: "buy" | "sell";
  kind: string;
  quantity?: number;
  price?: number;
  date?: string;
  executedAt?: string;
  executionOrder?: number;
  rowIndex: number;
  rowHash: string;
  importable: boolean;
  corporateActionType?: string;
  status?: string;
};

type PositionAdjustment = {
  quantity: number;
  price: number;
  reason: string;
};

export function analyzeQuantityAvailability(
  rows: OpenQuantityInput[],
  initialOpenByTicker: Map<string, number>,
) {
  const openByTicker = new Map(initialOpenByTicker);
  const blocked = new Map<string, string>();
  const adjustments = new Map<string, PositionAdjustment>();
  const orderedRows = [...rows].sort(compareImportRows);

  for (const row of orderedRows) {
    if (
      !row.importable
      || row.status === "matched"
      || row.status === "ignored"
      || row.status === "needs_review"
      || !row.ticker
      || row.quantity == null
    ) {
      continue;
    }
    const currentOpen = openByTicker.get(row.ticker) ?? 0;

    if (row.kind === "corporate_action" && row.corporateActionType === "stock_split") {
      openByTicker.set(row.ticker, currentOpen + row.quantity);
      continue;
    }
    if (row.kind === "corporate_action" && row.corporateActionType === "merger_stock") {
      const nextOpen = currentOpen + row.quantity;
      if (nextOpen < -ZERO_EPSILON) {
        blocked.set(
          row.rowHash,
          `Insufficient open quantity for ${row.ticker} merger. Short by ${Math.abs(nextOpen).toFixed(8)}.`,
        );
      } else {
        openByTicker.set(row.ticker, Math.max(0, nextOpen));
      }
      continue;
    }
    if (row.kind !== "trade") continue;
    if (row.tradeType === "buy") {
      openByTicker.set(row.ticker, currentOpen + row.quantity);
      continue;
    }
    if (row.tradeType === "sell") {
      const shortBy = row.quantity - currentOpen;
      if (shortBy > ZERO_EPSILON) {
        if (row.price == null) {
          blocked.set(
            row.rowHash,
            `Insufficient open quantity for ${row.ticker}. Short by ${shortBy.toFixed(8)}. Missing opening lot or corporate action in source file.`,
          );
        } else {
          adjustments.set(row.rowHash, {
            quantity: shortBy,
            price: row.price,
            reason: currentOpen <= ZERO_EPSILON
              ? "No opening lot exists in the source file before this sell."
              : `Source file is short by ${shortBy.toFixed(8)} shares before this sell.`,
          });
          openByTicker.set(row.ticker, 0);
        }
      } else {
        openByTicker.set(row.ticker, currentOpen - row.quantity);
      }
    }
  }

  return { blocked, adjustments };
}

export function findInsufficientQuantityRows(
  rows: OpenQuantityInput[],
  initialOpenByTicker: Map<string, number>,
) {
  return analyzeQuantityAvailability(rows, initialOpenByTicker).blocked;
}

export function applyQuantityAvailability(
  rows: PreviewImportRow[],
  initialOpenByTicker: Map<string, number>,
) {
  const { blocked, adjustments } = analyzeQuantityAvailability(rows, initialOpenByTicker);
  if (blocked.size === 0 && adjustments.size === 0) return rows;

  return rows.map((row) => {
    const message = blocked.get(row.rowHash);
    const adjustment = adjustments.get(row.rowHash);
    if (adjustment && row.status !== "matched" && row.status !== "ignored") {
      return {
        ...row,
        importable: true,
        message: `Will add a non-cash position adjustment for ${adjustment.quantity.toFixed(8)} ${row.ticker} shares before this sell.`,
        positionAdjustment: adjustment,
      };
    }
    if (!message || row.status === "matched" || row.status === "ignored") return row;
    return {
      ...row,
      importable: false,
      status: "needs_review" as const,
      confidence: 0,
      message,
    };
  });
}
