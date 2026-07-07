import YahooFinance from "yahoo-finance2";
import type {
  CompanyEvent,
  CompanyEventType,
  CompanyNewsItem,
  RawSearchNews,
  RawSearchResult,
  SymbolRow,
  YahooCalendarSummary,
} from "./types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const YAHOO_CACHE_TTL_MS = 10 * 60 * 1000;

type FetchOptions = { forceRefresh?: boolean };
type EventResult = { events: CompanyEvent[]; warning: string | null };
type NewsResult = { items: CompanyNewsItem[]; warning: string | null };
type CacheEntry<T> = { expiresAt: number; value: T };

const eventCache = new Map<string, CacheEntry<EventResult>>();
const newsCache = new Map<string, CacheEntry<NewsResult>>();

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string, nowMs: number) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, nowMs: number) {
  cache.set(key, { expiresAt: nowMs + YAHOO_CACHE_TTL_MS, value });
}

function quoteUrl(ticker: string) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInUpcomingWindow(date: Date, now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setMonth(end.getMonth() + 12);
  return date >= start && date <= end;
}

function formatNumber(value: number | undefined, options?: Intl.NumberFormatOptions) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return new Intl.NumberFormat("en", options).format(value);
}

function earningsDetails(
  earnings: NonNullable<YahooCalendarSummary["calendarEvents"]>["earnings"],
) {
  const eps = formatNumber(earnings?.earningsAverage, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  const low = formatNumber(earnings?.earningsLow, { maximumFractionDigits: 2 });
  const high = formatNumber(earnings?.earningsHigh, { maximumFractionDigits: 2 });
  const revenue = formatNumber(earnings?.revenueAverage, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const parts = [
    eps ? `EPS est. ${eps}` : null,
    low && high ? `range ${low}-${high}` : null,
    revenue ? `revenue est. ${revenue}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join("; ") : null;
}

function pushEvent(
  events: CompanyEvent[],
  symbol: SymbolRow,
  type: CompanyEventType,
  title: string,
  rawDate: unknown,
  now: Date,
  options: { isEstimate?: boolean; details?: string | null } = {},
) {
  const date = toDate(rawDate);
  if (!date || !isInUpcomingWindow(date, now)) return;
  const isoDate = date.toISOString();
  events.push({
    id: `${symbol.ticker}-${type}-${isoDate}`,
    ticker: symbol.ticker,
    companyName: symbol.displayName,
    type,
    title,
    date: isoDate,
    isEstimate: options.isEstimate ?? false,
    details: options.details ?? null,
    source: "Yahoo Finance",
    url: quoteUrl(symbol.ticker),
  });
}

function thumbnailUrl(news: RawSearchNews) {
  const resolutions = news.thumbnail?.resolutions ?? [];
  const preferred = resolutions.find((item) => item.width === 140) ?? resolutions[0];
  return typeof preferred?.url === "string" ? preferred.url : null;
}

function relatedTickers(news: RawSearchNews, fallbackTicker: string) {
  if (!Array.isArray(news.relatedTickers)) return [fallbackTicker];
  const values = news.relatedTickers.filter((value): value is string => typeof value === "string");
  return values.length ? values : [fallbackTicker];
}

async function fetchEventsFromYahoo(symbol: SymbolRow, now: Date): Promise<EventResult> {
  try {
    const summary = (await yahooFinance.quoteSummary(symbol.ticker, {
      modules: ["calendarEvents"],
    })) as YahooCalendarSummary;
    const calendar = summary.calendarEvents;
    const earnings = calendar?.earnings;
    const events: CompanyEvent[] = [];
    const details = earningsDetails(earnings);

    pushEvent(events, symbol, "earnings", "Earnings report", earnings?.earningsDate?.[0], now, {
      isEstimate: !!earnings?.isEarningsDateEstimate,
      details,
    });
    pushEvent(events, symbol, "earnings_call", "Earnings call", earnings?.earningsCallDate?.[0], now, {
      details,
    });
    pushEvent(events, symbol, "ex_dividend", "Ex-dividend date", calendar?.exDividendDate, now);
    pushEvent(events, symbol, "dividend_payable", "Dividend payable", calendar?.dividendDate, now);

    return { events, warning: null };
  } catch (error) {
    console.error(`Failed to fetch calendar events for ${symbol.ticker}`, error);
    return { events: [], warning: `Events unavailable for ${symbol.ticker}` };
  }
}

export async function fetchEventsForSymbol(symbol: SymbolRow, now: Date, options: FetchOptions = {}) {
  const nowMs = Date.now();
  const key = symbol.ticker;
  const cached = options.forceRefresh ? null : readCache(eventCache, key, nowMs);
  if (cached) return cached;

  const result = await fetchEventsFromYahoo(symbol, now);
  writeCache(eventCache, key, result, nowMs);
  return result;
}

async function fetchNewsFromYahoo(symbol: SymbolRow, newsPerSymbol: number): Promise<NewsResult> {
  try {
    const raw = (await yahooFinance.search(
      symbol.ticker,
      { quotesCount: 1, newsCount: newsPerSymbol },
      { validateResult: false },
    )) as RawSearchResult;

    const items = (raw.news ?? []).flatMap<CompanyNewsItem>((item) => {
      const published = toDate(item.providerPublishTime);
      if (typeof item.title !== "string" || typeof item.link !== "string" || !published) {
        return [];
      }
      const id = typeof item.uuid === "string" ? item.uuid : `${symbol.ticker}-${item.link}`;
      return [{
        id,
        ticker: symbol.ticker,
        title: item.title,
        publisher: typeof item.publisher === "string" ? item.publisher : "Yahoo Finance",
        url: item.link,
        publishedAt: published.toISOString(),
        imageUrl: thumbnailUrl(item),
        relatedTickers: relatedTickers(item, symbol.ticker),
        source: "Yahoo Finance",
      }];
    });

    return { items, warning: null };
  } catch (error) {
    console.error(`Failed to fetch news for ${symbol.ticker}`, error);
    return { items: [], warning: `News unavailable for ${symbol.ticker}` };
  }
}

export async function fetchNewsForSymbol(
  symbol: SymbolRow,
  newsPerSymbol: number,
  options: FetchOptions = {},
) {
  const nowMs = Date.now();
  const key = `${symbol.ticker}:${newsPerSymbol}`;
  const cached = options.forceRefresh ? null : readCache(newsCache, key, nowMs);
  if (cached) return cached;

  const result = await fetchNewsFromYahoo(symbol, newsPerSymbol);
  writeCache(newsCache, key, result, nowMs);
  return result;
}
