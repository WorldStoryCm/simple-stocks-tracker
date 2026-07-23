import { Activity, CircleDollarSign, Crosshair, Layers3, Radio } from "lucide-react";
import type { SessionMetrics } from "@/lib/trading-sessions/calculations";
import {
  formatQuantity,
  formatSessionPrice,
  formatSignedAmount,
  pnlClass,
} from "../session-format";

export function SessionSummary({
  metrics,
  currentPrice,
  currencyCode,
  hasLiveQuote,
}: {
  metrics: SessionMetrics;
  currentPrice: number;
  currencyCode: string;
  hasLiveQuote: boolean;
}) {
  const items = [
    {
      label: "Open quantity",
      value: formatQuantity(metrics.state.quantity),
      caption: "Available in sandbox",
      icon: Layers3,
    },
    {
      label: "Average cost",
      value: formatSessionPrice(metrics.state.averageCost, currencyCode),
      caption: "Moving cost basis",
      icon: Crosshair,
    },
    {
      label: "Current mark",
      value: formatSessionPrice(currentPrice, currencyCode),
      caption: hasLiveQuote ? "Live quote" : "Latest session price",
      icon: Radio,
    },
    {
      label: "Session P/L",
      value: formatSignedAmount(metrics.sessionPnl, currencyCode),
      caption: "Change since start mark",
      icon: Activity,
      valueClass: pnlClass(metrics.sessionPnl),
    },
    {
      label: "Position P/L",
      value: formatSignedAmount(metrics.positionPnl, currencyCode),
      caption: "Realized + remaining",
      icon: CircleDollarSign,
      valueClass: pnlClass(metrics.positionPnl),
    },
  ];

  return (
    <div className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex min-w-0 items-start gap-3 bg-card p-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-2)] text-text-tertiary">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
                {item.label}
              </p>
              <p className={`mt-1 truncate font-mono text-lg font-semibold tabular-nums ${item.valueClass ?? "text-text-primary"}`}>
                {item.value}
              </p>
              <p className="mt-0.5 text-xs text-text-tertiary">{item.caption}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
