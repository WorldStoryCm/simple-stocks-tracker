import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db/drizzle";
import { cashEvents, importBatches, importRows, platforms, tradeLotMatches, trades } from "@/db/schema";

type BatchSummary = {
  cashBalanceDelta?: number;
  rolledBackAt?: string;
  [key: string]: unknown;
};

function parseSummary(summaryJson: string | null): BatchSummary {
  if (!summaryJson) return {};
  try {
    return JSON.parse(summaryJson) as BatchSummary;
  } catch {
    return {};
  }
}

export async function rollback(userId: string, batchId: string) {
  return db.transaction(async (tx) => {
    const batch = await tx.query.importBatches.findFirst({
      where: and(eq(importBatches.id, batchId), eq(importBatches.userId, userId)),
    });
    if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
    if (batch.status === "rolled_back") {
      return { tradeRowsDeleted: 0, cashEventsDeleted: 0, status: "already_rolled_back" as const };
    }

    const rows = await tx.query.importRows.findMany({
      where: and(eq(importRows.batchId, batchId), eq(importRows.status, "imported")),
    });
    const rowByTradeId = new Map(rows.filter((row) => row.matchedTradeId).map((row) => [row.matchedTradeId!, row]));
    const rowByCashEventId = new Map(rows.filter((row) => row.matchedCashEventId).map((row) => [row.matchedCashEventId!, row]));
    const tradeIds = [...rowByTradeId.keys()];
    const cashEventIds = [...rowByCashEventId.keys()];

    let safeTradeIds: string[] = [];
    if (tradeIds.length > 0) {
      const importedTrades = await tx.query.trades.findMany({
        where: and(eq(trades.userId, userId), inArray(trades.id, tradeIds)),
      });
      safeTradeIds = importedTrades
        .filter((trade) => {
          const row = rowByTradeId.get(trade.id);
          return trade.sourceSystem === batch.sourceSystem && trade.sourceRowHash === row?.rowHash;
        })
        .map((trade) => trade.id);

      const safeTradeIdSet = new Set(safeTradeIds);
      const matches = await tx.query.tradeLotMatches.findMany({ where: eq(tradeLotMatches.userId, userId) });
      const dependentMatches = matches.filter(
        (match) => safeTradeIdSet.has(match.buyTradeId) && !safeTradeIdSet.has(match.sellTradeId),
      );
      if (dependentMatches.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Rollback blocked because imported buy lots are used by later non-imported sells.",
        });
      }
    }

    let safeCashEventIds: string[] = [];
    if (cashEventIds.length > 0) {
      const importedEvents = await tx.query.cashEvents.findMany({
        where: and(eq(cashEvents.userId, userId), inArray(cashEvents.id, cashEventIds)),
      });
      safeCashEventIds = importedEvents
        .filter((event) => {
          const row = rowByCashEventId.get(event.id);
          return event.sourceSystem === batch.sourceSystem && event.sourceRowHash === row?.rowHash;
        })
        .map((event) => event.id);
    }

    if (safeTradeIds.length > 0) {
      await tx.delete(trades).where(and(eq(trades.userId, userId), inArray(trades.id, safeTradeIds)));
    }
    if (safeCashEventIds.length > 0) {
      await tx.delete(cashEvents).where(and(eq(cashEvents.userId, userId), inArray(cashEvents.id, safeCashEventIds)));
    }

    const summary = parseSummary(batch.summaryJson);
    const cashBalanceDelta = Number(summary.cashBalanceDelta ?? 0);
    if (cashBalanceDelta !== 0) {
      const platform = await tx.query.platforms.findFirst({
        where: and(eq(platforms.id, batch.platformId), eq(platforms.userId, userId)),
      });
      if (platform) {
        const nextBalance = Math.max(0, Number(platform.cashBalance) - cashBalanceDelta);
        await tx.update(platforms)
          .set({ cashBalance: nextBalance.toFixed(2) })
          .where(and(eq(platforms.id, batch.platformId), eq(platforms.userId, userId)));
      }
    }

    await tx.update(importBatches)
      .set({
        status: "rolled_back",
        summaryJson: JSON.stringify({ ...summary, rolledBackAt: new Date().toISOString() }),
      })
      .where(and(eq(importBatches.id, batchId), eq(importBatches.userId, userId)));

    return {
      tradeRowsDeleted: safeTradeIds.length,
      cashEventsDeleted: safeCashEventIds.length,
      status: "rolled_back" as const,
    };
  });
}
