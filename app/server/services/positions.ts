import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { trades, tradeLotMatches } from "@/db/schema";
import { tradePassesFilters, type PerformanceFilters } from "./performance/filters";

type PositionAggregate = {
  platform: any;
  symbol: any;
  totalBoughtQty: number;
  totalCost: number;
  totalSoldQty: number;
  realizedPnl: number;
};

export type PositionFilters = PerformanceFilters;

async function list(userId: string, filters?: PositionFilters) {
  const [allTradesRaw, allMatchesRaw] = await Promise.all([
    db.query.trades.findMany({
      where: eq(trades.userId, userId),
      with: { platform: true, symbol: true },
    }),
    db.query.tradeLotMatches.findMany({ where: eq(tradeLotMatches.userId, userId) }),
  ]);

  const allTrades = allTradesRaw.filter((t) => tradePassesFilters(t, filters));
  const tradeIdSet = new Set(allTrades.map((t) => t.id));
  const allMatches = allMatchesRaw.filter((m) => tradeIdSet.has(m.buyTradeId));

  const positionsMap = new Map<string, PositionAggregate>();

  for (const trade of allTrades) {
    if (trade.tradeType !== "buy") continue;

    const key = `${trade.platformId}_${trade.symbolId}`;
    if (!positionsMap.has(key)) {
      positionsMap.set(key, {
        platform: (trade as any).platform,
        symbol: (trade as any).symbol,
        totalBoughtQty: 0,
        totalCost: 0,
        totalSoldQty: 0,
        realizedPnl: 0,
      });
    }

    const p = positionsMap.get(key)!;
    const buyQty = Number(trade.quantity);
    p.totalBoughtQty += buyQty;
    p.totalCost += buyQty * Number(trade.price) + Number(trade.fee);
  }

  const tradeById = new Map(allTrades.map((t) => [t.id, t]));
  for (const match of allMatches) {
    const buyTrade = tradeById.get(match.buyTradeId);
    if (!buyTrade) continue;

    const key = `${buyTrade.platformId}_${buyTrade.symbolId}`;
    const p = positionsMap.get(key);
    if (!p) continue;
    p.totalSoldQty += Number(match.matchedQuantity);
    p.realizedPnl += Number(match.realizedPnl);
  }

  return Array.from(positionsMap.values()).map((p) => {
    const openQty = p.totalBoughtQty - p.totalSoldQty;
    const openRatio = p.totalBoughtQty > 0 ? openQty / p.totalBoughtQty : 0;
    const investedAmount = openRatio * p.totalCost;
    const avgCost = openQty > 0 ? investedAmount / openQty : 0;

    return {
      ...p,
      openQty,
      investedAmount,
      avgCost,
      currencyCode: (p.platform?.currencyCode || "USD") as string,
    };
  });
}

export const positionsService = { list };
