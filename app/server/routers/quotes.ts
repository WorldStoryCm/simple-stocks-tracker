import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export const quotesRouter = router({
  getMany: protectedProcedure
    .input(z.object({ tickers: z.array(z.string()) }))
    .query(async ({ input }) => {
      const results: Record<string, { price: number; changePercent: number }> = {};
      
      if (input.tickers.length === 0) return results;

      try {
        const quotes = await yahooFinance.quote(input.tickers);
        const quotesArray = (Array.isArray(quotes) ? quotes : [quotes]) as any[];
        
        for (const q of quotesArray) {
          if (q && q.symbol) {
            results[q.symbol] = {
              price: q.regularMarketPrice || 0,
              changePercent: q.regularMarketChangePercent || 0
            };
          }
        }
      } catch (err) {
        console.error("Failed to fetch quotes", err);
      }

      return results;
    })
});
