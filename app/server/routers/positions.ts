import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { trades, tradeLotMatches } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const positionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    // For V1, we fetch all user trades and matches and aggregate them in memory.
    // In production with 10k+ trades, this should be a SQL View or incremental cache.
    const allTrades = await db.query.trades.findMany({
      where: eq(trades.userId, userId),
      with: {
        platform: true,
        symbol: true,
        bucket: true,
      }
    });

    const allMatches = await db.query.tradeLotMatches.findMany({
      where: eq(tradeLotMatches.userId, userId)
    });

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
