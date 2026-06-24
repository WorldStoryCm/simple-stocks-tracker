"use client";

import { AddTradeButton } from "@/components/trades/AddTradeButton";
import { DashboardDateRangePicker, formatDashboardDateRange } from "./DashboardDateRangePicker";
import { FilterPill, ListPicker } from "./DashboardFilterControls";
import type { DashboardFilters, DashboardPlatform, DashboardSymbol } from "../types";

export function DashboardFilterRow({
  filters,
  setFilters,
  platforms,
  symbols,
}: {
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  platforms: DashboardPlatform[];
  symbols: DashboardSymbol[];
}) {
  const platformLabel = filters.platformId
    ? platforms.find((platform) => platform.id === filters.platformId)?.name ?? "-"
    : "All";
  const symbolLabel = filters.symbolId
    ? symbols.find((symbol) => symbol.id === filters.symbolId)?.ticker ?? "-"
    : "All";
  const dateLabel = formatDashboardDateRange(filters.dateFrom, filters.dateTo) ?? "All";
  const anyActive = !!filters.platformId || !!filters.symbolId || !!filters.dateFrom || !!filters.dateTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterPill
        label="Platform"
        value={platformLabel}
        active={!!filters.platformId}
        onClear={() => setFilters((value) => ({ ...value, platformId: undefined }))}
      >
        <ListPicker
          options={platforms.map((platform) => ({ id: platform.id, label: platform.name }))}
          selected={filters.platformId}
          onSelect={(id) => setFilters((value) => ({ ...value, platformId: id }))}
          placeholder="Search platform..."
        />
      </FilterPill>
      <FilterPill
        label="Date Range"
        value={dateLabel}
        active={!!filters.dateFrom || !!filters.dateTo}
        onClear={() => setFilters((value) => ({ ...value, dateFrom: undefined, dateTo: undefined }))}
      >
        <DashboardDateRangePicker
          from={filters.dateFrom}
          to={filters.dateTo}
          onApply={(dateFrom, dateTo) => setFilters((value) => ({ ...value, dateFrom, dateTo }))}
          onClear={() => setFilters((value) => ({ ...value, dateFrom: undefined, dateTo: undefined }))}
        />
      </FilterPill>
      <FilterPill
        label="Symbol"
        value={symbolLabel}
        active={!!filters.symbolId}
        onClear={() => setFilters((value) => ({ ...value, symbolId: undefined }))}
      >
        <ListPicker
          options={symbols.map((symbol) => ({ id: symbol.id, label: symbol.ticker }))}
          selected={filters.symbolId}
          onSelect={(id) => setFilters((value) => ({ ...value, symbolId: id }))}
          placeholder="Search symbol..."
        />
      </FilterPill>
      {anyActive && (
        <button
          type="button"
          onClick={() => setFilters({})}
          className="px-2 text-xs text-text-tertiary transition-colors hover:text-text-primary"
        >
          Reset
        </button>
      )}
      <div className="ml-auto flex items-center gap-2">
        <AddTradeButton size="sm" />
      </div>
    </div>
  );
}
