export type SessionCurrency = "USD" | "EUR";

export function sessionCurrency(value: string | null | undefined): SessionCurrency {
  return value === "EUR" ? "EUR" : "USD";
}

export function currencyFactor(
  from: SessionCurrency,
  to: SessionCurrency,
  usdPerEur: number,
) {
  if (from === to) return 1;
  if (!(usdPerEur > 0)) return 1;
  return from === "EUR" ? usdPerEur : 1 / usdPerEur;
}

export function convertSessionCurrency(
  value: number,
  from: SessionCurrency,
  to: SessionCurrency,
  usdPerEur: number,
) {
  return value * currencyFactor(from, to, usdPerEur);
}
