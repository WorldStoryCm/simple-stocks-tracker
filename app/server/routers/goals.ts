import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { goals } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

const GOAL_TYPES = ['monthly_profit', 'yearly_profit'] as const;
type GoalType = typeof GOAL_TYPES[number];

export const goalsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.query.goals.findMany({
      where: and(
        eq(goals.userId, ctx.session.user.id),
        eq(goals.isActive, true)
      ),
    });
  }),

  upsert: protectedProcedure
    .input(z.object({
      goalType: z.enum(GOAL_TYPES),
      amount: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Find existing active goal of this type
      const existing = await db.query.goals.findFirst({
        where: and(eq(goals.userId, userId), eq(goals.goalType, input.goalType), eq(goals.isActive, true)),
      });

      if (existing) {
        await db.update(goals)
          .set({ amount: input.amount, updatedAt: new Date() })
          .where(eq(goals.id, existing.id));
        return { id: existing.id };
      }

      const [created] = await db.insert(goals).values({
        userId,
        goalType: input.goalType,
        amount: input.amount,
        isActive: true,
      }).returning({ id: goals.id });

      return created;
    }),

  delete: protectedProcedure
    .input(z.object({ goalType: z.enum(GOAL_TYPES) }))
    .mutation(async ({ ctx, input }) => {
      await db.update(goals)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(goals.userId, ctx.session.user.id),
          eq(goals.goalType, input.goalType),
          eq(goals.isActive, true),
        ));
      return { success: true };
    }),
});
