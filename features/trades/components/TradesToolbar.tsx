"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import type { TradePlatformOption, TradeSymbolOption } from "../types";

export function TradesToolbar({
  symbols,
  platforms,
  actionFilter,
  symbolFilter,
  platformFilter,
  dateFrom,
  dateTo,
  setActionFilter,
  setSymbolFilter,
  setPlatformFilter,
  setDateFrom,
  setDateTo,
  resetPage,
}: {
  symbols: TradeSymbolOption[];
  platforms: TradePlatformOption[];
  actionFilter: string;
  symbolFilter: string;
  platformFilter: string;
  dateFrom: string;
  dateTo: string;
  setActionFilter: (value: string) => void;
  setSymbolFilter: (value: string) => void;
  setPlatformFilter: (value: string) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  resetPage: () => void;
}) {
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");

  function updateDateRange(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
    resetPage();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full flex-wrap items-center gap-2">
        <Popover open={symbolOpen} onOpenChange={setSymbolOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[150px] justify-between font-normal">
              {symbolFilter === "all"
                ? "All Symbols"
                : symbols.find((symbol) => symbol.id === symbolFilter)?.ticker || "All Symbols"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] border p-0 shadow-lg">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search symbol..."
                className="flex h-11 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                value={symbolSearch}
                onChange={(event) => setSymbolSearch(event.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1">
              <Button
                variant="ghost"
                className="w-full justify-start font-normal"
                onClick={() => {
                  setSymbolFilter("all");
                  setSymbolOpen(false);
                  resetPage();
                }}
              >
                All Symbols
              </Button>
              {symbols
                .filter((symbol) => symbol.ticker.toLowerCase().includes(symbolSearch.toLowerCase()))
                .sort((a, b) => a.ticker.localeCompare(b.ticker))
                .map((symbol) => (
                  <Button
                    key={symbol.id}
                    variant="ghost"
                    className="w-full justify-start font-normal"
                    onClick={() => {
                      setSymbolFilter(symbol.id);
                      setSymbolOpen(false);
                      resetPage();
                    }}
                  >
                    {symbol.ticker}
                  </Button>
                ))}
            </div>
          </PopoverContent>
        </Popover>

        <Select
          value={platformFilter}
          onValueChange={(value) => {
            setPlatformFilter(value);
            resetPage();
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map((platform) => (
              <SelectItem key={platform.id} value={platform.id}>
                {platform.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-[color:var(--surface-1)] px-2 py-1.5">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Trade date</span>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  resetPage();
                }}
                className="h-8 w-[138px] text-xs"
                aria-label="Trade date from"
              />
              <span className="text-xs text-text-tertiary">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  resetPage();
                }}
                className="h-8 w-[138px] text-xs"
                aria-label="Trade date to"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const today = format(new Date(), "yyyy-MM-dd");
              updateDateRange(today, today);
            }}
          >
            T
          </Button>
          {(dateFrom || dateTo) && (
            <Button type="button" variant="ghost" size="sm" onClick={() => updateDateRange("", "")}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <Tabs
        defaultValue="all"
        value={actionFilter}
        onValueChange={(value) => {
          setActionFilter(value);
          resetPage();
        }}
        className="w-full rounded-lg sm:w-auto"
      >
        <TabsList className="grid w-full min-w-[260px] grid-cols-3 sm:w-auto">
          <TabsTrigger value="all">All Actions</TabsTrigger>
          <TabsTrigger value="buy">Buy</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
