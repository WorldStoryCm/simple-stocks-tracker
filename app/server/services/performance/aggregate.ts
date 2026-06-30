import { format, startOfWeek } from "date-fns";
import { convertToUSD } from "@/lib/exchange-rates";

type Trade = {
  id: string;
  platformId: string;
  symbolId: string;
  tradeType: "buy" | "sell";
  tradeDate: string;
  quantity: string | number;
  price: string | number;
  fee: string | number;
};

type Match = {
  buyTradeId: string;
  matchedQuantity: string | number;
  matchedCost: string | number;
  realizedPnl: string | number;
  sellTrade?: {
    platformId: string;
    tradeDate: string | null;
  } | null;
};

export type OpenPositionSummary = {
  symbolId: string;
  ticker: string;
  openQty: number;
  openCostUSD: number;
  fallbackCurrency: string;
};

export type PeriodStats = {
  data: { period: string; pnl: number }[];
  average: number;
  min: number;
  max: number;
};

export function aggregatePnlByPeriod(
  matches: Match[],
  rates: Record<string, number>,
  getPlatformCurrency: (pId: string | null | undefined) => string,
) {
  const dailyPnl: Record<string, number> = {};
  const weeklyPnl: Record<string, number> = {};
  const monthlyPnl: Record<string, number> = {};
  let totalRealizedPnl = 0;
  let winningTrades = 0;

  for (const match of matches) {
    const pId = match.sellTrade?.platformId;
    const currency = getPlatformCurrency(pId);
    const rawPnl = Number(match.realizedPnl);
    const pnl = convertToUSD(rawPnl, currency, rates);

    totalRealizedPnl += pnl;
    if (pnl > 0) winningTrades++;

    if (!match.sellTrade?.tradeDate) continue;

    const date = new Date(match.sellTrade.tradeDate + "T00:00:00");
    const dayKey = format(date, "yyyy-MM-dd");
    dailyPnl[dayKey] = (dailyPnl[dayKey] || 0) + pnl;
    const weekKey = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    weeklyPnl[weekKey] = (weeklyPnl[weekKey] || 0) + pnl;
    const monthKey = format(date, "yyyy-MM");
    monthlyPnl[monthKey] = (monthlyPnl[monthKey] || 0) + pnl;
  }

  return { dailyPnl, weeklyPnl, monthlyPnl, totalRealizedPnl, winningTrades };
}

type PositionAccumulator = {
  platformId: string;
  symbolId: string;
  bought: number;
  sold: number;
  costUSD: number;
  soldCostUSD: number;
};

export function aggregatePositionCosts(
  trades: Trade[],
  matches: Match[],
  activePlatformIds: Set<string>,
  symbolMap: Map<string, { ticker: string; sector: string | null; currencyCode: string | null }>,
  rates: Record<string, number>,
  getPlatformCurrency: (pId: string | null | undefined) => string,
) {
  const positionsMap = new Map<string, PositionAccumulator>();

  for (const t of trades) {
    if (t.tradeType !== "buy") continue;
    const key = `${t.platformId}_${t.symbolId}`;
    const p = positionsMap.get(key) || {
      platformId: t.platformId,
      symbolId: t.symbolId,
      bought: 0,
      sold: 0,
      costUSD: 0,
      soldCostUSD: 0,
    };
    p.bought += Number(t.quantity);
    const buyCost = Number(t.quantity) * Number(t.price) + Number(t.fee);
    p.costUSD += convertToUSD(buyCost, getPlatformCurrency(t.platformId), rates);
    positionsMap.set(key, p);
  }

  const tradeById = new Map(trades.map((t) => [t.id, t]));
  for (const m of matches) {
    const buyTrade = tradeById.get(m.buyTradeId);
    if (!buyTrade) continue;
    const key = `${buyTrade.platformId}_${buyTrade.symbolId}`;
    const p = positionsMap.get(key);
    if (!p) continue;
    p.sold += Number(m.matchedQuantity);
    p.soldCostUSD += convertToUSD(Number(m.matchedCost), getPlatformCurrency(buyTrade.platformId), rates);
  }

  const platformCostMap = new Map<string, number>();
  const sectorCostMap = new Map<string, number>();
  const openPositionSummaries: OpenPositionSummary[] = [];
  let totalInvested = 0;

  for (const p of positionsMap.values()) {
    if (!activePlatformIds.has(p.platformId)) continue;
    const openQty = p.bought - p.sold;
    const openCostUSD = Math.max(0, p.costUSD - p.soldCostUSD);
    totalInvested += openCostUSD;

    if (openCostUSD <= 0) continue;

    platformCostMap.set(p.platformId, (platformCostMap.get(p.platformId) || 0) + openCostUSD);
    const sym = symbolMap.get(p.symbolId);
    const sector = sym?.sector || "Unclassified";
    sectorCostMap.set(sector, (sectorCostMap.get(sector) || 0) + openCostUSD);
    if (sym?.ticker) {
      openPositionSummaries.push({
        symbolId: p.symbolId,
        ticker: sym.ticker,
        openQty,
        openCostUSD,
        fallbackCurrency: sym.currencyCode || getPlatformCurrency(p.platformId),
      });
    }
  }

  return { platformCostMap, sectorCostMap, openPositionSummaries, totalInvested };
}

export function buildStats(
  record: Record<string, number>,
  keys: string[],
  formatKey: (k: string) => string,
): PeriodStats {
  if (keys.length === 0) return { data: [], average: 0, min: 0, max: 0 };

  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  const data = keys.map((k) => {
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
}

export function buildPortfolioGrowth(
  trades: Trade[],
  monthlyPnl: Record<string, number>,
  rates: Record<string, number>,
  getPlatformCurrency: (pId: string | null | undefined) => string,
  todayMonth: string,
  fillMonthlyKeys: (from: string, to: string) => string[],
) {
  const monthlyBuyCostUSD: Record<string, number> = {};
  const monthlySellProceedsUSD: Record<string, number> = {};

  for (const t of trades) {
    const monthKey = t.tradeDate.substring(0, 7);
    const currency = getPlatformCurrency(t.platformId);
    if (t.tradeType === "buy") {
      const cost = Number(t.quantity) * Number(t.price) + Number(t.fee);
      monthlyBuyCostUSD[monthKey] = (monthlyBuyCostUSD[monthKey] || 0) + convertToUSD(cost, currency, rates);
    } else {
      const proceeds = Number(t.quantity) * Number(t.price) - Number(t.fee);
      monthlySellProceedsUSD[monthKey] = (monthlySellProceedsUSD[monthKey] || 0) + convertToUSD(proceeds, currency, rates);
    }
  }

  const allKeys = [...new Set([...Object.keys(monthlyBuyCostUSD), ...Object.keys(monthlyPnl)])];
  if (allKeys.length === 0) return [];
  const minMonth = allKeys.sort()[0];
  const monthKeys = fillMonthlyKeys(minMonth, todayMonth);

  let runningDeployed = 0;
  let runningReturned = 0;
  let runningPnl = 0;

  return monthKeys.map((k) => {
    runningDeployed += monthlyBuyCostUSD[k] || 0;
    runningReturned += monthlySellProceedsUSD[k] || 0;
    runningPnl += monthlyPnl[k] || 0;
    const netInvested = Math.max(0, runningDeployed - runningReturned);
    return {
      period: format(new Date(k + "-01T00:00:00"), "MMM yyyy"),
      netInvested,
      cumulativePnl: runningPnl,
      totalValue: netInvested + runningPnl,
    };
  });
}
