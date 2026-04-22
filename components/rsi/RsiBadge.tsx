/**
 * RsiBadge — single reusable RSI display used across Symbols, Positions, Shadow.
 * Shows numeric value + compact state label with subtle colour treatment.
 * No neon, no giant blocks — just a trustworthy finance badge.
 */

import { cn } from "@/components/component.utils";
import { AlertTriangle } from "lucide-react";

export type RsiState =
  | "oversold"
  | "near-oversold"
  | "neutral"
  | "near-overbought"
  | "overbought";

export function getRsiState(rsi: number): RsiState {
  if (rsi <= 30) return "oversold";
  if (rsi <= 40) return "near-oversold";
  if (rsi <= 60) return "neutral";
  if (rsi <= 70) return "near-overbought";
  return "overbought";
}

export const RSI_STATE_LABELS: Record<RsiState, string> = {
  "oversold": "Oversold",
  "near-oversold": "Near Oversold",
  "neutral": "Neutral",
  "near-overbought": "Near Overbought",
  "overbought": "Overbought",
};

const STATE_STYLES: Record<RsiState, string> = {
  "oversold":       "bg-blue-50  text-blue-700  border-blue-200",
  "near-oversold":  "bg-sky-50   text-sky-700   border-sky-200",
  "neutral":        "bg-gray-50  text-gray-600  border-gray-200",
  "near-overbought":"bg-amber-50 text-amber-700 border-amber-200",
  "overbought":     "bg-rose-50  text-rose-700  border-rose-200",
};

export type RsiErrorKind = "not_found" | "fetch_failed" | "insufficient_data";

const ERROR_LABELS: Record<RsiErrorKind, string> = {
  not_found: "Ticker mismatch",
  fetch_failed: "Data unavailable",
  insufficient_data: "Not enough history",
};

const ERROR_TOOLTIPS: Record<RsiErrorKind, string> = {
  not_found: "Symbol not recognised by the data source (possible ticker/CIK mismatch)",
  fetch_failed: "Could not reach the indicator data source — try again shortly",
  insufficient_data: "Fewer than 15 daily closes available for this symbol",
};

interface RsiBadgeProps {
  rsi: number | null | undefined;
  /** If true renders a compact single-line pill; default false = stacked */
  inline?: boolean;
  /** Optional error state — renders a neutral "mismatch" pill instead of the value */
  error?: RsiErrorKind | null;
  className?: string;
}

export function RsiBadge({ rsi, inline = false, error, className }: RsiBadgeProps) {
  if (error) {
    return (
      <span
        title={ERROR_TOOLTIPS[error]}
        className={cn(
          "inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500",
          className,
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        <span>{ERROR_LABELS[error]}</span>
      </span>
    );
  }

  if (rsi == null) {
    return (
      <span className={cn("text-xs text-gray-400", className)}>—</span>
    );
  }

  const state = getRsiState(rsi);
  const label = RSI_STATE_LABELS[state];
  const styles = STATE_STYLES[state];

  if (inline) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium tabular-nums",
          styles,
          className,
        )}
      >
        <span>{rsi.toFixed(1)}</span>
        <span className="opacity-70">{label}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex flex-col items-start rounded border px-2 py-1 text-xs",
        styles,
        className,
      )}
    >
      <span className="font-semibold tabular-nums leading-none">{rsi.toFixed(1)}</span>
      <span className="mt-0.5 leading-none opacity-70">{label}</span>
    </span>
  );
}
