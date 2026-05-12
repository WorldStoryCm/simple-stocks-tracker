import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { platforms, trades, tradeLotMatches } from "@/db/schema";

const ZERO_EPSILON = 0.0001;

export type PlatformCreateInput = {
  name: string;
  currencyCode: string;
  initialBalance?: string;
  notes?: string;
};

export type PlatformUpdateInput = {
  id: string;
  name: string;
  currencyCode: string;
  notes?: string;
  isActive: boolean;
};

export type AdjustCashInput = {
  id: string;
  amount: string;
  type: "deposit" | "withdrawal";
};

async function list(userId: string) {
  return db.query.platforms.findMany({
    where: eq(platforms.userId, userId),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });
}

async function create(userId: string, input: PlatformCreateInput) {
  const [platform] = await db.insert(platforms).values({
    userId,
    name: input.name,
    currencyCode: input.currencyCode,
    cashBalance: input.initialBalance ?? "0",
    notes: input.notes,
  }).returning();
  return platform;
}

/**
 * Refuse to archive a platform that still holds cash or open positions —
 * doing so would corrupt totals on the dashboard.
 */
async function assertSafeToArchive(userId: string, platformId: string) {
  const existing = await db.query.platforms.findFirst({
    where: and(eq(platforms.id, platformId), eq(platforms.userId, userId)),
  });
  if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Platform not found" });
  if (!existing.isActive) return existing;

  if (Number(existing.cashBalance) > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Withdraw the remaining ${existing.cashBalance} ${existing.currencyCode} before archiving "${existing.name}".`,
    });
  }

  const platformTrades = await db.query.trades.findMany({
    where: and(eq(trades.platformId, platformId), eq(trades.userId, userId)),
    columns: { id: true, tradeType: true, quantity: true },
  });
  const matches = await db.query.tradeLotMatches.findMany({
    where: eq(tradeLotMatches.userId, userId),
    columns: { buyTradeId: true, matchedQuantity: true },
  });
  const platformTradeIds = new Set(platformTrades.map((t) => t.id));

  let bought = 0;
  let sold = 0;
  for (const t of platformTrades) {
    if (t.tradeType === "buy") bought += Number(t.quantity);
  }
  for (const m of matches) {
    if (platformTradeIds.has(m.buyTradeId)) sold += Number(m.matchedQuantity);
  }
  if (bought - sold > ZERO_EPSILON) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Close all open positions before archiving "${existing.name}".`,
    });
  }

  return existing;
}

async function update(userId: string, input: PlatformUpdateInput) {
  if (!input.isActive) {
    await assertSafeToArchive(userId, input.id);
  }

  const [platform] = await db.update(platforms)
    .set({
      name: input.name,
      currencyCode: input.currencyCode,
      notes: input.notes,
      isActive: input.isActive,
    })
    .where(and(eq(platforms.id, input.id), eq(platforms.userId, userId)))
    .returning();
  return platform;
}

async function adjustCash(userId: string, input: AdjustCashInput) {
  const platform = await db.query.platforms.findFirst({
    where: and(eq(platforms.id, input.id), eq(platforms.userId, userId)),
  });
  if (!platform) throw new Error("Platform not found");

  const current = Number(platform.cashBalance);
  const delta = Number(input.amount);
  if (isNaN(delta) || delta <= 0) throw new Error("Amount must be positive");

  const newBalance = input.type === "deposit"
    ? current + delta
    : Math.max(0, current - delta);

  const [updated] = await db.update(platforms)
    .set({ cashBalance: newBalance.toFixed(2) })
    .where(and(eq(platforms.id, input.id), eq(platforms.userId, userId)))
    .returning();
  return updated;
}

export const platformsService = { list, create, update, adjustCash };
