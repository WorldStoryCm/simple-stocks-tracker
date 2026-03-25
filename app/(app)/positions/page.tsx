"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/dropdown-menu";
import { TradeDialog } from "@/components/trades/TradeDialog";

export default function PositionsPage() {
  const { data: positions, isLoading } = trpc.positions.list.useQuery();

  const openPositions = positions?.filter((p: any) => p.openQty > 0) || [];

  const tickers = useMemo(() => {
    return Array.from(new Set(openPositions.map((p: any) => p.symbol.ticker)));
  }, [openPositions]);

  const { data: quotes } = trpc.quotes.getMany.useQuery({ tickers }, {
    enabled: tickers.length > 0,
    refetchInterval: 60000 // Refetch every 1 minute
  });

  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [prefilledTrade, setPrefilledTrade] = useState<any>(null);

  const handleQuickAction = (pos: any, type: "buy" | "sell") => {
    setPrefilledTrade({
      platformId: pos.platform?.id,
      symbolId: pos.symbol?.id,
      bucketId: pos.bucket?.id,
      tradeType: type,
    });
    setIsTradeDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Unrealized Positions</h1>
        <p className="text-muted-foreground mt-1">Current open exposure and live market values.</p>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Bucket</TableHead>
              <TableHead className="text-right">Open Qty</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Invested</TableHead>
              <TableHead className="text-right">Live Price</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="text-right">Unrealized P/L</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : openPositions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No open positions found. Buy some stocks to see them here.
                </TableCell>
              </TableRow>
            ) : (
              openPositions.map((pos: any, idx) => {
                const quote = quotes?.[pos.symbol.ticker];
                const marketPrice = quote?.price || Number(pos.avgCost);
                const currentVal = Number(pos.openQty) * marketPrice;
                const investedAmount = Number(pos.investedAmount);
                const pnl = currentVal - investedAmount;
                const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

                return (
                  <TableRow key={idx}>
                    <TableCell className="font-bold">{pos.symbol.ticker}</TableCell>
                    <TableCell>{pos.platform.name}</TableCell>
                    <TableCell>{pos.bucket.label}</TableCell>
                    <TableCell className="text-right font-mono">{Number(pos.openQty).toFixed(4)}</TableCell>
                    <TableCell className="text-right">${Number(pos.avgCost).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${investedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${marketPrice.toFixed(2)}
                      {quote && <span className={`ml-1 text-xs ${quote.changePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                        ({quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                      </span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">${currentVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={`text-right font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-xs ml-1 opacity-75">({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleQuickAction(pos, 'buy')}>
                            Buy More
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickAction(pos, 'sell')}>
                            Sell Position
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TradeDialog
        open={isTradeDialogOpen}
        onOpenChange={setIsTradeDialogOpen}
        trade={prefilledTrade}
      />
    </div>
  );
}
