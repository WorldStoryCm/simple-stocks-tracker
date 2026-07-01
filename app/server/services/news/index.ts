import { db } from "@/db/drizzle";
import { symbols } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchEventsForSymbol, fetchNewsForSymbol } from "./yahoo";
import type { CompanyEvent, CompanyNewsItem, NewsFeedInput } from "./types";

async function feed(userId: string, input: NewsFeedInput = {}) {
  const limitSymbols = input.limitSymbols ?? 40;
  const newsPerSymbol = input.newsPerSymbol ?? 4;
  const trackedSymbols = await db.query.symbols.findMany({
    where: eq(symbols.userId, userId),
    orderBy: (s, { asc }) => [asc(s.ticker)],
    limit: limitSymbols,
  });

  const now = new Date();
  const events: CompanyEvent[] = [];
  const newsItems: CompanyNewsItem[] = [];
  const warnings: string[] = [];
  const seenNews = new Set<string>();

  for (const symbol of trackedSymbols) {
    const [eventResult, newsResult] = await Promise.all([
      fetchEventsForSymbol(symbol, now),
      fetchNewsForSymbol(symbol, newsPerSymbol),
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
