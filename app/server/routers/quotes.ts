import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { quotesService } from '../services/quotes';

export const quotesRouter = router({
  getMany: protectedProcedure
    .input(z.object({ tickers: z.array(z.string()) }))
    .query(({ input }) => quotesService.getMany(input.tickers)),
});
