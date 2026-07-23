import { and, eq } from "drizzle-orm";
import type { db } from "@/db/drizzle";
import { trades } from "@/db/schema";
import { applyQuantityAvailability } from "./availability";
import type { PreviewImportRow } from "./types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type ExistingTrade = {
  tradeType: "buy" | "sell";
  quantity: string | number;
  symbol?: { ticker: string } | null;
};

export function buildOpenQuantityByTicker(existingTrades: ExistingTrade[]) {
  const openByTicker = new Map<string, number>();

  for (const trade of existingTrades) {
    const ticker = trade.symbol?.ticker;
    if (!ticker) continue;
    const direction = trade.tradeType === "buy" ? 1 : -1;
    openByTicker.set(ticker, (openByTicker.get(ticker) ?? 0) + direction * Number(trade.quantity));
  }

  return openByTicker;
}

export function planCommitQuantityAvailability(
  rows: PreviewImportRow[],
  existingTrades: ExistingTrade[],
) {
  const undecoratedRows = rows.map((row) => {
    if (!row.positionAdjustment) return row;
    return {
      ...row,
      message: undefined,
      positionAdjustment: undefined,
    };
  });

  return applyQuantityAvailability(
    undecoratedRows,
    buildOpenQuantityByTicker(existingTrades),
  );
}

export async function prepareRowsForCommit(
  tx: Tx,
  userId: string,
  platformId: string,
  rows: PreviewImportRow[],
) {
  const existingTrades = await tx.query.trades.findMany({
    where: and(
      eq(trades.userId, userId),
      eq(trades.platformId, platformId),
    ),
    with: { symbol: true },
  });

  return planCommitQuantityAvailability(rows, existingTrades);
}
