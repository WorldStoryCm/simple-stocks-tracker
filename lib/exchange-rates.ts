type ExchangeRatesValidResponse = {
  result: "success";
  rates: Record<string, number>;
  time_next_update_unix: number;
};

// Simple global memory cache to prevent spamming the free API on every Dashboard load
let globalRatesCache: Record<string, number> | null = null;
let cacheExpiryUnix = 0;

export async function getExchangeRates(base = "USD"): Promise<Record<string, number>> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached rates if valid
  if (globalRatesCache && now < cacheExpiryUnix) {
    return globalRatesCache;
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) {
      console.error("Exchange API returned non-ok status:", res.status);
      return globalRatesCache || { "USD": 1 }; // Fallback to stale or 1:1 format
    }

    const data: ExchangeRatesValidResponse = await res.json();
    if (data.result === "success" && data.rates) {
      globalRatesCache = data.rates;
      // The API specifies next update time, otherwise assume 1 hour
      cacheExpiryUnix = data.time_next_update_unix || (now + 3600);
      return globalRatesCache;
    }
    
    return globalRatesCache || { "USD": 1 };
  } catch (err) {
    console.error("Failed to fetch exchange rates", err);
    return globalRatesCache || { "USD": 1 };
  }
}

/**
 * Helper to convert an amount from any supported currency back to USD.
 * Usage: convertToUSD(100, "EUR", rates) -> ~108.50
 */
export function convertToUSD(amount: number, fromCurrency: string, rates: Record<string, number>): number {
  if (fromCurrency === "USD" || !fromCurrency) return amount;
  
  const rate = rates[fromCurrency];
  if (!rate) return amount; // Fallback strictly if rate completely missing
  
  // ER API defines rates as: 1 Base (USD) = X Target (EUR)
  // So to go Target -> Base, divide by rate:
  return amount / rate;
}
