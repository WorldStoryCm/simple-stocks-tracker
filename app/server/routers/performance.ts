import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { trades, tradeLotMatches, platforms, buckets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { format, startOfWeek } from 'date-fns';
import { getExchangeRates, convertToUSD } from '@/lib/exchange-rates';

export const performanceRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    const rates = await getExchangeRates();
    const allPlatforms = await db.query.platforms.findMany({ where: eq(platforms.userId, userId) });
    const allBuckets = await db.query.buckets.findMany({ where: eq(buckets.userId, userId) });
    
    const platformMap = new Map(allPlatforms.map(p => [p.id, p]));
    const bucketMap = new Map(allBuckets.map(b => [b.id, b]));
    
    const getPlatformCurrency = (pId: string | null | undefined) => {
      if (!pId) return "USD";
      return platformMap.get(pId)?.currencyCode || "USD";
    };

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
    
    const dailyPnl: Record<string, number> = {};
    const weeklyPnl: Record<string, number> = {};
    const monthlyPnl: Record<string, number> = {};

    allMatches.forEach(match => {
      const pId = match.sellTrade?.platformId;
      const currency = getPlatformCurrency(pId);
      const rawPnl = Number(match.realizedPnl);
      const pnl = convertToUSD(rawPnl, currency, rates);
      
      totalRealizedPnl += pnl;
      if (pnl > 0) winningTrades++;

      if (match.sellTrade) {
        if (!match.sellTrade.tradeDate) return;

        const dateStr = match.sellTrade.tradeDate; // "YYYY-MM-DD"
        const date = new Date(dateStr + "T00:00:00");
        
        // Daily
        const dayKey = format(date, "yyyy-MM-dd");
        dailyPnl[dayKey] = (dailyPnl[dayKey] || 0) + pnl;

        // Weekly
        const weekDate = startOfWeek(date, { weekStartsOn: 1 });
        const weekKey = format(weekDate, "yyyy-MM-dd");
        weeklyPnl[weekKey] = (weeklyPnl[weekKey] || 0) + pnl;

        // Monthly
        const monthKey = format(date, "yyyy-MM");
        monthlyPnl[monthKey] = (monthlyPnl[monthKey] || 0) + pnl;
      }
    });

    const positionsMap = new Map<string, { platformId: string; bucketId: string | null; bought: number; sold: number; costUSD: number }>();

    allTrades.forEach(t => {
      if (t.tradeType === 'buy') {
        const key = `${t.platformId}_${t.symbolId}_${t.bucketId}`;
        const p = positionsMap.get(key) || { platformId: t.platformId, bucketId: t.bucketId, bought: 0, sold: 0, costUSD: 0 };
        p.bought += Number(t.quantity);
        
        const buyCost = Number(t.quantity) * Number(t.price) + Number(t.fee);
        const buyCostUSD = convertToUSD(buyCost, getPlatformCurrency(t.platformId), rates);
        p.costUSD += buyCostUSD;
        
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

    const platformCostMap = new Map<string, number>();
    const bucketCostMap = new Map<string, number>();

    Array.from(positionsMap.values()).forEach(p => {
      const openQty = p.bought - p.sold;
      const openRatio = p.bought > 0 ? openQty / p.bought : 0;
      const openCostUSD = p.costUSD * openRatio;
      
      totalInvested += openCostUSD;
      
      if (openCostUSD > 0) {
        platformCostMap.set(p.platformId, (platformCostMap.get(p.platformId) || 0) + openCostUSD);
        bucketCostMap.set(p.bucketId || "uncategorized", (bucketCostMap.get(p.bucketId || "uncategorized") || 0) + openCostUSD);
      }
    });

    const investedPerPlatform = Array.from(platformCostMap.entries()).map(([id, amount]) => ({
      name: platformMap.get(id)?.name || 'Unknown',
      value: amount
    }));

    const investedPerBucket = Array.from(bucketCostMap.entries()).map(([id, amount]) => ({
      name: id === "uncategorized" ? "Uncategorized" : (bucketMap.get(id)?.label || 'Unknown'),
      value: amount
    }));

    const winRate = allMatches.length > 0 ? (winningTrades / allMatches.length) * 100 : 0;

    const buildStats = (record: Record<string, number>, formatKey: (k: string) => string) => {
      const entries = Object.entries(record).sort((a, b) => a[0].localeCompare(b[0]));
      if (entries.length === 0) return { data: [], average: 0, min: 0, max: 0 };
      
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      const data = entries.map(([k, pnl]) => {
        sum += pnl;
        if (pnl < min) min = pnl;
        if (pnl > max) max = pnl;
        return { period: formatKey(k), pnl };
      });
      return {
        data,
        average: sum / data.length,
        min,
        max
      };
    };

    const dailyStats = buildStats(dailyPnl, (k) => format(new Date(k + "T00:00:00"), "MMM d"));
    const weeklyStats = buildStats(weeklyPnl, (k) => `Wk ${format(new Date(k + "T00:00:00"), "MMM d")}`);
    const monthlyStats = buildStats(monthlyPnl, (k) => format(new Date(k + "-01T00:00:00"), "MMM yyyy"));

    return {
      totalInvested,
      totalRealizedPnl,
      investedPerPlatform,
      investedPerBucket,
      winRate,
      totalMatches: allMatches.length,
      dailyStats,
      weeklyStats,
      monthlyStats,
      monthlyPnl: monthlyStats.data.map(d => ({ month: d.period, pnl: d.pnl })) // backward compatibility
    };
  })
});
