import { and, asc, eq } from "drizzle-orm";
import { trades, tradeLotMatches } from "@/db/schema";

const ZERO_EPSILON = 0.000001;

/**
 * Match a freshly inserted sell trade against existing buy lots in FIFO order,
 * inserting `tradeLotMatches` rows that record realized P/L. Throws if there
 * isn't enough open quantity to cover the sell.
 *
 * Must run inside a transaction (`tx`).
 */
export async function applyFifoMatch(
  tx: any,
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
    orderBy: [asc(trades.tradeDate), asc(trades.createdAt)],
  });

  // Pre-load existing matches for these buys so we can compute open qty per lot.
  const buyIds = new Set(buys.map((b: any) => b.id));
  const allMatches = buyIds.size > 0
    ? await tx.query.tradeLotMatches.findMany({ where: eq(tradeLotMatches.userId, userId) })
    : [];
  const scopeMatches = allMatches.filter((m: any) => buyIds.has(m.buyTradeId));

  for (const buy of buys) {
    if (sellQtyRemaining <= ZERO_EPSILON) break;

    const buyQty = Number(buy.quantity);
    const matchesForBuy = scopeMatches.filter((m: any) => m.buyTradeId === buy.id);
    const matchedSoFar = matchesForBuy.reduce((sum: number, m: any) => sum + Number(m.matchedQuantity), 0);
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
