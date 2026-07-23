import { format, startOfWeek } from "date-fns";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import {
  capitalProgressSettings,
  goals,
  platforms,
  symbols,
  tradeLotMatches,
  trades,
} from "@/db/schema";
import { convertFromUSD, convertToUSD, getExchangeRates } from "@/lib/exchange-rates";
import { getLiveQuotes } from "@/lib/live-quotes";
import { fillDailyKeys, fillMonthlyKeys, fillWeeklyKeys } from "./dates";
import { tradePassesFilters, type PerformanceFilters } from "./filters";
import {
  aggregatePnlByPeriod,
  aggregatePositionCosts,
  buildPortfolioGrowth,
  buildStats,
  type OpenPositionSummary,
} from "./aggregate";

const DEFAULT_CAPITAL_PROGRESS_SETTINGS = {
  currencyCode: "EUR",
  targetAmount: 100000,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function loadAll(userId: string) {
  const [allPlatforms, activeGoals, allSymbols, progressSettings, allMatchesRaw, allTradesRaw] =
    await Promise.all([
      db.query.platforms.findMany({ where: eq(platforms.userId, userId) }),
      db.query.goals.findMany({ where: and(eq(goals.userId, userId), eq(goals.isActive, true)) }),
      db.query.symbols.findMany({ where: eq(symbols.userId, userId) }),
      db.query.capitalProgressSettings.findFirst({ where: eq(capitalProgressSettings.userId, userId) }),
      db.query.tradeLotMatches.findMany({
        where: eq(tradeLotMatches.userId, userId),
        with: { sellTrade: true },
      }),
      db.query.trades.findMany({ where: eq(trades.userId, userId) }),
    ]);

  return { allPlatforms, activeGoals, allSymbols, progressSettings, allMatchesRaw, allTradesRaw };
}

function buildCapitalProgress(
  progressSettings: { currencyCode: string; targetAmount: string | number } | undefined | null,
  openPositionSummaries: OpenPositionSummary[],
  liveQuotes: Awaited<ReturnType<typeof getLiveQuotes>>,
  allPlatforms: { isActive: boolean; cashBalance: string | number; currencyCode: string }[],
  rates: Record<string, number>,
) {
  const config = progressSettings
    ? { currencyCode: progressSettings.currencyCode, targetAmount: Number(progressSettings.targetAmount) }
    : DEFAULT_CAPITAL_PROGRESS_SETTINGS;

  const livePositionsValueUSD = openPositionSummaries.reduce((sum, position) => {
    const quote = liveQuotes[position.ticker];
    if (!quote?.price) return sum + position.openCostUSD;
    return sum + convertToUSD(position.openQty * quote.price, quote.currency || position.fallbackCurrency, rates);
  }, 0);

  const totalCashUSD = allPlatforms.reduce(
    (sum, p) => p.isActive ? sum + convertToUSD(Number(p.cashBalance), p.currencyCode, rates) : sum,
    0,
  );

  const livePositionsAmount = convertFromUSD(livePositionsValueUSD, config.currencyCode, rates);
  const cashAmount = convertFromUSD(totalCashUSD, config.currencyCode, rates);
  const totalAmount = livePositionsAmount + cashAmount;

  return {
    currencyCode: config.currencyCode,
    targetAmount: config.targetAmount,
    livePositionsAmount,
    cashAmount,
    totalAmount,
    remainingAmount: Math.max(0, config.targetAmount - totalAmount),
    progressPercent: clamp((totalAmount / config.targetAmount) * 100, 0, 100),
  };
}

async function stats(userId: string, filters?: PerformanceFilters) {
  const rates = await getExchangeRates();
  const data = await loadAll(userId);
  const { allPlatforms, activeGoals, allSymbols, progressSettings, allMatchesRaw, allTradesRaw } = data;

  const platformMap = new Map(allPlatforms.map((p) => [p.id, p]));
  const activePlatformIds = new Set(allPlatforms.filter((p) => p.isActive).map((p) => p.id));
  const symbolMap = new Map(allSymbols.map((s) => [s.id, s]));
  const getPlatformCurrency = (pId: string | null | undefined) =>
    pId ? platformMap.get(pId)?.currencyCode || "USD" : "USD";

  // Apply filters
  const allTrades = allTradesRaw.filter((t) => tradePassesFilters(t, filters));
  const tradeIdSet = new Set(allTrades.map((t) => t.id));
  const positionMatches = allMatchesRaw.filter(
    (m) => (m.sellTrade ? tradePassesFilters(m.sellTrade, filters) : false) && tradeIdSet.has(m.buyTradeId),
  );
  const pnlMatches = allMatchesRaw.filter(
    (m) => m.sellTrade ? tradePassesFilters(m.sellTrade, filters) : false,
  );

  // PnL aggregations
  const {
    dailyPnl,
    weeklyPnl,
    monthlyPnl,
    totalRealizedPnl,
    winningTrades,
    closedTrades,
  } = aggregatePnlByPeriod(pnlMatches, rates, getPlatformCurrency);

  // Position cost aggregations
  const { platformCostMap, sectorCostMap, openPositionSummaries, totalInvested } =
    aggregatePositionCosts(allTrades, positionMatches, activePlatformIds, symbolMap, rates, getPlatformCurrency);

  const liveQuotes = await getLiveQuotes(openPositionSummaries.map((p) => p.ticker));

  const investedPerPlatform = Array.from(platformCostMap.entries()).map(([id, amount]) => ({
    name: platformMap.get(id)?.name || "Unknown",
    value: amount,
  }));
  const investedPerSector = Array.from(sectorCostMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;

  // Period stats
  const today = format(new Date(), "yyyy-MM-dd");
  const todayMonth = format(new Date(), "yyyy-MM");
  const todayWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const dailyKeys = Object.keys(dailyPnl).length > 0 ? fillDailyKeys(Object.keys(dailyPnl).sort()[0], today) : [];
  const weeklyKeys = Object.keys(weeklyPnl).length > 0 ? fillWeeklyKeys(Object.keys(weeklyPnl).sort()[0], todayWeekStart) : [];
  const monthlyKeys = Object.keys(monthlyPnl).length > 0 ? fillMonthlyKeys(Object.keys(monthlyPnl).sort()[0], todayMonth) : [];

  const dailyStats = buildStats(dailyPnl, dailyKeys, (k) => format(new Date(k + "T00:00:00"), "MMM d"));
  const weeklyStats = buildStats(weeklyPnl, weeklyKeys, (k) => `Wk ${format(new Date(k + "T00:00:00"), "MMM d")}`);
  const monthlyStats = buildStats(monthlyPnl, monthlyKeys, (k) => format(new Date(k + "-01T00:00:00"), "MMM yyyy"));

  // Goal progress
  const todayYear = format(new Date(), "yyyy");
  const currentMonthPnl = monthlyPnl[todayMonth] || 0;
  const currentYearPnl = Object.entries(monthlyPnl)
    .filter(([k]) => k.startsWith(todayYear))
    .reduce((sum, [, v]) => sum + v, 0);

  const goalProgress = activeGoals.map((g) => ({
    goalType: g.goalType,
    target: Number(g.amount),
    current: g.goalType === "monthly_profit" ? currentMonthPnl : currentYearPnl,
  }));

  // Portfolio growth chart
  const portfolioStats = buildPortfolioGrowth(allTrades, monthlyPnl, rates, getPlatformCurrency, todayMonth, fillMonthlyKeys);

  // Capital progress
  const capitalProgress = buildCapitalProgress(progressSettings, openPositionSummaries, liveQuotes, allPlatforms, rates);

  return {
    totalInvested,
    totalRealizedPnl,
    investedPerPlatform,
    investedPerSector,
    winRate,
    totalMatches: pnlMatches.length,
    dailyStats,
    weeklyStats,
    monthlyStats,
    monthlyPnl: monthlyStats.data.map((d) => ({ month: d.period, pnl: d.pnl })), // backward compatibility
    currentMonthPnl,
    currentYearPnl,
    goalProgress,
    portfolioStats,
    capitalProgress,
  };
}

export const performanceService = { stats };
export type { PerformanceFilters } from "./filters";
