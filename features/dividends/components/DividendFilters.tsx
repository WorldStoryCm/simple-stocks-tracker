"use client";

import { format } from "date-fns";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import type { DividendPlatformOption, DividendSymbolOption } from "../types";

export function DividendFilters({
  platforms,
  symbols,
  eventType,
  platformId,
  symbolId,
  dateFrom,
  dateTo,
  setEventType,
  setPlatformId,
  setSymbolId,
  setDateFrom,
  setDateTo,
  resetPage,
}: {
  platforms: DividendPlatformOption[];
  symbols: DividendSymbolOption[];
  eventType: string;
  platformId: string;
  symbolId: string;
  dateFrom: string;
  dateTo: string;
  setEventType: (value: string) => void;
  setPlatformId: (value: string) => void;
  setSymbolId: (value: string) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  resetPage: () => void;
}) {
  function updateDateRange(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
    resetPage();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={platformId}
          onValueChange={(value) => {
            setPlatformId(value);
            resetPage();
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map((platform) => (
              <SelectItem key={platform.id} value={platform.id}>{platform.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={symbolId}
          onValueChange={(value) => {
            setSymbolId(value);
            resetPage();
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Symbols" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Symbols</SelectItem>
            {symbols.map((symbol) => (
              <SelectItem key={symbol.id} value={symbol.id}>{symbol.ticker}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-[color:var(--surface-1)] px-2 py-1.5">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Event date</span>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  resetPage();
                }}
                className="h-8 w-[138px] text-xs"
                aria-label="Dividend date from"
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
                aria-label="Dividend date to"
              />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => updateDateRange(format(new Date(), "yyyy-MM-dd"), format(new Date(), "yyyy-MM-dd"))}>
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
        value={eventType}
        onValueChange={(value) => {
          setEventType(value);
          resetPage();
        }}
        className="w-full rounded-lg sm:w-auto"
      >
        <TabsList className="grid w-full min-w-[280px] grid-cols-3 sm:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="dividend">Dividends</TabsTrigger>
          <TabsTrigger value="dividend_tax">Tax</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
