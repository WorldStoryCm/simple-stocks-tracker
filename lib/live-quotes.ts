import YahooFinance from "yahoo-finance2";

export type LiveQuote = {
  price: number;
  changePercent: number;
  currency: string;
};

const yahooFinance = new YahooFinance();

export async function getLiveQuotes(tickers: string[]): Promise<Record<string, LiveQuote>> {
  const uniqueTickers = Array.from(new Set(tickers.filter(Boolean)));
  const results: Record<string, LiveQuote> = {};

  if (uniqueTickers.length === 0) {
    return results;
  }

  try {
    const quotes = await yahooFinance.quote(uniqueTickers);
    const quotesArray = (Array.isArray(quotes) ? quotes : [quotes]) as Array<{
      symbol?: string;
      regularMarketPrice?: number | null;
      regularMarketChangePercent?: number | null;
      currency?: string | null;
    }>;

    for (const quote of quotesArray) {
      if (!quote?.symbol) continue;

      results[quote.symbol] = {
        price: quote.regularMarketPrice || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        currency: (quote.currency || "USD").toUpperCase(),
      };
    }
  } catch (err) {
    console.error("Failed to fetch quotes", err);
  }

  return results;
}
