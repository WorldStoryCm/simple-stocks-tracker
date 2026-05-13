import { getLiveQuotes } from "@/lib/live-quotes";

async function getMany(tickers: string[]) {
  return getLiveQuotes(tickers);
}

export const quotesService = { getMany };
