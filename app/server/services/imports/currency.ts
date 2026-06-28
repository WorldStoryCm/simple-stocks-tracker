import { convertFromUSD, convertToUSD } from "@/lib/exchange-rates";

export function convertImportCashImpact({
  amount,
  fromCurrency,
  toCurrency,
  fxRate,
  rates,
}: {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  fxRate?: number;
  rates: Record<string, number>;
}) {
  if (!toCurrency || fromCurrency === toCurrency) return amount;

  if (fxRate && fxRate > 0) {
    if (fromCurrency === "USD" && toCurrency === "EUR") return amount / fxRate;
    if (fromCurrency === "EUR" && toCurrency === "USD") return amount * fxRate;
  }

  const amountUsd = convertToUSD(amount, fromCurrency, rates);
  return convertFromUSD(amountUsd, toCurrency, rates);
}
