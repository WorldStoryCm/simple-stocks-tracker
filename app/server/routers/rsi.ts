import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { rsiService } from "../services/rsi";

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
    .query(({ ctx, input }) => rsiService.getMany(ctx.session.user.id, input.tickers)),

  /**
   * Returns the last time any RSI snapshot was synced for the current user.
   * Used for the header "Last sync was ..." status.
   */
  lastSyncedAt: protectedProcedure.query(({ ctx }) => rsiService.lastSyncedAt(ctx.session.user.id)),

  /**
   * Runs an RSI-below-35 crossing backtest for a single ticker over ~400 daily closes.
   * Uses the rsiTicker alias as a fallback if the primary ticker isn't recognised.
   */
  backtest: protectedProcedure
    .input(z.object({
      ticker: z.string().min(1),
      rsiTicker: z.string().min(1).nullable().optional(),
    }))
    .query(({ input }) => rsiService.backtest(input.ticker, input.rsiTicker)),
});
