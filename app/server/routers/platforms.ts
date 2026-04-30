import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { platforms, trades, tradeLotMatches } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const platformsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.query.platforms.findMany({
      where: eq(platforms.userId, ctx.session.user.id),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      currencyCode: z.string().default('USD'),
      initialBalance: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [platform] = await db.insert(platforms).values({
        userId: ctx.session.user.id,
        name: input.name,
        currencyCode: input.currencyCode,
        cashBalance: input.initialBalance ?? '0',
        notes: input.notes,
      }).returning();
      return platform;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      currencyCode: z.string(),
      notes: z.string().optional(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      if (!input.isActive) {
        const existing = await db.query.platforms.findFirst({
          where: and(eq(platforms.id, input.id), eq(platforms.userId, userId)),
        });
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Platform not found' });

        if (existing.isActive) {
          if (Number(existing.cashBalance) > 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Withdraw the remaining ${existing.cashBalance} ${existing.currencyCode} before archiving "${existing.name}".`,
            });
          }

          const platformTrades = await db.query.trades.findMany({
            where: and(eq(trades.platformId, input.id), eq(trades.userId, userId)),
            columns: { id: true, tradeType: true, quantity: true },
          });
          const matches = await db.query.tradeLotMatches.findMany({
            where: eq(tradeLotMatches.userId, userId),
            columns: { buyTradeId: true, matchedQuantity: true },
          });
          const platformTradeIds = new Set(platformTrades.map(t => t.id));
          let bought = 0;
          let sold = 0;
          for (const t of platformTrades) {
            if (t.tradeType === 'buy') bought += Number(t.quantity);
          }
          for (const m of matches) {
            if (platformTradeIds.has(m.buyTradeId)) sold += Number(m.matchedQuantity);
          }
          if (bought - sold > 0.0001) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Close all open positions before archiving "${existing.name}".`,
            });
          }
        }
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
    }),

  /**
   * Manually deposit or withdraw cash.
   * Withdrawal is clamped to the available balance (can't withdraw into negative).
   */
  adjustCash: protectedProcedure
    .input(z.object({
      id: z.string(),
      amount: z.string(),           // positive number as string
      type: z.enum(['deposit', 'withdrawal']),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const platform = await db.query.platforms.findFirst({
        where: and(eq(platforms.id, input.id), eq(platforms.userId, userId)),
      });
      if (!platform) throw new Error('Platform not found');

      const current = Number(platform.cashBalance);
      const delta = Number(input.amount);
      if (isNaN(delta) || delta <= 0) throw new Error('Amount must be positive');

      let newBalance: number;
      if (input.type === 'deposit') {
        newBalance = current + delta;
      } else {
        newBalance = Math.max(0, current - delta);
      }

      const [updated] = await db.update(platforms)
        .set({ cashBalance: newBalance.toFixed(2) })
        .where(and(eq(platforms.id, input.id), eq(platforms.userId, userId)))
        .returning();
      return updated;
    }),
});
