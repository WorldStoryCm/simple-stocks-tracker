import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import {
  platforms,
  symbols,
  tradingSessionEvents,
  tradingSessionOpeningLots,
  tradingSessions,
} from "@/db/schema";
import { replaySession } from "@/lib/trading-sessions/calculations";
import { snapshotCurrentPosition } from "./snapshot";
import type { TradingSessionCreateInput, TradingSessionEventInput } from "./types";

async function verifyScope(userId: string, platformId: string, symbolId: string) {
  const [platform, symbol] = await Promise.all([
    db.query.platforms.findFirst({
      where: and(eq(platforms.id, platformId), eq(platforms.userId, userId)),
    }),
    db.query.symbols.findFirst({
      where: and(eq(symbols.id, symbolId), eq(symbols.userId, userId)),
    }),
  ]);
  if (!platform || !symbol) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Platform or symbol not found" });
  }
  return { platform, symbol };
}

function manualSnapshot(input: TradingSessionCreateInput) {
  const quantity = Number(input.openingQuantity);
  const averageCost = Number(input.openingAverageCost);
  if (!(quantity > 0) || !(averageCost > 0)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Enter an opening quantity and average cost greater than zero.",
    });
  }
  return {
    quantity: quantity.toFixed(8),
    totalCost: (quantity * averageCost).toFixed(4),
    lots: [{ quantity: quantity.toFixed(8), unitPrice: averageCost.toFixed(4) }],
  };
}

export async function create(userId: string, input: TradingSessionCreateInput) {
  const { platform } = await verifyScope(userId, input.platformId, input.symbolId);
  const snapshot = input.openingSource === "position"
    ? await snapshotCurrentPosition(userId, input.platformId, input.symbolId)
    : manualSnapshot(input);

  return db.transaction(async (tx) => {
    const [session] = await tx.insert(tradingSessions).values({
      userId,
      platformId: input.platformId,
      symbolId: input.symbolId,
      openingSource: input.openingSource,
      openingQuantity: snapshot.quantity,
      openingTotalCost: snapshot.totalCost,
      openingMarketPrice: input.openingMarketPrice,
      currencyCode: platform.currencyCode,
      startedAt: new Date(input.startedAt),
      notes: input.notes,
    }).returning();

    if (snapshot.lots.length > 0) {
      await tx.insert(tradingSessionOpeningLots).values(
        snapshot.lots.map((lot) => ({ sessionId: session.id, ...lot })),
      );
    }
    return session;
  });
}

async function activeSession(userId: string, id: string) {
  const session = await db.query.tradingSessions.findFirst({
    where: and(eq(tradingSessions.id, id), eq(tradingSessions.userId, userId)),
    with: { events: true },
  });
  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Trading session not found" });
  }
  if (session.status !== "active") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Closed sessions cannot be changed." });
  }
  return session;
}

function validateReplay(
  session: Awaited<ReturnType<typeof activeSession>>,
  events: (typeof tradingSessionEvents.$inferSelect)[],
) {
  const result = replaySession({
    quantity: session.openingQuantity,
    totalCost: session.openingTotalCost,
    marketPrice: session.openingMarketPrice,
  }, events, Number(session.openingMarketPrice));
  if (result.shortfall) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `This sell exceeds the available session quantity by ${result.shortfall.quantity.toFixed(8)}.`,
    });
  }
}

export async function addEvent(userId: string, input: TradingSessionEventInput) {
  const session = await activeSession(userId, input.sessionId);
  const draft = {
    id: crypto.randomUUID(),
    sessionId: input.sessionId,
    eventType: input.eventType,
    executedAt: new Date(input.executedAt),
    quantity: input.quantity,
    price: input.price,
    fee: input.fee,
    notes: input.notes ?? null,
    createdAt: new Date(),
  };
  validateReplay(session, [...session.events, draft]);
  const [event] = await db.insert(tradingSessionEvents).values(draft).returning();
  return event;
}

export async function deleteEvent(userId: string, id: string) {
  const existing = await db.query.tradingSessionEvents.findFirst({
    where: eq(tradingSessionEvents.id, id),
  });
  if (!existing) return { success: true };
  const session = await activeSession(userId, existing.sessionId);
  validateReplay(session, session.events.filter((event) => event.id !== id));
  await db.delete(tradingSessionEvents).where(eq(tradingSessionEvents.id, id));
  return { success: true };
}

export async function close(userId: string, id: string, endedAt: string) {
  const session = await activeSession(userId, id);
  const [updated] = await db.update(tradingSessions)
    .set({ status: "closed", endedAt: new Date(endedAt) })
    .where(and(eq(tradingSessions.id, session.id), eq(tradingSessions.userId, userId)))
    .returning();
  return updated;
}
