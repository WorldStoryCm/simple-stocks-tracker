/**
 * RSI service — fetches, calculates, and caches RSI-14 per user/ticker.
 * Single source of truth for all RSI data in the product.
 */

import { db } from "@/db/drizzle";
import { indicatorSnapshots } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

const PERIOD = 14;
const STALE_MINUTES = 30;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RsiState =
  | "oversold"
  | "near_oversold"
  | "neutral"
  | "near_overbought"
  | "overbought";

export type RsiError = "not_found" | "fetch_failed" | "insufficient_data";

export interface RsiResult {
  ticker: string;
  rsi: number | null;
  state: RsiState | null;
  syncedAt: Date | null;
  /** Up to 3 most-recent daily RSI values (oldest → newest); includes `rsi` as final entry. */
  history: number[];
  error?: RsiError;
  /** Set when RSI was fetched via an alias ticker rather than the primary ticker */
  via?: string;
}

const HISTORY_POINTS = 3;

const RSI_ERROR_LABELS: Record<RsiError, string> = {
  not_found: "Ticker not found",
  fetch_failed: "Data source unavailable",
  insufficient_data: "Not enough history",
};

export function rsiErrorLabel(error: RsiError): string {
  return RSI_ERROR_LABELS[error];
}

// ---------------------------------------------------------------------------
// State classification
// ---------------------------------------------------------------------------

export function classifyRsi(rsi: number): RsiState {
  if (rsi <= 30) return "oversold";
  if (rsi <= 40) return "near_oversold";
  if (rsi <= 60) return "neutral";
  if (rsi <= 70) return "near_overbought";
  return "overbought";
}

export const RSI_STATE_LABELS: Record<RsiState, string> = {
  oversold: "Oversold",
  near_oversold: "Near Oversold",
  neutral: "Neutral",
  near_overbought: "Near Overbought",
  overbought: "Overbought",
};

// ---------------------------------------------------------------------------
// Yahoo Finance — daily closes fetch
// ---------------------------------------------------------------------------

type FetchOutcome =
  | { ok: true; closes: number[] }
  | { ok: false; error: RsiError };

async function fetchDailyCloses(ticker: string, days = 60): Promise<FetchOutcome> {
  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - days * 24 * 3600;
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=1d&period1=${startTs}&period2=${endTs}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
    });
  } catch {
    return { ok: false, error: "fetch_failed" };
  }

  if (res.status === 404) return { ok: false, error: "not_found" };
  if (!res.ok) return { ok: false, error: "fetch_failed" };

  const json = await res.json().catch(() => null);
  const closes: number[] =
    json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  const clean = closes.filter((v) => v != null && !isNaN(v));
  return { ok: true, closes: clean };
}

// ---------------------------------------------------------------------------
// RSI-14 calculation (Wilder smoothing)
// ---------------------------------------------------------------------------

/** Returns the full RSI series computed from `closes` (one value per close after the first `period+1`). */
export function calcRsiSeries(closes: number[], period = PERIOD): number[] {
  if (closes.length < period + 1) return [];

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rsiAt = (): number => {
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
  };

  const series: number[] = [rsiAt()];

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    series.push(rsiAt());
  }

  return series;
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

async function getCached(userId: string, ticker: string) {
  const rows = await db
    .select()
    .from(indicatorSnapshots)
    .where(
      and(
        eq(indicatorSnapshots.userId, userId),
        eq(indicatorSnapshots.ticker, ticker),
        eq(indicatorSnapshots.period, PERIOD)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

function isStale(syncedAt: Date): boolean {
  return Date.now() - syncedAt.getTime() > STALE_MINUTES * 60 * 1000;
}

function parseHistory(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === "number" && !isNaN(n));
  } catch {
    return [];
  }
}

async function upsertSnapshot(
  userId: string,
  ticker: string,
  rsi: number,
  history: number[]
): Promise<void> {
  const historyJson = JSON.stringify(history);
  await db
    .insert(indicatorSnapshots)
    .values({
      userId,
      ticker,
      period: PERIOD,
      rsi: rsi.toString(),
      history: historyJson,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        indicatorSnapshots.userId,
        indicatorSnapshots.ticker,
        indicatorSnapshots.period,
      ],
      set: {
        rsi: rsi.toString(),
        history: historyJson,
        syncedAt: new Date(),
      },
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns RSI for a single ticker, refreshing cache if stale. Always resolves; errors are reported on the result. */
export async function getRsi(
  userId: string,
  ticker: string
): Promise<RsiResult> {
  const cached = await getCached(userId, ticker);
  if (cached && !isStale(cached.syncedAt)) {
    const rsi = parseFloat(cached.rsi);
    const history = parseHistory(cached.history);
    return { ticker, rsi, state: classifyRsi(rsi), syncedAt: cached.syncedAt, history };
  }

  const fetched = await fetchDailyCloses(ticker);
  if (!fetched.ok) {
    // Fall back to stale cache if we have one — still surface error hint via console for observability
    if (cached) {
      const rsi = parseFloat(cached.rsi);
      const history = parseHistory(cached.history);
      return { ticker, rsi, state: classifyRsi(rsi), syncedAt: cached.syncedAt, history };
    }
    return { ticker, rsi: null, state: null, syncedAt: null, history: [], error: fetched.error };
  }

  const series = calcRsiSeries(fetched.closes);
  if (series.length === 0) {
    if (cached) {
      const cachedRsi = parseFloat(cached.rsi);
      const history = parseHistory(cached.history);
      return { ticker, rsi: cachedRsi, state: classifyRsi(cachedRsi), syncedAt: cached.syncedAt, history };
    }
    return { ticker, rsi: null, state: null, syncedAt: null, history: [], error: "insufficient_data" };
  }

  const rsi = series[series.length - 1];
  const history = series.slice(-HISTORY_POINTS);
  await upsertSnapshot(userId, ticker, rsi, history);
  return { ticker, rsi, state: classifyRsi(rsi), syncedAt: new Date(), history };
}

export interface TickerEntry {
  ticker: string;
  rsiTicker?: string | null;
}

/** Fetches RSI for multiple tickers. Always returns an entry per ticker — failed lookups carry an `error`. */
export async function getRsiForTickers(
  userId: string,
  entries: TickerEntry[]
): Promise<Record<string, RsiResult>> {
  const results = await Promise.all(
    entries.map(async ({ ticker, rsiTicker }) => {
      const result = await getRsi(userId, ticker);
      if (result.error === "not_found" && rsiTicker) {
        const aliasResult = await getRsi(userId, rsiTicker);
        if (!aliasResult.error) {
          return {
            ...aliasResult,
            ticker,
            via: rsiTicker,
          };
        }
      }
      return result;
    })
  );
  const map: Record<string, RsiResult & { via?: string }> = {};
  results.forEach((r, i) => {
    map[entries[i].ticker] = r;
  });
  return map;
}

// ---------------------------------------------------------------------------
// Backtest — "how does RSI < 35 typically play out for this ticker?"
// ---------------------------------------------------------------------------

export const BACKTEST_HORIZONS = [5, 10, 20] as const;
export type BacktestHorizon = (typeof BACKTEST_HORIZONS)[number];
const BACKTEST_DAYS = 400;
const OVERSOLD_THRESHOLD = 35;

export interface BacktestHorizonStats {
  horizonDays: BacktestHorizon;
  count: number;
  avgReturnPct: number | null;
  medianReturnPct: number | null;
  winRatePct: number | null;
}

export interface BacktestResult {
  ticker: string;
  via?: string;
  threshold: number;
  signalCount: number;
  daysAnalyzed: number;
  horizons: BacktestHorizonStats[];
  error?: RsiError;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function computeStats(closes: number[]): Omit<BacktestResult, "ticker" | "via" | "error"> {
  const series = calcRsiSeries(closes);
  // Crossings: prior RSI ≥ threshold, current RSI < threshold. First series point has no prior, so skip it.
  // series[i] maps to closes[i + PERIOD]; forward return at horizon h uses closes[i + PERIOD + h].
  const signalIdxs: number[] = [];
  for (let i = 1; i < series.length; i++) {
    if (series[i - 1] >= OVERSOLD_THRESHOLD && series[i] < OVERSOLD_THRESHOLD) {
      signalIdxs.push(i);
    }
  }

  const horizons: BacktestHorizonStats[] = BACKTEST_HORIZONS.map((h) => {
    const returns: number[] = [];
    for (const idx of signalIdxs) {
      const base = idx + PERIOD;
      const future = base + h;
      if (future >= closes.length) continue;
      const basePrice = closes[base];
      const futurePrice = closes[future];
      if (!basePrice) continue;
      returns.push(((futurePrice - basePrice) / basePrice) * 100);
    }
    if (returns.length === 0) {
      return { horizonDays: h, count: 0, avgReturnPct: null, medianReturnPct: null, winRatePct: null };
    }
    const avg = returns.reduce((s, r) => s + r, 0) / returns.length;
    const wins = returns.filter((r) => r > 0).length;
    return {
      horizonDays: h,
      count: returns.length,
      avgReturnPct: parseFloat(avg.toFixed(2)),
      medianReturnPct: parseFloat(median(returns).toFixed(2)),
      winRatePct: parseFloat(((wins / returns.length) * 100).toFixed(1)),
    };
  });

  return {
    threshold: OVERSOLD_THRESHOLD,
    signalCount: signalIdxs.length,
    daysAnalyzed: closes.length,
    horizons,
  };
}

/**
 * Runs an RSI-below-35 crossing backtest on ~400 days of daily closes.
 * Always resolves — errors are carried on the result. Uses alias fallback like getRsi.
 */
export async function runBacktest(ticker: string, rsiTicker?: string | null): Promise<BacktestResult> {
  let fetched = await fetchDailyCloses(ticker, BACKTEST_DAYS);
  let via: string | undefined;

  if (fetched.ok === false && fetched.error === "not_found" && rsiTicker) {
    const aliasFetched = await fetchDailyCloses(rsiTicker, BACKTEST_DAYS);
    if (aliasFetched.ok) {
      fetched = aliasFetched;
      via = rsiTicker;
    }
  }

  if (!fetched.ok) {
    return {
      ticker,
      via,
      threshold: OVERSOLD_THRESHOLD,
      signalCount: 0,
      daysAnalyzed: 0,
      horizons: BACKTEST_HORIZONS.map((h) => ({
        horizonDays: h,
        count: 0,
        avgReturnPct: null,
        medianReturnPct: null,
        winRatePct: null,
      })),
      error: fetched.error,
    };
  }

  if (fetched.closes.length < PERIOD + 2) {
    return {
      ticker,
      via,
      threshold: OVERSOLD_THRESHOLD,
      signalCount: 0,
      daysAnalyzed: fetched.closes.length,
      horizons: BACKTEST_HORIZONS.map((h) => ({
        horizonDays: h,
        count: 0,
        avgReturnPct: null,
        medianReturnPct: null,
        winRatePct: null,
      })),
      error: "insufficient_data",
    };
  }

  return { ticker, via, ...computeStats(fetched.closes) };
}

/** Returns the last syncedAt across all snapshots for a user (for header status). */
export async function getLastSyncedAt(userId: string): Promise<Date | null> {
  const rows = await db
    .select({ syncedAt: indicatorSnapshots.syncedAt })
    .from(indicatorSnapshots)
    .where(eq(indicatorSnapshots.userId, userId))
    .orderBy(desc(indicatorSnapshots.syncedAt))
    .limit(1);
  return rows[0]?.syncedAt ?? null;
}
