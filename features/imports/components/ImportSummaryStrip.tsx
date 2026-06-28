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
    <div className="flex flex-wrap gap-2">
      {LABELS.map(([filter, label]) => (
        <button
          key={filter}
          type="button"
          className={cn(
            "flex h-10 min-w-[92px] items-center justify-between gap-3 rounded-md border border-border bg-[color:var(--surface-1)] px-3 text-left transition-colors hover:bg-[color:var(--surface-2)]",
            activeFilter === filter && "border-[color:var(--info)] bg-[color:var(--info-soft)]",
          )}
          onClick={() => onFilterChange(filter)}
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{label}</span>
          <span className="font-tabular text-base font-semibold text-text-primary">
            {countFor(filter, preview, selectedCount)}
          </span>
        </button>
      ))}
    </div>
  );
}
