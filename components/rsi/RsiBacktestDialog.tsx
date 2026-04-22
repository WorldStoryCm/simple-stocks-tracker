"use client";

import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { rsiErrorLabel } from "@/lib/rsi";

interface RsiBacktestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticker: string | null;
  rsiTicker?: string | null;
}

function StatCell({ value, positive }: { value: number | null; positive?: boolean }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const sign = value > 0 ? "+" : "";
  const color =
    positive == null
      ? ""
      : value > 0
        ? "text-emerald-600"
        : value < 0
          ? "text-rose-600"
          : "";
  return (
    <span className={`tabular-nums ${color}`}>
      {sign}
      {value.toFixed(positive === undefined ? 1 : 2)}%
    </span>
  );
}

export function RsiBacktestDialog({ open, onOpenChange, ticker, rsiTicker }: RsiBacktestDialogProps) {
  const { data, isLoading, error } = trpc.rsi.backtest.useQuery(
    { ticker: ticker ?? "", rsiTicker: rsiTicker ?? null },
    { enabled: open && !!ticker, staleTime: 5 * 60 * 1000 },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>RSI-14 &lt; 35 Backtest — {ticker}</DialogTitle>
          <DialogDescription>
            Historical outcomes when daily RSI crossed below 35 over the last ~400 trading days.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-6 text-sm text-rose-600">
            <AlertTriangle className="h-4 w-4" />
            Could not run backtest: {error.message}
          </div>
        ) : data?.error ? (
          <div className="flex items-center gap-2 py-6 text-sm text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            {rsiErrorLabel(data.error)}
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                Signals found: <strong className="text-foreground">{data.signalCount}</strong>
              </span>
              <span>
                Days analyzed: <strong className="text-foreground">{data.daysAnalyzed}</strong>
              </span>
              {data.via && (
                <span>
                  Via alias: <strong className="text-foreground">{data.via}</strong>
                </span>
              )}
            </div>

            {data.signalCount === 0 ? (
              <div className="rounded border bg-muted/30 p-4 text-sm text-muted-foreground">
                No crossings below {data.threshold} in the analyzed window.
              </div>
            ) : (
              <div className="overflow-hidden rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Horizon</th>
                      <th className="px-3 py-2 text-right font-medium">N</th>
                      <th className="px-3 py-2 text-right font-medium">Win Rate</th>
                      <th className="px-3 py-2 text-right font-medium">Median</th>
                      <th className="px-3 py-2 text-right font-medium">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.horizons.map((h) => (
                      <tr key={h.horizonDays} className="border-t">
                        <td className="px-3 py-2">+{h.horizonDays} days</td>
                        <td className="px-3 py-2 text-right tabular-nums">{h.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {h.winRatePct == null ? "—" : `${h.winRatePct.toFixed(0)}%`}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <StatCell value={h.medianReturnPct} positive />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <StatCell value={h.avgReturnPct} positive />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Caveat: backtest runs on currently-listed history only (no survivorship adjustment). Median is
              usually more informative than average — a single outlier can skew the mean. Past behaviour is not
              a prediction.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
