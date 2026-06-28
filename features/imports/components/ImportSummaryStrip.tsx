"use client";

import type { ImportPreview } from "../types";

const LABELS = [
  ["new", "New"],
  ["matched", "Matched"],
  ["possible_match", "Review"],
  ["needs_review", "Blocked"],
  ["ignored", "Ignored"],
] as const;

export function ImportSummaryStrip({ preview, selectedCount }: { preview?: ImportPreview; selectedCount: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {LABELS.map(([key, label]) => (
        <div key={key} className="rounded-md border border-border bg-[color:var(--surface-1)] px-3 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{label}</div>
          <div className="font-tabular text-lg font-semibold text-text-primary">{preview?.summary[key] ?? 0}</div>
        </div>
      ))}
      <div className="rounded-md border border-border bg-[color:var(--surface-1)] px-3 py-2">
        <div className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Selected</div>
        <div className="font-tabular text-lg font-semibold text-text-primary">{selectedCount}</div>
      </div>
    </div>
  );
}
