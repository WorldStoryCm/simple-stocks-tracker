import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { getRsiForTickers, getLastSyncedAt, runBacktest } from "@/lib/rsi";

const tickerEntrySchema = z.object({
  ticker: z.string().min(1),
  rsiTicker: z.string().min(1).nullable().optional(),
});

export const rsiRouter = router({
  /**
   * Returns RSI values for a list of tickers.
   * Results are cached in the DB; stale entries are refreshed automatically.
   * Each entry may include an optional rsiTicker alias used as fallback when
   * the primary ticker is not found by the data source.
   */
  getMany: protectedProcedure
    .input(z.object({ tickers: z.array(tickerEntrySchema).min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const results = await getRsiForTickers(userId, input.tickers);
      return results;
    }),

  /**
   * Returns the last time any RSI snapshot was synced for the current user.
   * Used for the header "Last sync was ..." status.
   */
  lastSyncedAt: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const syncedAt = await getLastSyncedAt(userId);
    return { syncedAt: syncedAt?.toISOString() ?? null };
  }),

  /**
   * Runs an RSI-below-35 crossing backtest for a single ticker over ~400 daily closes.
   * Uses the rsiTicker alias as a fallback if the primary ticker isn't recognised.
   */
  backtest: protectedProcedure
    .input(z.object({
      ticker: z.string().min(1),
      rsiTicker: z.string().min(1).nullable().optional(),
    }))
    .query(async ({ input }) => {
      return runBacktest(input.ticker, input.rsiTicker ?? null);
    }),
});
