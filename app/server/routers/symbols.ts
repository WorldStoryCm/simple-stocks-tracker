import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { symbols } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const symbolsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.query.symbols.findMany({
      where: eq(symbols.userId, ctx.session.user.id),
      orderBy: (s, { asc }) => [asc(s.ticker)],
    });
  }),
  create: protectedProcedure
    .input(z.object({
      ticker: z.string().min(1).toUpperCase(),
      displayName: z.string().optional(),
      exchange: z.string().optional(),
      currencyCode: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [symbol] = await db.insert(symbols).values({
        userId: ctx.session.user.id,
        ticker: input.ticker,
        displayName: input.displayName,
        exchange: input.exchange,
        currencyCode: input.currencyCode,
        notes: input.notes,
      }).returning();
      return symbol;
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      ticker: z.string().min(1).toUpperCase(),
      displayName: z.string().optional(),
      exchange: z.string().optional(),
      currencyCode: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [symbol] = await db.update(symbols)
        .set({
          ticker: input.ticker,
          displayName: input.displayName,
          exchange: input.exchange,
          currencyCode: input.currencyCode,
          notes: input.notes,
        })
        .where(and(eq(symbols.id, input.id), eq(symbols.userId, ctx.session.user.id)))
        .returning();
      return symbol;
    }),
});
