import { router } from '../trpc';
import { platformsRouter } from './platforms';
import { symbolsRouter } from './symbols';
import { tradesRouter } from './trades';
import { positionsRouter } from './positions';
import { performanceRouter } from './performance';
import { quotesRouter } from './quotes';
import { goalsRouter } from './goals';
import { capitalProgressRouter } from './capitalProgress';
import { shadowRouter } from './shadow';
import { rsiRouter } from './rsi';
import { tickerCatalogRouter } from './tickerCatalog';
import { dividendsRouter } from './dividends';
import { importsRouter } from './imports';

export const appRouter = router({
  platforms: platformsRouter,
  symbols: symbolsRouter,
  trades: tradesRouter,
  positions: positionsRouter,
  performance: performanceRouter,
  quotes: quotesRouter,
  goals: goalsRouter,
  capitalProgress: capitalProgressRouter,
  shadow: shadowRouter,
  rsi: rsiRouter,
  tickerCatalog: tickerCatalogRouter,
  dividends: dividendsRouter,
  imports: importsRouter,
});

export type AppRouter = typeof appRouter;
