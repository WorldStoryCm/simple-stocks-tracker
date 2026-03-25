import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { trades, tradeLotMatches } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const performanceRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    // In v1 we do in-memory aggregations for simplicity.
    const allMatches = await db.query.tradeLotMatches.findMany({
      where: eq(tradeLotMatches.userId, userId),
      with: {
        sellTrade: true // to get the date of the sell
      }
    });

    // Also get all buys to calculate Total Invested
    const allTrades = await db.query.trades.findMany({
      where: eq(trades.userId, userId)
    });

    let totalInvested = 0;
    let totalRealizedPnl = 0;
    let winningTrades = 0;
    const monthlyPnl: Record<string, number> = {};

    allMatches.forEach(match => {
      const pnl = Number(match.realizedPnl);
      totalRealizedPnl += pnl;
      if (pnl > 0) winningTrades++;

      if (match.sellTrade) {
        // format YYYY-MM
        const date = new Date(match.sellTrade.tradeDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyPnl[monthKey] = (monthlyPnl[monthKey] || 0) + pnl;
      }
    });

    const positionsMap = new Map<string, { bought: number; sold: number; cost: number }>();

    allTrades.forEach(t => {
      if (t.tradeType === 'buy') {
        const key = `${t.platformId}_${t.symbolId}_${t.bucketId}`;
        const p = positionsMap.get(key) || { bought: 0, sold: 0, cost: 0 };
        p.bought += Number(t.quantity);
        p.cost += Number(t.quantity) * Number(t.price) + Number(t.fee);
        positionsMap.set(key, p);
      }
    });

    allMatches.forEach(m => {
      const buyTrade = allTrades.find(t => t.id === m.buyTradeId);
      if (buyTrade) {
        const key = `${buyTrade.platformId}_${buyTrade.symbolId}_${buyTrade.bucketId}`;
        const p = positionsMap.get(key);
        if (p) p.sold += Number(m.matchedQuantity);
      }
    });

    Array.from(positionsMap.values()).forEach(p => {
      const openQty = p.bought - p.sold;
      const openRatio = p.bought > 0 ? openQty / p.bought : 0;
      totalInvested += p.cost * openRatio;
    });

    const winRate = allMatches.length > 0 ? (winningTrades / allMatches.length) * 100 : 0;

    return {
      totalInvested,
      totalRealizedPnl,
      winRate,
      totalMatches: allMatches.length,
      monthlyPnl: Object.entries(monthlyPnl).map(([month, pnl]) => ({ month, pnl })).sort((a, b) => a.month.localeCompare(b.month))
    };
  })
});
