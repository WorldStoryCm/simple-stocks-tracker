import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { trades, platforms, tradeLotMatches } from "@/db/schema";
import { rebuildFifoMatches, type FifoScope } from "./fifo";

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
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type TradeRecord = typeof trades.$inferSelect;

function scopeFor(trade: Pick<TradeRecord, "userId" | "platformId" | "symbolId">): FifoScope {
  return {
    userId: trade.userId,
    platformId: trade.platformId,
    symbolId: trade.symbolId,
  };
}

function scopesEqual(left: FifoScope, right: FifoScope) {
  return left.userId === right.userId
    && left.platformId === right.platformId
    && left.symbolId === right.symbolId;
}

async function getUserPlatform(tx: Tx, userId: string, platformId: string) {
  const platform = await tx.query.platforms.findFirst({
    where: and(eq(platforms.id, platformId), eq(platforms.userId, userId)),
  });
  if (!platform) throw new TRPCError({ code: "FORBIDDEN", message: "Platform not found" });
  return platform;
}

async function rebuildOrThrow(tx: Tx, scope: FifoScope) {
  const result = await rebuildFifoMatches(tx, scope);
  if (result.shortfall && result.shortfall.remaining > ZERO_EPSILON) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Insufficient open quantity to sell. Short by ${result.shortfall.remaining.toFixed(8)}`,
    });
  }
}

async function rebuildAffectedScopes(tx: Tx, scopes: FifoScope[]) {
  const rebuilt: FifoScope[] = [];
  for (const scope of scopes) {
    if (rebuilt.some((existing) => scopesEqual(existing, scope))) continue;
    await rebuildOrThrow(tx, scope);
    rebuilt.push(scope);
  }
}

export async function create(userId: string, input: TradeCreateInput) {
  const { platformId, symbolId, tradeType, tradeDate, quantity, price, fee, notes } = input;

  return await db.transaction(async (tx) => {
    const platform = await getUserPlatform(tx, userId, platformId);
    const currencyCode = platform.currencyCode;

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

    // 3. Rebuild the scope so backdated/manual edits keep FIFO matches current.
    await rebuildOrThrow(tx, { userId, platformId, symbolId });

    return trade;
  });
}

export async function update(userId: string, input: TradeUpdateInput) {
  const { id, platformId, symbolId, tradeType, tradeDate, quantity, price, fee, notes } = input;

  await db.transaction(async (tx) => {
    const existing = await tx.query.trades.findFirst({
      where: and(eq(trades.id, id), eq(trades.userId, userId)),
    });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Trade not found" });

    const platform = await getUserPlatform(tx, userId, platformId);
    const oldScope = scopeFor(existing);
    const newScope = { userId, platformId, symbolId };

    await tx.update(trades)
      .set({
        platformId,
        symbolId,
        tradeDate,
        tradeType,
        quantity,
        price,
        fee,
        currencyCode: platform.currencyCode,
        notes,
      })
      .where(and(eq(trades.id, id), eq(trades.userId, userId)));

    await tx.delete(tradeLotMatches)
      .where(and(eq(tradeLotMatches.userId, userId), eq(tradeLotMatches.sellTradeId, id)));

    await rebuildAffectedScopes(tx, [oldScope, newScope]);
  });

  return { success: true };
}

export async function remove(userId: string, id: string) {
  await db.transaction(async (tx) => {
    const existing = await tx.query.trades.findFirst({
      where: and(eq(trades.id, id), eq(trades.userId, userId)),
    });
    if (!existing) return;

    const oldScope = scopeFor(existing);
    await tx.delete(trades).where(and(eq(trades.id, id), eq(trades.userId, userId)));
    await rebuildOrThrow(tx, oldScope);
  });

  return true;
}
