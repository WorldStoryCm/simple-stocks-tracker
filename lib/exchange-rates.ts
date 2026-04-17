import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Simple global memory cache to prevent spamming the Yahoo API on every Dashboard load
let globalRatesCache: Record<string, number> | null = null;
let cacheExpiryUnix = 0;

const SUPPORTED_CURRENCIES = ["EUR", "GBP", "AUD", "CAD", "CHF", "JPY"];

export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached rates if valid
  if (globalRatesCache && now < cacheExpiryUnix) {
    return globalRatesCache;
  }

  try {
    const pairs = SUPPORTED_CURRENCIES.map(c => `${c}USD=X`);
    const quotes = await yahooFinance.quote(pairs);
    const quotesArray = (Array.isArray(quotes) ? quotes : [quotes]) as Array<{
      symbol?: string;
      regularMarketPrice?: number | null;
    }>;

    const newRates: Record<string, number> = { "USD": 1 };
    
    for (const q of quotesArray) {
      if (q && q.symbol && q.regularMarketPrice) {
        // q.symbol is like 'EURUSD=X'
        const currency = q.symbol.substring(0, 3);
        newRates[currency] = q.regularMarketPrice;
      }
    }

    if (Object.keys(newRates).length > 1) {
      globalRatesCache = newRates;
      // Cache for 15 minutes as Yahoo quotes are live market data
      cacheExpiryUnix = now + 900;
      return globalRatesCache;
    }
    
    return globalRatesCache || { "USD": 1 };
  } catch (err) {
    console.error("Failed to fetch exchange rates via YahooFinance", err);
    return globalRatesCache || { "USD": 1 };
  }
}

/**
 * Helper to convert an amount from any supported currency back to USD.
 * Usage: convertToUSD(100, "EUR", rates) -> ~108.50
 */
export function convertToUSD(amount: number, fromCurrency: string, rates: Record<string, number>): number {
  if (fromCurrency === "USD" || !fromCurrency) return amount;
  
  // Now our rates array holds direct USD multipliers! (e.g. 1 EUR = 1.08 USD)
  const multiplier = rates[fromCurrency];
  if (!multiplier) return amount; // Fallback strictly if rate completely missing
  
  return amount * multiplier;
}

/**
 * Converts a USD-denominated amount into the target currency.
 * Usage: convertFromUSD(108.5, "EUR", rates) -> ~100
 */
export function convertFromUSD(amount: number, toCurrency: string, rates: Record<string, number>): number {
  if (toCurrency === "USD" || !toCurrency) return amount;

  const multiplier = rates[toCurrency];
  if (!multiplier) return amount;

  return amount / multiplier;
}
