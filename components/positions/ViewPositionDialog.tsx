"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, ShoppingCart, ArrowUpFromLine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/dialog";
import { Button } from "@/components/button";
import { TradeDialog } from "@/components/trades/TradeDialog";

interface ViewPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pos: any;
  quote: any;
}

export function ViewPositionDialog({ open, onOpenChange, pos, quote }: ViewPositionDialogProps) {
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [prefilledTrade, setPrefilledTrade] = useState<any>(null);

  if (!pos) return null;

  const marketPrice = quote?.price || Number(pos.avgCost);
  const currentVal = Number(pos.openQty) * marketPrice;
  const investedAmount = Number(pos.investedAmount);
  const pnl = currentVal - investedAmount;
  const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;
  const isProfit = pnl >= 0;

  const handleAction = (type: "buy" | "sell") => {
    setPrefilledTrade({
      platformId: pos.platform?.id,
      symbolId: pos.symbol?.id,
      bucketId: pos.bucket?.id,
      tradeType: type,
    });
    setTradeDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader title={`${pos.symbol?.ticker} — ${pos.platform?.name}`} />

          <div className="flex flex-col gap-5 pt-4">
            {/* P&L Banner */}
            <div
              className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                isProfit
                  ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                  : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>Unrealized P&L</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg leading-tight">
                  {isProfit ? "+" : ""}
                  {pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs opacity-80">
                  {isProfit ? "+" : ""}
                  {pnlPercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatRow label="Open Qty" value={Number(pos.openQty).toFixed(4)} />
              <StatRow label="Avg Cost" value={`$${Number(pos.avgCost).toFixed(2)}`} />
              <StatRow label="Invested" value={`$${investedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
              <StatRow
                label="Live Price"
                value={
                  <span>
                    ${marketPrice.toFixed(2)}
                    {quote && (
                      <span
                        className={`ml-1 text-xs ${
                          quote.changePercent >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        ({quote.changePercent >= 0 ? "+" : ""}
                        {quote.changePercent.toFixed(2)}%)
                      </span>
                    )}
                  </span>
                }
              />
              <StatRow
                label="Current Value"
                value={`$${currentVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                className={currentVal < investedAmount ? "text-red-500 dark:text-red-400" : ""}
              />
              <StatRow label="Bucket" value={pos.bucket?.label || <span className="text-muted-foreground italic">None</span>} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1 gap-2"
                variant="default"
                onClick={() => handleAction("buy")}
              >
                <ShoppingCart className="h-4 w-4" />
                Buy More
              </Button>
              <Button
                className="flex-1 gap-2"
                variant="outline"
                onClick={() => handleAction("sell")}
              >
                <ArrowUpFromLine className="h-4 w-4" />
                Sell Position
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TradeDialog
        open={tradeDialogOpen}
        onOpenChange={(v) => {
          setTradeDialogOpen(v);
          if (!v) onOpenChange(false); // close parent after trade
        }}
        trade={prefilledTrade}
      />
    </>
  );
}

function StatRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 bg-muted/40 rounded-md px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${className}`}>{value}</span>
    </div>
  );
}
