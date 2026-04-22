import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { getRsiForTickers, getLastSyncedAt } from "@/lib/rsi";

export const rsiRouter = router({
  /**
   * Returns RSI values for a list of tickers.
   * Results are cached in the DB; stale entries are refreshed automatically.
   */
  getMany: protectedProcedure
    .input(z.object({ tickers: z.array(z.string().min(1)).min(1).max(50) }))
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
});
