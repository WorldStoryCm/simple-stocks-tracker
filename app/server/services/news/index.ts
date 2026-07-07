import { db } from "@/db/drizzle";
import { symbols } from "@/db/schema";
import { eq } from "drizzle-orm";
import { positionsService } from "../positions";
import { fetchEventsForSymbol, fetchNewsForSymbol } from "./yahoo";
import type { CompanyEvent, CompanyNewsItem, NewsFeedInput, NewsFeedScope, SymbolRow } from "./types";

const OPEN_QTY_EPSILON = 0.00000001;
type NewsFeedOptions = { forceRefresh?: boolean };

async function listAllSymbols(userId: string, limitSymbols: number) {
  return db.query.symbols.findMany({
    where: eq(symbols.userId, userId),
    orderBy: (s, { asc }) => [asc(s.ticker)],
    limit: limitSymbols,
  });
}

async function listPositionSymbols(userId: string, scope: Exclude<NewsFeedScope, "all">, limitSymbols: number) {
  const positions = await positionsService.list(userId);
  const bySymbol = new Map<string, { symbol: SymbolRow; openQty: number; boughtQty: number }>();

  for (const position of positions) {
    const current = bySymbol.get(position.symbol.id) ?? {
      symbol: position.symbol,
      openQty: 0,
      boughtQty: 0,
    };
    current.openQty += position.openQty;
    current.boughtQty += position.totalBoughtQty;
    bySymbol.set(position.symbol.id, current);
  }

  return Array.from(bySymbol.values())
    .filter((item) =>
      scope === "active"
        ? item.openQty > OPEN_QTY_EPSILON
        : item.boughtQty > 0 && item.openQty <= OPEN_QTY_EPSILON,
    )
    .sort((a, b) => a.symbol.ticker.localeCompare(b.symbol.ticker))
    .slice(0, limitSymbols)
    .map((item) => item.symbol);
}

async function listSymbolsForScope(userId: string, scope: NewsFeedScope, limitSymbols: number) {
  if (scope === "all") return listAllSymbols(userId, limitSymbols);
  return listPositionSymbols(userId, scope, limitSymbols);
}

async function feed(userId: string, input: NewsFeedInput = {}, options: NewsFeedOptions = {}) {
  const limitSymbols = input.limitSymbols ?? 40;
  const newsPerSymbol = input.newsPerSymbol ?? 4;
  const scope = input.scope ?? "active";
  const trackedSymbols = await listSymbolsForScope(userId, scope, limitSymbols);

  const now = new Date();
  const events: CompanyEvent[] = [];
  const newsItems: CompanyNewsItem[] = [];
  const warnings: string[] = [];
  const seenNews = new Set<string>();

  for (const symbol of trackedSymbols) {
    const [eventResult, newsResult] = await Promise.all([
      fetchEventsForSymbol(symbol, now, options),
      fetchNewsForSymbol(symbol, newsPerSymbol, options),
    ]);
    events.push(...eventResult.events);
    if (eventResult.warning) warnings.push(eventResult.warning);

    for (const item of newsResult.items) {
      const key = item.id || item.url;
      if (seenNews.has(key)) continue;
      seenNews.add(key);
      newsItems.push(item);
    }
    if (newsResult.warning) warnings.push(newsResult.warning);
  }

  return {
    refreshedAt: now.toISOString(),
    scope,
    symbolCount: trackedSymbols.length,
    limitSymbols,
    events: events.sort((a, b) => a.date.localeCompare(b.date)),
    news: newsItems.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 80),
    warnings: warnings.slice(0, 8),
  };
}

export const newsService = {
  feed,
};
