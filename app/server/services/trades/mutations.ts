import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { trades, platforms } from "@/db/schema";
import { applyFifoMatch } from "./fifo";

export type TradeCreateInput = {
  platformId: string;
  symbolId: string;
  tradeType: "buy" | "sell";
  tradeDate: string;
  quantity: string;
  price: string;
  fee: string;
  notes?: string;
};

export type TradeUpdateInput = TradeCreateInput & { id: string };

const ZERO_EPSILON = 0.000001;

export async function create(userId: string, input: TradeCreateInput) {
  const { platformId, symbolId, tradeType, tradeDate, quantity, price, fee, notes } = input;

  // Resolve platform currency + current cash balance
  const platform = await db.query.platforms.findFirst({
    where: and(eq(platforms.id, platformId), eq(platforms.userId, userId)),
  });
  if (!platform) throw new TRPCError({ code: "FORBIDDEN", message: "Platform not found" });
  const currencyCode = platform.currencyCode;

  return await db.transaction(async (tx) => {
    // 1. Insert the trade
    const [trade] = await tx.insert(trades).values({
      userId,
      platformId,
      symbolId,
      tradeType,
      tradeDate,
      quantity,
      price,
      fee,
      currencyCode,
      notes,
    }).returning();

    // 2. Update platform cash balance
    // Buy: deduct cost (auto-fund the gap if insufficient so balance stays >= 0)
    // Sell: credit net proceeds
    const currentBalance = Number(platform.cashBalance);
    const cost = Number(quantity) * Number(price) + Number(fee);
    const proceeds = Number(quantity) * Number(price) - Number(fee);
    const newBalance = tradeType === "buy"
      ? Math.max(0, currentBalance - cost)
      : currentBalance + proceeds;

    await tx.update(platforms)
      .set({ cashBalance: newBalance.toFixed(2) })
      .where(and(eq(platforms.id, platformId), eq(platforms.userId, userId)));

    // 3. If Sell, run FIFO matching against open lots.
    if (tradeType === "sell") {
      const { remaining } = await applyFifoMatch(tx, {
        userId,
        sellTradeId: trade.id,
        platformId,
        symbolId,
        quantity: Number(quantity),
        sellPrice: Number(price),
        sellFee: Number(fee),
      });

      if (remaining > ZERO_EPSILON) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient open quantity to sell. Short by ${remaining}`,
        });
      }
    }

    return trade;
  });
}

export async function update(userId: string, input: TradeUpdateInput) {
  const { id, platformId, symbolId, tradeType, tradeDate, quantity, price, fee, notes } = input;

  await db.update(trades)
    .set({
      platformId,
      symbolId,
      tradeDate,
      tradeType,
      quantity,
      price,
      fee,
      notes,
    })
    .where(and(eq(trades.id, id), eq(trades.userId, userId)));

  return { success: true };
}

export async function remove(userId: string, id: string) {
  // Cascade will clean tradeLotMatches; deleting a matched buy can unbalance the
  // sell side, but v1 accepts this — caller is expected to re-enter affected sells.
  await db.delete(trades).where(and(eq(trades.id, id), eq(trades.userId, userId)));
  return true;
}
