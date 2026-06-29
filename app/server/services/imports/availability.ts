import type { PreviewImportRow } from "./types";

const ZERO_EPSILON = 0.000001;

type OpenQuantityInput = {
  ticker?: string;
  tradeType?: "buy" | "sell";
  kind: string;
  quantity?: number;
  date?: string;
  rowIndex: number;
  rowHash: string;
  importable: boolean;
  corporateActionType?: string;
  status?: string;
};

export function findInsufficientQuantityRows(
  rows: OpenQuantityInput[],
  initialOpenByTicker: Map<string, number>,
) {
  const openByTicker = new Map(initialOpenByTicker);
  const blocked = new Map<string, string>();
  const orderedRows = [...rows].sort((left, right) =>
    (left.date ?? "").localeCompare(right.date ?? "") || left.rowIndex - right.rowIndex,
  );

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
    if (row.kind !== "trade") continue;
    if (row.tradeType === "buy") {
      openByTicker.set(row.ticker, currentOpen + row.quantity);
      continue;
    }
    if (row.tradeType === "sell") {
      const shortBy = row.quantity - currentOpen;
      if (shortBy > ZERO_EPSILON) {
        blocked.set(
          row.rowHash,
          `Insufficient open quantity for ${row.ticker}. Short by ${shortBy.toFixed(8)}. Missing opening lot or corporate action in source file.`,
        );
      } else {
        openByTicker.set(row.ticker, currentOpen - row.quantity);
      }
    }
  }

  return blocked;
}

export function applyQuantityAvailability(
  rows: PreviewImportRow[],
  initialOpenByTicker: Map<string, number>,
) {
  const blocked = findInsufficientQuantityRows(rows, initialOpenByTicker);
  if (blocked.size === 0) return rows;

  return rows.map((row) => {
    const message = blocked.get(row.rowHash);
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
