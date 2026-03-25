import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { platforms } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [platform] = await db.insert(platforms).values({
        userId: ctx.session.user.id,
        name: input.name,
        currencyCode: input.currencyCode,
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
});
