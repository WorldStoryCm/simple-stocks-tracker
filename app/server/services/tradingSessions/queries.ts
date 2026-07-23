import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { tradingSessions } from "@/db/schema";
import { getExchangeRates } from "@/lib/exchange-rates";

export async function list(userId: string) {
  return db.query.tradingSessions.findMany({
    where: eq(tradingSessions.userId, userId),
    orderBy: [desc(tradingSessions.startedAt), desc(tradingSessions.createdAt)],
    with: {
      platform: true,
      symbol: true,
      events: true,
    },
  });
}

export async function get(userId: string, id: string) {
  const session = await db.query.tradingSessions.findFirst({
    where: and(eq(tradingSessions.id, id), eq(tradingSessions.userId, userId)),
    with: {
      platform: true,
      symbol: true,
      openingLots: true,
      events: true,
    },
  });
  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Trading session not found" });
  }
  return session;
}

export async function fxRate() {
  const rates = await getExchangeRates();
  return { usdPerEur: rates.EUR ?? 1 };
}
