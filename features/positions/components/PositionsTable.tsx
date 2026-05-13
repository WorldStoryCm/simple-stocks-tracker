"use client";

import { MoreHorizontal, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/dropdown-menu";
import { RsiBadge } from "@/components/rsi/RsiBadge";
import { formatAmount, formatPrice } from "@/lib/currency";

export type PositionsSortField =
  | "symbol"
  | "platform"
  | "qty"
  | "cost"
  | "invested"
  | "price"
  | "value";

export type PositionsSortDir = "asc" | "desc";

export type RsiMapEntry = {
  rsi: number | null;
  error?: "not_found" | "fetch_failed" | "insufficient_data";
  via?: string;
  history?: number[];
};

// Fixed widths prevent layout jump when quotes/RSI populate async.
const COLUMN_SIZES = {
  symbol: 110,
  platform: 130,
  qty: 110,
  cost: 120,
  invested: 130,
  price: 160,
  rsi: 180,
  value: 140,
  actions: 56,
};
const COL_TOTAL = Object.values(COLUMN_SIZES).reduce((a, b) => a + b, 0);

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: PositionsSortField;
  sortField: PositionsSortField;
  sortDir: PositionsSortDir;
}) {
  if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-20" />;
  return sortDir === "asc"
    ? <ArrowUp className="ml-2 h-4 w-4 inline" />
    : <ArrowDown className="ml-2 h-4 w-4 inline" />;
}

export function PositionsTable({
  positions,
  isLoading,
  quotes,
  rsiMap,
  sortField,
  sortDir,
  onToggleSort,
  onViewPosition,
  onQuickAction,
  onAggregateDrill,
  onBacktest,
}: {
  positions: any[];
  isLoading: boolean;
  quotes: any;
  rsiMap: Record<string, RsiMapEntry>;
  sortField: PositionsSortField;
  sortDir: PositionsSortDir;
  onToggleSort: (field: PositionsSortField) => void;
  onViewPosition: (pos: any) => void;
  onQuickAction: (pos: any, type: "buy" | "sell") => void;
  onAggregateDrill: (pos: any) => void;
  onBacktest: (ticker: { ticker: string; rsiTicker: string | null }) => void;
}) {
  const headCls = "h-10 px-3 align-middle text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-tertiary whitespace-nowrap cursor-pointer hover:bg-[color:var(--surface-2)]";
  const headRightCls = `${headCls} text-right`;
  const cellCls = "h-11 px-3 align-middle whitespace-nowrap overflow-hidden text-ellipsis";

  const colCount = Object.keys(COLUMN_SIZES).length;

  return (
    <Card
      loading={isLoading}
      className="overflow-x-auto [scrollbar-gutter:stable]"
    >
      <table
        className="w-full text-sm"
        style={{ tableLayout: "fixed", minWidth: COL_TOTAL }}
      >
        <colgroup>
          <col style={{ width: COLUMN_SIZES.symbol }} />
          <col style={{ width: COLUMN_SIZES.platform }} />
          <col style={{ width: COLUMN_SIZES.qty }} />
          <col style={{ width: COLUMN_SIZES.cost }} />
          <col style={{ width: COLUMN_SIZES.invested }} />
          <col style={{ width: COLUMN_SIZES.price }} />
          <col style={{ width: COLUMN_SIZES.rsi }} />
          <col style={{ width: COLUMN_SIZES.value }} />
          <col style={{ width: COLUMN_SIZES.actions }} />
        </colgroup>
        <thead className="bg-[color:var(--surface-2)]/40">
          <tr className="border-b border-border">
            <th className={headCls} onClick={() => onToggleSort("symbol")}>Symbol <SortIcon field="symbol" sortField={sortField} sortDir={sortDir} /></th>
            <th className={headCls} onClick={() => onToggleSort("platform")}>Platform <SortIcon field="platform" sortField={sortField} sortDir={sortDir} /></th>
            <th className={headRightCls} onClick={() => onToggleSort("qty")}>Open Qty <SortIcon field="qty" sortField={sortField} sortDir={sortDir} /></th>
            <th className={headRightCls} onClick={() => onToggleSort("cost")}>Avg Cost <SortIcon field="cost" sortField={sortField} sortDir={sortDir} /></th>
            <th className={headRightCls} onClick={() => onToggleSort("invested")}>Invested <SortIcon field="invested" sortField={sortField} sortDir={sortDir} /></th>
            <th className={headRightCls} onClick={() => onToggleSort("price")}>Live Price <SortIcon field="price" sortField={sortField} sortDir={sortDir} /></th>
            <th className={headCls}>RSI-14</th>
            <th className={headRightCls} onClick={() => onToggleSort("value")}>Total Value <SortIcon field="value" sortField={sortField} sortDir={sortDir} /></th>
            <th className={headCls}></th>
          </tr>
        </thead>
        <tbody className="animate-stagger-in">
          {isLoading ? (
            <tr className="border-b border-border">
              <td colSpan={colCount} className="h-24 text-center" />
            </tr>
          ) : positions.length === 0 ? (
            <tr className="border-b border-border">
              <td colSpan={colCount} className="h-24 text-center text-muted-foreground">
                No open positions found. Buy some stocks to see them here.
              </td>
            </tr>
          ) : (
            positions.map((pos: any, idx) => {
              const quote = quotes?.[pos.symbol.ticker];
              const marketPrice = quote?.price || Number(pos.avgCost);
              const currentVal = Number(pos.openQty) * marketPrice;
              const investedAmount = Number(pos.investedAmount);
              const isAgg = pos._isAggregate;

              return (
                <tr key={idx} className="border-b border-border last:border-0 transition-colors hover:bg-[color:var(--surface-2)]/40">
                  <td className={`${cellCls} font-bold`}>
                    {pos.symbol.ticker}
                    {isAgg && <span className="ml-2 text-xs font-normal text-muted-foreground">({pos._lotCount} lots)</span>}
                  </td>
                  <td className={`${cellCls} ${isAgg && pos.platform.name.includes("platforms") ? "text-muted-foreground italic" : ""}`}>{pos.platform.name}</td>
                  <td className={`${cellCls} text-right tabular-nums font-medium`}>{Number(pos.openQty).toFixed(4)}</td>
                  <td className={`${cellCls} text-right tabular-nums`}>{formatPrice(Number(pos.avgCost), pos.currencyCode || 'USD')}</td>
                  <td className={`${cellCls} text-right tabular-nums`}>{formatAmount(investedAmount, pos.currencyCode || 'USD')}</td>
                  <td className={`${cellCls} text-right font-medium`}>
                    {formatPrice(marketPrice, quote?.currency || pos.currencyCode || 'USD')}
                    {quote && <span className={`ml-1 text-xs ${quote.changePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                      ({quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                    </span>}
                  </td>
                  <td className={cellCls}>
                    {(() => {
                      const entry = rsiMap[pos.symbol.ticker];
                      if (!entry) return <span className="text-xs text-muted-foreground">—</span>;
                      if (entry.rsi == null) {
                        return <RsiBadge rsi={null} error={entry.error ?? null} inline />;
                      }
                      return <RsiBadge rsi={entry.rsi} via={entry.via} history={entry.history} inline />;
                    })()}
                  </td>
                  <td className={`${cellCls} text-right font-medium ${currentVal < investedAmount ? "text-red-500 dark:text-red-400" : ""}`}>{formatAmount(currentVal, quote?.currency || pos.currencyCode || 'USD')}</td>
                  <td className={cellCls}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isAgg ? (
                          <DropdownMenuItem onClick={() => onAggregateDrill(pos)}>
                            View Lots
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => onViewPosition(pos)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onQuickAction(pos, 'buy')}>
                              Buy More
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onQuickAction(pos, 'sell')}>
                              Sell Position
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onBacktest({ ticker: pos.symbol.ticker, rsiTicker: pos.symbol.rsiTicker ?? null })}>
                              Backtest RSI &lt; 35
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </Card>
  );
}
