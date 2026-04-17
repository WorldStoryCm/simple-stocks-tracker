import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { getLiveQuotes } from '@/lib/live-quotes';

export const quotesRouter = router({
  getMany: protectedProcedure
    .input(z.object({ tickers: z.array(z.string()) }))
    .query(async ({ input }) => getLiveQuotes(input.tickers)),
});
