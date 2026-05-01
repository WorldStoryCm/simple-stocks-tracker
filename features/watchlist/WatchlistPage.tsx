"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Trash2 } from "lucide-react";
import { WatchlistDialog } from "@/components/watchlist/WatchlistDialog";
import { Card, CardContent } from "@/components/card";
import {Button} from "@/components/button";

export function WatchlistPage() {
  const { data: items, isLoading } = trpc.watchlist.list.useQuery();
  const utils = trpc.useUtils?.() || trpc.useContext?.();

  // Get real-time quotes for all symbols in the watchlist
  const tickers = useMemo(() => {
    if (!items) return [];
    return Array.from(new Set(items.map(i => i.symbol)));
  }, [items]);

  const { data: quotes } = trpc.quotes.getMany.useQuery({ tickers }, {
    enabled: tickers.length > 0,
    refetchInterval: 60000 // Refetch every 1 minute
  });

  const deleteMutation = trpc.watchlist.delete.useMutation({
    onSuccess: () => {
      utils.watchlist?.list?.invalidate();
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
          <p className="text-text-tertiary text-sm mt-1">Track potential setups and theses.</p>
        </div>
        <WatchlistDialog />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin text-muted-foreground w-8 h-8" />
        </div>
      ) : items?.length === 0 ? (
        <div className="flex flex-col items-center justify-center border rounded-lg p-12 bg-muted/20 border-dashed">
          <p className="text-muted-foreground mb-4 text-center">Your watchlist is empty.</p>
          <WatchlistDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items?.map((item) => {
            const quote = quotes?.[item.symbol];
            
            return (
              <Card key={item.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        {item.symbol}
                        {item.status === 'ready' && <span className="bg-[color:var(--positive-soft)] text-[color:var(--positive)] text-[10px] px-2 py-0.5 rounded-full">Ready</span>}
                      </h3>
                      {item.platform && <p className="text-xs text-text-tertiary mt-1">{item.platform}</p>}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold font-tabular">${quote?.price?.toFixed(2) || "---"}</div>
                      {quote && (
                        <div className={`text-xs font-medium font-tabular ${quote.changePercent >= 0 ? 'text-[color:var(--positive)]' : 'text-[color:var(--negative)]'}`}>
                          {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>

                  {(item.targetBuyPrice || item.thesis) && (
                    <div className="space-y-3 bg-muted/30 p-3 rounded-md text-sm mb-4">
                      {item.targetBuyPrice && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs uppercase tracking-wider">Target Entry</span>
                          <span className="font-medium">${Number(item.targetBuyPrice).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {item.thesis && (
                        <div>
                          <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Thesis</span>
                          <p className="line-clamp-3 leading-snug">{item.thesis}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[color:var(--negative)] hover:text-[color:var(--negative)] hover:bg-[color:var(--negative-soft)] -mr-2"
                      onClick={() => {
                        if (confirm(`Remove ${item.symbol} from watchlist?`)) {
                          deleteMutation.mutate({ id: item.id });
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
