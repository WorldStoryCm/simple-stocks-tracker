/**
 * Currency formatting utilities.
 * All monetary display in the app should go through these helpers
 * so there's a single place to control currency symbols and locale formatting.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF ',
  AUD: 'A$',
  CAD: 'C$',
};

/** Returns the symbol for a currency code (e.g. 'EUR' → '€'). Falls back to the code itself. */
export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code?.toUpperCase()] ?? code ?? '$';
}

/** Formats a number with the correct currency symbol and locale separators. */
export function formatAmount(
  amount: number,
  currencyCode: string,
  opts: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  const symbol = currencySymbol(currencyCode);
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: opts.minimumFractionDigits ?? 2,
    maximumFractionDigits: opts.maximumFractionDigits ?? 2,
  });
  return `${symbol}${formatted}`;
}

/** Formats a price (e.g. per-share price) with up to 4 decimal places. */
export function formatPrice(amount: number, currencyCode: string): string {
  return formatAmount(amount, currencyCode, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}
