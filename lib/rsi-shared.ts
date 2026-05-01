/**
 * RSI helpers safe to import from client components.
 * No db / pg / node-only dependencies — keep it that way.
 */

export type RsiState =
  | "oversold"
  | "near_oversold"
  | "neutral"
  | "near_overbought"
  | "overbought";

export type RsiError = "not_found" | "fetch_failed" | "insufficient_data";

export function classifyRsi(rsi: number): RsiState {
  if (rsi <= 30) return "oversold";
  if (rsi <= 40) return "near_oversold";
  if (rsi <= 60) return "neutral";
  if (rsi <= 70) return "near_overbought";
  return "overbought";
}

export const RSI_STATE_LABELS: Record<RsiState, string> = {
  oversold: "Oversold",
  near_oversold: "Near Oversold",
  neutral: "Neutral",
  near_overbought: "Near Overbought",
  overbought: "Overbought",
};

const RSI_ERROR_LABELS: Record<RsiError, string> = {
  not_found: "Ticker not found",
  fetch_failed: "Data source unavailable",
  insufficient_data: "Not enough history",
};

export function rsiErrorLabel(error: RsiError): string {
  return RSI_ERROR_LABELS[error];
}
