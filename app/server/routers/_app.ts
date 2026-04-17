import { router } from '../trpc';
import { platformsRouter } from './platforms';
import { symbolsRouter } from './symbols';
import { bucketsRouter } from './buckets';
import { tradesRouter } from './trades';
import { positionsRouter } from './positions';
import { performanceRouter } from './performance';
import { watchlistRouter } from './watchlist';
import { quotesRouter } from './quotes';
import { goalsRouter } from './goals';
import { capitalProgressRouter } from './capitalProgress';

export const appRouter = router({
  platforms: platformsRouter,
  symbols: symbolsRouter,
  buckets: bucketsRouter,
  trades: tradesRouter,
  positions: positionsRouter,
  performance: performanceRouter,
  watchlist: watchlistRouter,
  quotes: quotesRouter,
  goals: goalsRouter,
  capitalProgress: capitalProgressRouter,
});

export type AppRouter = typeof appRouter;
