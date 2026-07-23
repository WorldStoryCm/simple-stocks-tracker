import { and, asc, eq, inArray } from "drizzle-orm";
import { trades, tradeLotMatches } from "@/db/schema";
import type { db } from "@/db/drizzle";

const ZERO_EPSILON = 0.000001;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CostBasisScope = {
  userId: string;
  platformId: string;
  symbolId: string;
};

export type CostBasisTrade = {
  id: string;
  tradeType: "buy" | "sell";
  quantity: string | number;
  price: string | number;
  fee: string | number;
  tradeDate?: string;
  executedAt?: string | null;
  executionOrder?: number | null;
  createdAt?: Date | string;
};

export type CostBasisMatchDraft = {
  sellTradeId: string;
  buyTradeId: string;
  matchedQuantity: string;
  buyPrice: string;
  sellPrice: string;
  matchedCost: string;
  matchedProceeds: string;
  realizedPnl: string;
};

type CostBasisCalculation = {
  matches: CostBasisMatchDraft[];
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

function compareValue(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function costBasisTypeRank(trade: CostBasisTrade) {
  return trade.tradeType === "buy" ? 0 : 1;
}

export function compareCostBasisTrades(left: CostBasisTrade, right: CostBasisTrade) {
  const dateCompare = compareValue(left.tradeDate ?? "", right.tradeDate ?? "");
  if (dateCompare) return dateCompare;

  if (left.executedAt || right.executedAt) {
    const fallback = `${left.tradeDate ?? ""}T00:00:00`;
    const executionCompare = compareValue(left.executedAt ?? fallback, right.executedAt ?? fallback);
    if (executionCompare) return executionCompare;
  }

  if (left.executionOrder != null && right.executionOrder != null) {
    const orderCompare = left.executionOrder - right.executionOrder;
    if (orderCompare) return orderCompare;
  }

  return costBasisTypeRank(left) - costBasisTypeRank(right)
    || compareValue(
      left.createdAt instanceof Date ? left.createdAt.toISOString() : String(left.createdAt ?? ""),
      right.createdAt instanceof Date ? right.createdAt.toISOString() : String(right.createdAt ?? ""),
    )
    || compareValue(left.id, right.id);
}

export function calculateAverageCostMatches(orderedTrades: CostBasisTrade[]): CostBasisCalculation {
  const lots: { trade: CostBasisTrade; remainingQty: number }[] = [];
  const matches: CostBasisMatchDraft[] = [];
  let positionQty = 0;
  let positionCost = 0;

  for (const trade of orderedTrades) {
    const quantity = Number(trade.quantity);
    const price = Number(trade.price);
    const fee = Number(trade.fee);

    if (trade.tradeType === "buy") {
      lots.push({ trade, remainingQty: quantity });
      positionQty += quantity;
      positionCost += quantity * price + fee;
      continue;
    }

    if (quantity > positionQty + ZERO_EPSILON) {
      return {
        matches,
        shortfall: {
          sellTradeId: trade.id,
          remaining: quantity - positionQty,
        },
      };
    }

    const averageCost = positionCost / positionQty;
    let sellQtyRemaining = quantity;

    for (const lot of lots) {
      if (sellQtyRemaining <= ZERO_EPSILON) break;
      if (lot.remainingQty <= ZERO_EPSILON) continue;

      const matchedQty = Math.min(lot.remainingQty, sellQtyRemaining);
      const matchedCost = matchedQty * averageCost;
      const matchedProceeds = matchedQty * price;
      const allocatedFee = fee * (matchedQty / quantity);
      const realizedPnl = matchedProceeds - matchedCost - allocatedFee;

      matches.push({
        sellTradeId: trade.id,
        buyTradeId: lot.trade.id,
        matchedQuantity: formatQuantity(matchedQty),
        buyPrice: formatPrice(averageCost),
        sellPrice: formatPrice(price),
        matchedCost: formatMoney(matchedCost),
        matchedProceeds: formatMoney(matchedProceeds),
        realizedPnl: formatMoney(realizedPnl),
      });

      lot.remainingQty -= matchedQty;
      sellQtyRemaining -= matchedQty;
    }

    positionQty -= quantity;
    positionCost -= quantity * averageCost;
    if (positionQty <= ZERO_EPSILON) {
      positionQty = 0;
      positionCost = 0;
    }
  }

  return { matches };
}

export async function rebuildAverageCostMatches(tx: Tx, scope: CostBasisScope) {
  const scopeTrades = (await tx.query.trades.findMany({
    where: and(
      eq(trades.userId, scope.userId),
      eq(trades.platformId, scope.platformId),
      eq(trades.symbolId, scope.symbolId),
    ),
    orderBy: [
      asc(trades.tradeDate),
      asc(trades.executedAt),
      asc(trades.executionOrder),
      asc(trades.createdAt),
      asc(trades.id),
    ],
  })).sort(compareCostBasisTrades);

  const sellIds = scopeTrades
    .filter((trade) => trade.tradeType === "sell")
    .map((trade) => trade.id);

  if (sellIds.length > 0) {
    await tx
      .delete(tradeLotMatches)
      .where(and(eq(tradeLotMatches.userId, scope.userId), inArray(tradeLotMatches.sellTradeId, sellIds)));
  }

  const result = calculateAverageCostMatches(scopeTrades);
  if (result.shortfall || result.matches.length === 0) return result;

  await tx.insert(tradeLotMatches).values(
    result.matches.map((match) => ({
      userId: scope.userId,
      ...match,
    })),
  );

  return result;
}
