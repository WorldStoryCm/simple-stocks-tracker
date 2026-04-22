/**
 * RsiBadge — single reusable RSI display used across Symbols, Positions, Shadow.
 * Shows numeric value + compact state label with subtle colour treatment.
 * No neon, no giant blocks — just a trustworthy finance badge.
 */

import { cn } from "@/components/component.utils";
import { AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";

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
  not_found: "No RSI data",
  fetch_failed: "Data unavailable",
  insufficient_data: "Not enough history",
};

const ERROR_TOOLTIPS: Record<RsiErrorKind, string> = {
  not_found: "Yahoo Finance doesn't recognise this ticker. Set an RSI Ticker alias in Edit Symbol to fix this.",
  fetch_failed: "Could not reach the indicator data source — try again shortly",
  insufficient_data: "Fewer than 15 daily closes available for this symbol",
};

interface RsiBadgeProps {
  rsi: number | null | undefined;
  /** If true renders a compact single-line pill; default false = stacked */
  inline?: boolean;
  /** Optional error state — renders a neutral "mismatch" pill instead of the value */
  error?: RsiErrorKind | null;
  /** When set, RSI was fetched using this alias ticker — surfaced as a tooltip hint */
  via?: string | null;
  /** Up to 3 most-recent daily RSI values (oldest → newest). Drives the trend arrow. */
  history?: number[];
  className?: string;
}

/** Direction of travel inferred from the history series (needs ≥2 points). */
function trendDirection(history?: number[]): "up" | "down" | "flat" | null {
  if (!history || history.length < 2) return null;
  const first = history[0];
  const last = history[history.length - 1];
  const delta = last - first;
  // Half a point is within rounding noise for daily RSI-14
  if (Math.abs(delta) < 0.5) return "flat";
  return delta > 0 ? "up" : "down";
}

function TrendArrow({ history }: { history?: number[] }) {
  const dir = trendDirection(history);
  if (!dir) return null;
  const title = history!.map((v) => v.toFixed(1)).join(" → ");
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  const color = dir === "up" ? "text-emerald-600" : dir === "down" ? "text-rose-600" : "opacity-60";
  return (
    <span title={title} className="inline-flex">
      <Icon className={cn("h-3 w-3", color)} />
    </span>
  );
}

export function RsiBadge({ rsi, inline = false, error, via, history, className }: RsiBadgeProps) {
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
  const viaTitle = via ? `RSI fetched via alias ${via}` : undefined;

  if (inline) {
    return (
      <span
        title={viaTitle}
        className={cn(
          "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium tabular-nums",
          styles,
          className,
        )}
      >
        <span>{rsi.toFixed(1)}</span>
        <TrendArrow history={history} />
        <span className="opacity-70">{label}</span>
        {via && <span className="opacity-50 font-normal">({via})</span>}
      </span>
    );
  }

  return (
    <span
      title={viaTitle}
      className={cn(
        "inline-flex flex-col items-start rounded border px-2 py-1 text-xs",
        styles,
        className,
      )}
    >
      <span className="flex items-center gap-1 font-semibold tabular-nums leading-none">
        {rsi.toFixed(1)}
        <TrendArrow history={history} />
      </span>
      <span className="mt-0.5 leading-none opacity-70">{via ? `${label} (${via})` : label}</span>
    </span>
  );
}
