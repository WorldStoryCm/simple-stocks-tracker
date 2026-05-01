/**
 * Design token constants for non-CSS consumers (Recharts, canvas, SVG).
 * Mirrors `app/globals.css` :root. Keep in sync.
 *
 * See docs/tasks/phase0-design-tokens.md.
 */

export const surface = {
  background: "#070b14",
  s1: "#0f1524",
  s2: "#172033",
  s3: "#1f2a40",
  border: "#1c2436",
  muted: "#131a2a",
} as const;

export const text = {
  primary: "#e6ebf5",
  secondary: "#a7b0c5",
  tertiary: "#7c8aa6",
} as const;

export const brand = {
  from: "#6e5bff",
  to: "#3d7bff",
  ring: "#3d7bff",
} as const;

export const status = {
  positive: "#22d39a",
  positiveSoft: "rgba(34, 211, 154, 0.14)",
  negative: "#ff5c7a",
  negativeSoft: "rgba(255, 92, 122, 0.14)",
  warning: "#f2b441",
  warningSoft: "rgba(242, 180, 65, 0.14)",
  info: "#3d7bff",
  infoSoft: "rgba(61, 123, 255, 0.16)",
} as const;

export const rsi = {
  overbought: "#ff5c7a",
  nearOverbought: "#f2b441",
  neutral: "#7c8aa6",
  nearOversold: "#5ae0b5",
  oversold: "#22d39a",
} as const;

export type RsiBucket =
  | "overbought"
  | "near-overbought"
  | "neutral"
  | "near-oversold"
  | "oversold";

export function rsiBucket(value: number | null | undefined): RsiBucket {
  if (value == null) return "neutral";
  if (value >= 70) return "overbought";
  if (value >= 60) return "near-overbought";
  if (value <= 30) return "oversold";
  if (value <= 40) return "near-oversold";
  return "neutral";
}

export function rsiColor(value: number | null | undefined): string {
  switch (rsiBucket(value)) {
    case "overbought": return rsi.overbought;
    case "near-overbought": return rsi.nearOverbought;
    case "near-oversold": return rsi.nearOversold;
    case "oversold": return rsi.oversold;
    default: return rsi.neutral;
  }
}

export const chart = {
  line: status.positive,
  area: "rgba(34, 211, 154, 0.18)",
  lineNegative: status.negative,
  areaNegative: "rgba(255, 92, 122, 0.16)",
  grid: surface.border,
  axis: text.tertiary,
} as const;

export function plColor(value: number): string {
  if (value > 0) return status.positive;
  if (value < 0) return status.negative;
  return text.tertiary;
}
