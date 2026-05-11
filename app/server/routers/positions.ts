import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { trades, tradeLotMatches } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const filtersSchema = z
  .object({
    platformId: z.string().optional(),
    bucketId: z.string().optional(),
    symbolId: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .optional();

function tradePassesFilters(
  t: { platformId: string; bucketId: string | null; symbolId: string; tradeDate: string | null },
  f?: { platformId?: string; bucketId?: string; symbolId?: string; dateFrom?: string; dateTo?: string },
) {
  if (!f) return true;
  if (f.platformId && f.platformId !== 'all' && t.platformId !== f.platformId) return false;
  if (f.bucketId && f.bucketId !== 'all') {
    if (f.bucketId === 'uncategorized') {
      if (t.bucketId !== null) return false;
    } else if (t.bucketId !== f.bucketId) return false;
  }
  if (f.symbolId && f.symbolId !== 'all' && t.symbolId !== f.symbolId) return false;
  if (f.dateFrom && (!t.tradeDate || t.tradeDate < f.dateFrom)) return false;
  if (f.dateTo && (!t.tradeDate || t.tradeDate > f.dateTo)) return false;
  return true;
}

export const positionsRouter = router({
  list: protectedProcedure
    .input(z.object({ filters: filtersSchema }).optional())
    .query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const filters = input?.filters;

    const allTradesRaw = await db.query.trades.findMany({
      where: eq(trades.userId, userId),
      with: {
        platform: true,
        symbol: true,
        bucket: true,
      }
    });

    const allMatchesRaw = await db.query.tradeLotMatches.findMany({
      where: eq(tradeLotMatches.userId, userId)
    });

    const allTrades = allTradesRaw.filter(t => tradePassesFilters(t, filters));
    const tradeIdSet = new Set(allTrades.map(t => t.id));
    const allMatches = allMatchesRaw.filter(m => tradeIdSet.has(m.buyTradeId));

    const positionsMap = new Map<string, any>();

    for (const trade of allTrades) {
      if (trade.tradeType !== 'buy') continue;

      const key = `${trade.platformId}_${trade.symbolId}_${trade.bucketId}`;
      if (!positionsMap.has(key)) {
        positionsMap.set(key, {
          platform: trade.platform,
          symbol: trade.symbol,
          bucket: trade.bucket,
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

    // Now process matches to find open quantities and realized PNL
    for (const match of allMatches) {
      const buyTrade = allTrades.find(t => t.id === match.buyTradeId);
      if (!buyTrade) continue;

      const key = `${buyTrade.platformId}_${buyTrade.symbolId}_${buyTrade.bucketId}`;
      const p = positionsMap.get(key);
      if (p) {
        p.totalSoldQty += Number(match.matchedQuantity);
        p.realizedPnl += Number(match.realizedPnl);
      }
    }

    // Transform map into array of positions
    const positions = Array.from(positionsMap.values()).map(p => {
      const openQty = p.totalBoughtQty - p.totalSoldQty;
      // if openQty is roughly zero, avgCost is 0
      const openRatio = p.totalBoughtQty > 0 ? openQty / p.totalBoughtQty : 0;
      const investedAmount = openRatio * p.totalCost;
      const avgCost = openQty > 0 ? investedAmount / openQty : 0;

      return {
        ...p,
        openQty,
        investedAmount,
        avgCost,
        currencyCode: (p.platform?.currencyCode || 'USD') as string,
      };
    });

    // We can filter out positions with 0 openQty if we only want "Current Holdings",
    // but users often want to see fully closed positions to see Realized P/L for that stock.
    return positions;
  })
});
