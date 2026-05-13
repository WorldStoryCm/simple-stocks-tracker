import {
  getRsiForTickers,
  getLastSyncedAt,
  runBacktest,
  type TickerEntry,
} from "@/lib/rsi";

async function getMany(userId: string, tickers: TickerEntry[]) {
  return getRsiForTickers(userId, tickers);
}

async function lastSyncedAt(userId: string) {
  const syncedAt = await getLastSyncedAt(userId);
  return { syncedAt: syncedAt?.toISOString() ?? null };
}

async function backtest(ticker: string, rsiTicker: string | null | undefined) {
  return runBacktest(ticker, rsiTicker ?? null);
}

export const rsiService = { getMany, lastSyncedAt, backtest };
