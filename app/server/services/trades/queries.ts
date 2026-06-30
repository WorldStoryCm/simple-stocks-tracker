import { and, asc, count, desc, eq, gte, inArray, lte, sql, SQL } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { trades, tradeLotMatches } from "@/db/schema";

export type TradesListInput = {
  page: number;
  limit: number;
  action: string;
  symbolId?: string;
  platformId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortField: "tradeDate" | "symbolId" | "platformId" | "tradeType" | "price" | "quantity" | "total";
  sortDir: "asc" | "desc";
};

export async function list(userId: string, input: TradesListInput) {
  const { page, limit, action, symbolId, platformId, dateFrom, dateTo, sortField, sortDir } = input;
  const conditions: SQL[] = [eq(trades.userId, userId)];

  if (action && action !== "all") {
    conditions.push(eq(trades.tradeType, action as "buy" | "sell"));
  }
  if (symbolId && symbolId !== "all") conditions.push(eq(trades.symbolId, symbolId));
  if (platformId && platformId !== "all") conditions.push(eq(trades.platformId, platformId));
  if (dateFrom) conditions.push(gte(trades.tradeDate, dateFrom));
  if (dateTo) conditions.push(lte(trades.tradeDate, dateTo));

  const whereClause = and(...conditions);

  const orderBy = sortField === "total"
    ? [sortDir === "desc" ? desc(sql`${trades.quantity} * ${trades.price}`) : asc(sql`${trades.quantity} * ${trades.price}`)]
    : [sortDir === "desc" ? desc(trades[sortField]) : asc(trades[sortField])];

  const items = await db.query.trades.findMany({
    where: whereClause,
    orderBy,
    limit,
    offset: (page - 1) * limit,
    with: { platform: true, symbol: true },
  });

  const totalCountRes = await db.select({ value: count() }).from(trades).where(whereClause);
  const totalCount = totalCountRes[0].value;

  // Aggregate realized P/L per sell trade from cost-basis lot matches.
  const sellIds = items.filter((t) => t.tradeType === "sell").map((t) => t.id);
  const pnlBySell = new Map<string, number>();
  if (sellIds.length > 0) {
    const matches = await db
      .select({ sellTradeId: tradeLotMatches.sellTradeId, realizedPnl: tradeLotMatches.realizedPnl })
      .from(tradeLotMatches)
      .where(and(eq(tradeLotMatches.userId, userId), inArray(tradeLotMatches.sellTradeId, sellIds)));
    for (const m of matches) {
      pnlBySell.set(m.sellTradeId, (pnlBySell.get(m.sellTradeId) ?? 0) + Number(m.realizedPnl));
    }
  }

  const itemsWithPnl = items.map((t) => ({
    ...t,
    realizedPnl: t.tradeType === "sell" ? (pnlBySell.get(t.id) ?? 0).toFixed(2) : null,
  }));

  return {
    items: itemsWithPnl,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    page,
  };
}

export async function getOpenQuantity(userId: string, platformId: string, symbolId: string) {
  const buys = await db.query.trades.findMany({
    where: and(
      eq(trades.userId, userId),
      eq(trades.platformId, platformId),
      eq(trades.symbolId, symbolId),
      eq(trades.tradeType, "buy"),
    ),
  });

  if (buys.length === 0) return 0;

  const buyIds = new Set(buys.map((b) => b.id));
  const allMatches = await db.query.tradeLotMatches.findMany({ where: eq(tradeLotMatches.userId, userId) });
  const scopeMatches = allMatches.filter((m) => buyIds.has(m.buyTradeId));

  let totalOpen = 0;
  for (const buy of buys) {
    const buyQty = Number(buy.quantity);
    const matchedSoFar = scopeMatches
      .filter((m) => m.buyTradeId === buy.id)
      .reduce((sum, m) => sum + Number(m.matchedQuantity), 0);
    totalOpen += buyQty - matchedSoFar;
  }

  return totalOpen;
}

export async function symbolPnl(
  userId: string,
  input: { symbolId: string; platformId?: string; dateFrom?: string; dateTo?: string },
) {
  const conditions: SQL[] = [eq(trades.userId, userId), eq(trades.symbolId, input.symbolId)];
  if (input.platformId && input.platformId !== "all") conditions.push(eq(trades.platformId, input.platformId));
  if (input.dateFrom) conditions.push(gte(trades.tradeDate, input.dateFrom));
  if (input.dateTo) conditions.push(lte(trades.tradeDate, input.dateTo));

  const symbolTrades = await db.query.trades.findMany({
    where: and(...conditions),
    orderBy: [asc(trades.tradeDate), asc(trades.createdAt)],
  });

  if (symbolTrades.length === 0) return { chartData: [], totalPnl: 0 };

  const sellIds = symbolTrades.filter((t) => t.tradeType === "sell").map((t) => t.id);
  const pnlBySell = new Map<string, number>();
  let totalPnl = 0;

  if (sellIds.length > 0) {
    const matches = await db
      .select({ sellTradeId: tradeLotMatches.sellTradeId, realizedPnl: tradeLotMatches.realizedPnl })
      .from(tradeLotMatches)
      .where(and(eq(tradeLotMatches.userId, userId), inArray(tradeLotMatches.sellTradeId, sellIds)));

    for (const m of matches) {
      const pnl = Number(m.realizedPnl);
      pnlBySell.set(m.sellTradeId, (pnlBySell.get(m.sellTradeId) ?? 0) + pnl);
      totalPnl += pnl;
    }
  }

  // One data point per day: session P/L bar + cumulative line.
  const sellTrades = symbolTrades.filter((t) => t.tradeType === "sell");
  let cumulative = 0;
  const dailyPnl = new Map<string, { pnl: number; quantity: number; proceeds: number }>();
  for (const trade of sellTrades) {
    const pnl = pnlBySell.get(trade.id) ?? 0;
    const quantity = Number(trade.quantity);
    const existing = dailyPnl.get(trade.tradeDate) ?? { pnl: 0, quantity: 0, proceeds: 0 };
    existing.pnl += pnl;
    existing.quantity += quantity;
    existing.proceeds += quantity * Number(trade.price);
    dailyPnl.set(trade.tradeDate, existing);
  }

  const chartData = Array.from(dailyPnl.entries()).map(([date, day]) => {
    const pnl = parseFloat(day.pnl.toFixed(2));
    cumulative = parseFloat((cumulative + pnl).toFixed(2));
    return {
      date,
      pnl,
      cumulative,
      quantity: day.quantity,
      price: day.quantity > 0 ? day.proceeds / day.quantity : 0,
    };
  });

  return { chartData, totalPnl };
}
