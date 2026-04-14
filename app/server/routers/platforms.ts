import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { platforms } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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
      const [platform] = await db.update(platforms)
        .set({
          name: input.name,
          currencyCode: input.currencyCode,
          notes: input.notes,
          isActive: input.isActive,
        })
        .where(and(eq(platforms.id, input.id), eq(platforms.userId, ctx.session.user.id)))
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
