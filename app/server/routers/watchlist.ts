import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { watchlistItems, watchlistTags, watchlistItemTags, symbols, platforms } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const watchlistRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    // For V1 simple list
    const items = await db.select({
      id: watchlistItems.id,
      symbol: symbols.ticker,
      platform: platforms.name,
      thesis: watchlistItems.thesis,
      targetBuyPrice: watchlistItems.targetBuyPrice,
      status: watchlistItems.status,
    })
    .from(watchlistItems)
    .innerJoin(symbols, eq(watchlistItems.symbolId, symbols.id))
    .leftJoin(platforms, eq(watchlistItems.platformId, platforms.id))
    .where(eq(watchlistItems.userId, userId));

    return items;
  }),
  
  create: protectedProcedure
    .input(z.object({
      symbolId: z.string(),
      platformId: z.string().optional(),
      thesis: z.string().optional(),
      targetBuyPrice: z.string().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await db.insert(watchlistItems).values({
        userId: ctx.session.user.id,
        symbolId: input.symbolId,
        platformId: input.platformId,
        thesis: input.thesis,
        targetBuyPrice: input.targetBuyPrice || null,
        notes: input.notes
      }).returning();
      return item;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(watchlistItems).where(
        and(eq(watchlistItems.id, input.id), eq(watchlistItems.userId, ctx.session.user.id))
      );
      return { success: true };
    })
});
