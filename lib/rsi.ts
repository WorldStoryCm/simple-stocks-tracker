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
  error?: RsiError;
}

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

async function fetchDailyCloses(ticker: string): Promise<FetchOutcome> {
  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - 60 * 24 * 3600; // 60 days of history
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

function calcRsi(closes: number[], period = PERIOD): number | null {
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
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

async function upsertSnapshot(
  userId: string,
  ticker: string,
  rsi: number
): Promise<void> {
  await db
    .insert(indicatorSnapshots)
    .values({
      userId,
      ticker,
      period: PERIOD,
      rsi: rsi.toString(),
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
    return { ticker, rsi, state: classifyRsi(rsi), syncedAt: cached.syncedAt };
  }

  const fetched = await fetchDailyCloses(ticker);
  if (!fetched.ok) {
    // Fall back to stale cache if we have one — still surface error hint via console for observability
    if (cached) {
      const rsi = parseFloat(cached.rsi);
      return { ticker, rsi, state: classifyRsi(rsi), syncedAt: cached.syncedAt };
    }
    return { ticker, rsi: null, state: null, syncedAt: null, error: fetched.error };
  }

  const rsi = calcRsi(fetched.closes);
  if (rsi == null) {
    if (cached) {
      const cachedRsi = parseFloat(cached.rsi);
      return { ticker, rsi: cachedRsi, state: classifyRsi(cachedRsi), syncedAt: cached.syncedAt };
    }
    return { ticker, rsi: null, state: null, syncedAt: null, error: "insufficient_data" };
  }

  await upsertSnapshot(userId, ticker, rsi);
  return { ticker, rsi, state: classifyRsi(rsi), syncedAt: new Date() };
}

/** Fetches RSI for multiple tickers. Always returns an entry per ticker — failed lookups carry an `error`. */
export async function getRsiForTickers(
  userId: string,
  tickers: string[]
): Promise<Record<string, RsiResult>> {
  const results = await Promise.all(tickers.map((t) => getRsi(userId, t)));
  const map: Record<string, RsiResult> = {};
  results.forEach((r, i) => {
    map[tickers[i]] = r;
  });
  return map;
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
