"use client";

import {
  endOfMonth,
  endOfYear,
  format as formatDate,
  parseISO,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { cn } from "@/components/component.utils";

const iso = (date: Date) => formatDate(date, "yyyy-MM-dd");

const datePresets = [
  {
    key: "today",
    label: "Today",
    short: "T",
    range: () => {
      const now = new Date();
      return [iso(now), iso(now)] as const;
    },
  },
  {
    key: "this-month",
    label: "This month",
    short: "TM",
    range: () => {
      const now = new Date();
      return [iso(startOfMonth(now)), iso(endOfMonth(now))] as const;
    },
  },
  {
    key: "last-month",
    label: "Last month",
    short: "LM",
    range: () => {
      const previous = subMonths(new Date(), 1);
      return [iso(startOfMonth(previous)), iso(endOfMonth(previous))] as const;
    },
  },
  {
    key: "this-year",
    label: "This year",
    short: "TY",
    range: () => {
      const now = new Date();
      return [iso(startOfYear(now)), iso(endOfYear(now))] as const;
    },
  },
  {
    key: "last-year",
    label: "Last year",
    short: "LY",
    range: () => {
      const previous = subYears(new Date(), 1);
      return [iso(startOfYear(previous)), iso(endOfYear(previous))] as const;
    },
  },
];

export function formatDashboardDateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  const format = (value?: string) => (value ? formatDate(parseISO(value), "MMM d, yyyy") : "...");
  return `${format(from)} - ${format(to)}`;
}

export function DashboardDateRangePicker({
  from,
  to,
  onApply,
  onClear,
}: {
  from?: string;
  to?: string;
  onApply: (from?: string, to?: string) => void;
  onClear: () => void;
}) {
  const matchedPreset = datePresets.find((preset) => {
    const [presetFrom, presetTo] = preset.range();
    return presetFrom === from && presetTo === to;
  })?.key;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-5 gap-1">
        {datePresets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            title={preset.label}
            aria-label={preset.label}
            onClick={() => {
              const [presetFrom, presetTo] = preset.range();
              onApply(presetFrom, presetTo);
            }}
            className={cn(
              "h-8 rounded-md border text-[11px] font-semibold tabular-nums transition-colors",
              matchedPreset === preset.key
                ? "border-[color:var(--brand-from)]/40 bg-[color:var(--brand-from)]/15 text-text-primary"
                : "border-border bg-[color:var(--surface-1)] text-text-secondary hover:bg-[color:var(--surface-2)] hover:text-text-primary",
            )}
          >
            {preset.short}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          From
          <Input
            type="date"
            value={from ?? ""}
            onChange={(event) => onApply(event.target.value || undefined, to)}
            className="h-8 text-sm"
          />
        </label>
        <span className="pb-2 text-xs text-text-tertiary">to</span>
        <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          To
          <Input
            type="date"
            value={to ?? ""}
            onChange={(event) => onApply(from, event.target.value || undefined)}
            className="h-8 text-sm"
          />
        </label>
      </div>
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
