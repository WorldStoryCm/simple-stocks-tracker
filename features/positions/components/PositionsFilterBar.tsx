"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";

export type PositionsGroupBy = "lot" | "ticker";

export function PositionsFilterBar({
  symbols,
  platforms,
  symbolFilter,
  setSymbolFilter,
  platformFilter,
  setPlatformFilter,
  groupBy,
  setGroupBy,
  actions,
  onChange,
}: {
  symbols: any[] | undefined;
  platforms: any[] | undefined;
  symbolFilter: string;
  setSymbolFilter: (v: string) => void;
  platformFilter: string;
  setPlatformFilter: (v: string) => void;
  groupBy: PositionsGroupBy;
  setGroupBy: (v: PositionsGroupBy) => void;
  actions?: ReactNode;
  onChange?: () => void;
}) {
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap flex-1">
        <Popover open={symbolOpen} onOpenChange={setSymbolOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[150px] justify-between font-normal">
              {symbolFilter === "all" ? "All Symbols" : symbols?.find((s: any) => s.id === symbolFilter)?.ticker || "All Symbols"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 shadow-lg border">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search symbol..."
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
                value={symbolSearch}
                onChange={(e) => setSymbolSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1">
              <Button
                variant="ghost"
                className="w-full justify-start font-normal"
                onClick={() => { setSymbolFilter("all"); setSymbolOpen(false); onChange?.(); }}
              >
                All Symbols
              </Button>
              {symbols?.filter((s: any) => s.ticker.toLowerCase().includes(symbolSearch.toLowerCase())).sort((a: any, b: any) => a.ticker.localeCompare(b.ticker)).map((s: any) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  className="w-full justify-start font-normal"
                  onClick={() => { setSymbolFilter(s.id); setSymbolOpen(false); onChange?.(); }}
                >
                  {s.ticker}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); onChange?.(); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms?.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={groupBy} onValueChange={(v: PositionsGroupBy) => { setGroupBy(v); onChange?.(); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lot">Group: Lot</SelectItem>
            <SelectItem value="ticker">Group: Ticker</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {actions ? (
        <div className="flex w-full items-center justify-end sm:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
