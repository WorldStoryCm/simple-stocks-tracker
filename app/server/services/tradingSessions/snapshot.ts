import { and, asc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { tradeLotMatches, trades } from "@/db/schema";
import { positionsService } from "../positions";
import type { OpeningSnapshot } from "./types";

function executionDate(tradeDate: string, executedAt: string | null) {
  return new Date(executedAt ?? `${tradeDate}T00:00:00.000Z`);
}

export async function snapshotCurrentPosition(
  userId: string,
  platformId: string,
  symbolId: string,
): Promise<OpeningSnapshot> {
  const positions = await positionsService.list(userId);
  const position = positions.find(
    (item) => item.platform.id === platformId
      && item.symbol.id === symbolId
      && item.openQty > 0,
  );
  if (!position) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This position is no longer open. Refresh and choose another position.",
    });
  }

  const buys = await db.query.trades.findMany({
    where: and(
      eq(trades.userId, userId),
      eq(trades.platformId, platformId),
      eq(trades.symbolId, symbolId),
      eq(trades.tradeType, "buy"),
    ),
    orderBy: [asc(trades.tradeDate), asc(trades.executedAt), asc(trades.createdAt)],
  });
  const buyIds = buys.map((buy) => buy.id);
  const matches = buyIds.length > 0
    ? await db.query.tradeLotMatches.findMany({
      where: and(
        eq(tradeLotMatches.userId, userId),
        inArray(tradeLotMatches.buyTradeId, buyIds),
      ),
    })
    : [];
  const matchedByBuy = new Map<string, number>();
  for (const match of matches) {
    matchedByBuy.set(
      match.buyTradeId,
      (matchedByBuy.get(match.buyTradeId) ?? 0) + Number(match.matchedQuantity),
    );
  }

  const lots = buys.flatMap((buy) => {
    const remaining = Number(buy.quantity) - (matchedByBuy.get(buy.id) ?? 0);
    if (remaining <= 0.000001) return [];
    return [{
      sourceTradeId: buy.id,
      acquiredAt: executionDate(buy.tradeDate, buy.executedAt),
      quantity: remaining.toFixed(8),
      unitPrice: Number(buy.price).toFixed(4),
    }];
  });

  return {
    quantity: Number(position.openQty).toFixed(8),
    totalCost: Number(position.investedAmount).toFixed(4),
    lots,
  };
}
