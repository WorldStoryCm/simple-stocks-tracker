import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { trades, tradeLotMatches, platforms, buckets, goals } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { format, startOfWeek } from 'date-fns';
import { getExchangeRates, convertToUSD } from '@/lib/exchange-rates';

/** Generate every YYYY-MM-DD string between two dates (inclusive). */
function fillDailyKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  const d = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (d <= end) {
    keys.push(format(d, 'yyyy-MM-dd'));
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

/** Generate week-start keys from firstWeek to current week. */
function fillWeeklyKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  const d = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (d <= end) {
    keys.push(format(d, 'yyyy-MM-dd'));
    d.setDate(d.getDate() + 7);
  }
  return keys;
}

/** Generate every YYYY-MM key between two months (inclusive). */
function fillMonthlyKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ey, em] = to.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return keys;
}

export const performanceRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    const rates = await getExchangeRates();
    const [allPlatforms, activeGoals] = await Promise.all([
      db.query.platforms.findMany({ where: eq(platforms.userId, userId) }),
      db.query.goals.findMany({ where: and(eq(goals.userId, userId), eq(goals.isActive, true)) }),
    ]);
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

    const buildStats = (record: Record<string, number>, keys: string[], formatKey: (k: string) => string) => {
      if (keys.length === 0) return { data: [], average: 0, min: 0, max: 0 };

      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      const data = keys.map(k => {
        const pnl = record[k] || 0;
        sum += pnl;
        if (pnl < min) min = pnl;
        if (pnl > max) max = pnl;
        return { period: formatKey(k), pnl };
      });
      return {
        data,
        average: sum / data.length,
        min: min === Infinity ? 0 : min,
        max: max === -Infinity ? 0 : max,
      };
    };

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayMonth = format(new Date(), 'yyyy-MM');
    const todayWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const dailyKeys = Object.keys(dailyPnl).length > 0
      ? fillDailyKeys(Object.keys(dailyPnl).sort()[0], today)
      : [];
    const weeklyKeys = Object.keys(weeklyPnl).length > 0
      ? fillWeeklyKeys(Object.keys(weeklyPnl).sort()[0], todayWeekStart)
      : [];
    const monthlyKeys = Object.keys(monthlyPnl).length > 0
      ? fillMonthlyKeys(Object.keys(monthlyPnl).sort()[0], todayMonth)
      : [];

    const dailyStats = buildStats(dailyPnl, dailyKeys, (k) => format(new Date(k + "T00:00:00"), "MMM d"));
    const weeklyStats = buildStats(weeklyPnl, weeklyKeys, (k) => `Wk ${format(new Date(k + "T00:00:00"), "MMM d")}`);
    const monthlyStats = buildStats(monthlyPnl, monthlyKeys, (k) => format(new Date(k + "-01T00:00:00"), "MMM yyyy"));

    // Current-period P/L for goal progress tracking
    const todayYear = format(new Date(), 'yyyy');
    const currentMonthPnl = monthlyPnl[todayMonth] || 0;
    const currentYearPnl = Object.entries(monthlyPnl)
      .filter(([k]) => k.startsWith(todayYear))
      .reduce((sum, [, v]) => sum + v, 0);

    // Shape goals for the frontend
    const goalProgress = activeGoals.map(g => ({
      goalType: g.goalType,
      target: Number(g.amount),
      current: g.goalType === 'monthly_profit' ? currentMonthPnl : currentYearPnl,
    }));

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
      monthlyPnl: monthlyStats.data.map(d => ({ month: d.period, pnl: d.pnl })), // backward compatibility
      currentMonthPnl,
      currentYearPnl,
      goalProgress,
    };
  })
});
