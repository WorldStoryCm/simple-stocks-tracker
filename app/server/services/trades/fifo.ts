import { and, asc, eq, inArray } from "drizzle-orm";
import { trades, tradeLotMatches } from "@/db/schema";
import type { db } from "@/db/drizzle";

const ZERO_EPSILON = 0.000001;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type TradeLotMatchRecord = typeof tradeLotMatches.$inferSelect;

export type FifoScope = {
  userId: string;
  platformId: string;
  symbolId: string;
};

export type FifoTrade = {
  id: string;
  tradeType: "buy" | "sell";
  quantity: string | number;
  price: string | number;
  fee: string | number;
};

export type FifoMatchDraft = {
  sellTradeId: string;
  buyTradeId: string;
  matchedQuantity: string;
  buyPrice: string;
  sellPrice: string;
  matchedCost: string;
  matchedProceeds: string;
  realizedPnl: string;
};

type FifoCalculation = {
  matches: FifoMatchDraft[];
  shortfall?: {
    sellTradeId: string;
    remaining: number;
  };
};

function formatQuantity(value: number) {
  return value.toFixed(8);
}

function formatPrice(value: number) {
  return value.toFixed(4);
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

export function calculateFifoMatches(orderedTrades: FifoTrade[]): FifoCalculation {
  const lots: { trade: FifoTrade; remainingQty: number }[] = [];
  const matches: FifoMatchDraft[] = [];

  for (const trade of orderedTrades) {
    const quantity = Number(trade.quantity);
    if (trade.tradeType === "buy") {
      lots.push({ trade, remainingQty: quantity });
      continue;
    }

    let sellQtyRemaining = quantity;
    const sellPrice = Number(trade.price);
    const sellFee = Number(trade.fee);

    for (const lot of lots) {
      if (sellQtyRemaining <= ZERO_EPSILON) break;
      if (lot.remainingQty <= ZERO_EPSILON) continue;

      const matchedQty = Math.min(lot.remainingQty, sellQtyRemaining);
      const buyPrice = Number(lot.trade.price);
      const matchedCost = matchedQty * buyPrice;
      const matchedProceeds = matchedQty * sellPrice;
      const feeProportion = matchedQty / quantity;
      const allocatedFee = sellFee * feeProportion;
      const realizedPnl = matchedProceeds - matchedCost - allocatedFee;

      matches.push({
        sellTradeId: trade.id,
        buyTradeId: lot.trade.id,
        matchedQuantity: formatQuantity(matchedQty),
        buyPrice: formatPrice(buyPrice),
        sellPrice: formatPrice(sellPrice),
        matchedCost: formatMoney(matchedCost),
        matchedProceeds: formatMoney(matchedProceeds),
        realizedPnl: formatMoney(realizedPnl),
      });

      lot.remainingQty -= matchedQty;
      sellQtyRemaining -= matchedQty;
    }

    if (sellQtyRemaining > ZERO_EPSILON) {
      return {
        matches,
        shortfall: {
          sellTradeId: trade.id,
          remaining: sellQtyRemaining,
        },
      };
    }
  }

  return { matches };
}

export async function rebuildFifoMatches(tx: Tx, scope: FifoScope) {
  const scopeTrades = await tx.query.trades.findMany({
    where: and(
      eq(trades.userId, scope.userId),
      eq(trades.platformId, scope.platformId),
      eq(trades.symbolId, scope.symbolId),
    ),
    orderBy: [asc(trades.tradeDate), asc(trades.createdAt), asc(trades.id)],
  });

  const sellIds = scopeTrades
    .filter((trade) => trade.tradeType === "sell")
    .map((trade) => trade.id);

  if (sellIds.length > 0) {
    await tx
      .delete(tradeLotMatches)
      .where(and(eq(tradeLotMatches.userId, scope.userId), inArray(tradeLotMatches.sellTradeId, sellIds)));
  }

  const result = calculateFifoMatches(scopeTrades);
  if (result.shortfall || result.matches.length === 0) return result;

  await tx.insert(tradeLotMatches).values(
    result.matches.map((match) => ({
      userId: scope.userId,
      ...match,
    })),
  );

  return result;
}

/**
 * Match a freshly inserted sell trade against existing buy lots in FIFO order,
 * inserting `tradeLotMatches` rows that record realized P/L. Throws if there
 * isn't enough open quantity to cover the sell.
 *
 * Must run inside a transaction (`tx`).
 */
export async function applyFifoMatch(
  tx: Tx,
  params: {
    userId: string;
    sellTradeId: string;
    platformId: string;
    symbolId: string;
    quantity: number;
    sellPrice: number;
    sellFee: number;
  },
) {
  const { userId, sellTradeId, platformId, symbolId, quantity, sellPrice, sellFee } = params;
  let sellQtyRemaining = quantity;

  // All buys in this scope, oldest first
  const buys = await tx.query.trades.findMany({
    where: and(
      eq(trades.userId, userId),
      eq(trades.platformId, platformId),
      eq(trades.symbolId, symbolId),
      eq(trades.tradeType, "buy"),
    ),
    orderBy: [asc(trades.tradeDate), asc(trades.createdAt), asc(trades.id)],
  });

  // Pre-load existing matches for these buys so we can compute open qty per lot.
  const buyIds = new Set(buys.map((buy) => buy.id));
  const allMatches: TradeLotMatchRecord[] = buyIds.size > 0
    ? await tx.query.tradeLotMatches.findMany({ where: eq(tradeLotMatches.userId, userId) })
    : [];
  const scopeMatches = allMatches.filter((match) => buyIds.has(match.buyTradeId));

  for (const buy of buys) {
    if (sellQtyRemaining <= ZERO_EPSILON) break;

    const buyQty = Number(buy.quantity);
    const matchesForBuy = scopeMatches.filter((match) => match.buyTradeId === buy.id);
    const matchedSoFar = matchesForBuy.reduce((sum, match) => sum + Number(match.matchedQuantity), 0);
    const openQty = buyQty - matchedSoFar;

    if (openQty <= ZERO_EPSILON) continue;

    const matchedQty = Math.min(openQty, sellQtyRemaining);
    const buyPrice = Number(buy.price);
    const matchedCost = matchedQty * buyPrice;
    const matchedProceeds = matchedQty * sellPrice;

    // Distribute the sell fee proportionally to the matched chunks.
    const feeProportion = matchedQty / quantity;
    const allocatedFee = sellFee * feeProportion;
    const realizedPnl = matchedProceeds - matchedCost - allocatedFee;

    await tx.insert(tradeLotMatches).values({
      userId,
      sellTradeId,
      buyTradeId: buy.id,
      matchedQuantity: matchedQty.toString(),
      buyPrice: buyPrice.toString(),
      sellPrice: sellPrice.toString(),
      matchedCost: matchedCost.toString(),
      matchedProceeds: matchedProceeds.toString(),
      realizedPnl: realizedPnl.toString(),
    });

    sellQtyRemaining -= matchedQty;
  }

  return { remaining: sellQtyRemaining };
}
