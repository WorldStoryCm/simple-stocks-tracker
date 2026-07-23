"use client";

import { cn } from "@/components/component.utils";
import type { ImportPreview, ImportStatus } from "../types";

const LABELS = [
  ["all", "All"],
  ["new", "New"],
  ["matched", "Matched"],
  ["possible_match", "Possible"],
  ["needs_review", "Blocked"],
  ["ignored", "Ignored"],
  ["selected", "Selected"],
] as const;

export type ImportFilter = ImportStatus | "all" | "selected";

function countFor(filter: ImportFilter, preview: ImportPreview | undefined, selectedCount: number) {
  if (filter === "all") return preview?.rows.length ?? 0;
  if (filter === "selected") return selectedCount;
  return preview?.summary[filter] ?? 0;
}

export function ImportSummaryStrip({
  preview,
  selectedCount,
  activeFilter,
  onFilterChange,
}: {
  preview?: ImportPreview;
  selectedCount: number;
  activeFilter: ImportFilter;
  onFilterChange: (filter: ImportFilter) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-gutter:stable] sm:flex-wrap sm:overflow-visible sm:pb-0">
      {LABELS.map(([filter, label]) => (
        <button
          key={filter}
          type="button"
          className={cn(
            "flex h-9 min-w-[84px] shrink-0 items-center justify-between gap-2 rounded-md border border-border bg-[color:var(--surface-1)] px-2.5 text-left transition-colors hover:bg-[color:var(--surface-2)] sm:h-10 sm:min-w-[92px] sm:gap-3 sm:px-3",
            activeFilter === filter && "border-[color:var(--info)] bg-[color:var(--info-soft)]",
          )}
          onClick={() => onFilterChange(filter)}
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{label}</span>
          <span className="font-tabular text-sm font-semibold text-text-primary sm:text-base">
            {countFor(filter, preview, selectedCount)}
          </span>
        </button>
      ))}
    </div>
  );
}
