export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001")
).replace(/\/$/, "");

export const SITE_NAME = "Stock Tracker";

export const SITE_TAGLINE = "A personal stock journal that turns your trades into clean P/L.";

export const SITE_DESCRIPTION =
  "Stock Tracker is a personal, manual stock journal. Log every buy and sell across all your brokers in one place. Get FIFO realized P/L, RSI-aware positions, capital curves, win-rate breakdowns, and Shadow Trading to review the ideas you didn't act on.";

export const SITE_KEYWORDS = [
  "stock journal",
  "trade tracker",
  "portfolio tracker",
  "FIFO P/L",
  "realized profit and loss",
  "unrealized P/L",
  "RSI",
  "shadow trading",
  "trading review",
  "manual portfolio tracker",
  "multi-broker tracker",
];
