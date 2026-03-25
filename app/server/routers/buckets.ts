import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { buckets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const bucketsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.query.buckets.findMany({
      where: eq(buckets.userId, ctx.session.user.id),
      orderBy: (b, { asc }) => [asc(b.sortOrder)],
    });
  }),
  initializeDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    // Insert if they don't exist
    const current = await db.query.buckets.findMany({
      where: eq(buckets.userId, ctx.session.user.id),
    });
    if (current.length === 0) {
      await db.insert(buckets).values([
        { userId: ctx.session.user.id, key: 'short_term', label: 'Short Term', sortOrder: '1' },
        { userId: ctx.session.user.id, key: 'mid_term', label: 'Mid Term', sortOrder: '2' },
        { userId: ctx.session.user.id, key: 'long_term', label: 'Long Term', sortOrder: '3' },
      ]);
    }
    return true;
  }),
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      label: z.string().min(1),
      budgetAmount: z.string(), // decimal string
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [bucket] = await db.update(buckets)
        .set({
          label: input.label,
          budgetAmount: input.budgetAmount,
          isActive: input.isActive,
        })
        .where(and(eq(buckets.id, input.id), eq(buckets.userId, ctx.session.user.id)))
        .returning();
      return bucket;
    }),
});
