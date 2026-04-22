import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { symbols } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Pull sector/industry for a ticker from Yahoo's assetProfile module.
async function fetchAssetProfile(ticker: string): Promise<{ sector: string | null; industry: string | null }> {
  try {
    const summary = await yahooFinance.quoteSummary(ticker, { modules: ['assetProfile'] }) as any;
    const profile = summary?.assetProfile;
    return {
      sector: profile?.sector || null,
      industry: profile?.industry || null,
    };
  } catch (err) {
    console.error(`Failed to fetch assetProfile for ${ticker}`, err);
    return { sector: null, industry: null };
  }
}

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
      sector: z.string().optional(),
      industry: z.string().optional(),
      rsiTicker: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If user supplied sector/industry manually, respect it. Otherwise fall
      // back to Yahoo assetProfile so the Dashboard pie is populated immediately.
      const userSector = input.sector?.trim();
      const userIndustry = input.industry?.trim();
      let sector: string | null = userSector || null;
      let industry: string | null = userIndustry || null;
      let fromYahoo = false;
      if (!userSector && !userIndustry) {
        const profile = await fetchAssetProfile(input.ticker);
        sector = profile.sector;
        industry = profile.industry;
        fromYahoo = !!(profile.sector || profile.industry);
      }
      const [symbol] = await db.insert(symbols).values({
        userId: ctx.session.user.id,
        ticker: input.ticker,
        displayName: input.displayName,
        exchange: input.exchange,
        currencyCode: input.currencyCode,
        sector,
        industry,
        metadataSyncedAt: (userSector || userIndustry || fromYahoo) ? new Date() : null,
        rsiTicker: input.rsiTicker?.trim().toUpperCase() || null,
        notes: input.notes,
      }).returning();
      return symbol;
    }),
  enrichAll: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const mySymbols = await db.query.symbols.findMany({ where: eq(symbols.userId, userId) });

    let updated = 0;
    let failed = 0;
    // Sequential to be polite to Yahoo's endpoint and keep memory bounded.
    for (const s of mySymbols) {
      const profile = await fetchAssetProfile(s.ticker);
      if (profile.sector || profile.industry) {
        await db.update(symbols)
          .set({ sector: profile.sector, industry: profile.industry, metadataSyncedAt: new Date() })
          .where(and(eq(symbols.id, s.id), eq(symbols.userId, userId)));
        updated++;
      } else {
        failed++;
      }
    }
    return { total: mySymbols.length, updated, failed };
  }),
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      ticker: z.string().min(1).toUpperCase(),
      displayName: z.string().optional(),
      exchange: z.string().optional(),
      currencyCode: z.string().optional(),
      sector: z.string().optional(),
      industry: z.string().optional(),
      rsiTicker: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [symbol] = await db.update(symbols)
        .set({
          ticker: input.ticker,
          displayName: input.displayName,
          exchange: input.exchange,
          currencyCode: input.currencyCode,
          sector: input.sector?.trim() ? input.sector.trim() : null,
          industry: input.industry?.trim() ? input.industry.trim() : null,
          rsiTicker: input.rsiTicker?.trim().toUpperCase() || null,
          notes: input.notes,
        })
        .where(and(eq(symbols.id, input.id), eq(symbols.userId, ctx.session.user.id)))
        .returning();
      return symbol;
    }),
});
