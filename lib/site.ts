export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001")
).replace(/\/$/, "");

export const SITE_NAME = "Stock Tracker";

export const SITE_TAGLINE = "A personal stock journal that turns broker exports into clean P/L.";

export const SITE_DESCRIPTION =
  "Stock Tracker is a personal stock journal for imported and manual trades. Import Revolut CSV activity, prepare for IBKR exports, track dividends, and get average-cost realized P/L, RSI-aware positions, capital curves, and win-rate breakdowns.";

export const SITE_KEYWORDS = [
  "stock journal",
  "trade tracker",
  "portfolio tracker",
  "average cost P/L",
  "realized profit and loss",
  "unrealized P/L",
  "RSI",
  "Revolut import",
  "IBKR import",
  "dividend tracker",
  "manual portfolio tracker",
  "multi-broker tracker",
];
