"use client";

import { cn } from "@/components/component.utils";
import type { ImportPreviewRow } from "../types";
import { ImportPreviewTableRow } from "./ImportPreviewTableRow";

export function ImportPreviewTable({
  rows,
  selected,
  toggle,
  replaceHistory,
  className,
}: {
  rows: ImportPreviewRow[];
  selected: Set<string>;
  toggle: (rowHash: string, checked: boolean) => void;
  replaceHistory?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-h-[280px] overflow-y-auto overflow-x-hidden rounded-md border border-border", className)}>
      <table className="w-full table-fixed text-xs">
        <colgroup>
          <col className="w-9" />
          <col className="w-11" />
          <col className="w-[82px]" />
          <col className="w-[58px]" />
          <col className="w-[88px]" />
          <col className="w-[62px]" />
          <col className="w-[78px]" />
          <col className="w-[86px]" />
          <col className="w-[104px]" />
          <col className="w-[104px]" />
          <col />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-[color:var(--surface-2)]">
          <tr className="border-b border-border">
            <th className="px-2 py-2 text-left"></th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Row</th>
            <th
              className="cursor-help px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary"
              title="Status: new imports by default, matched is duplicate, possible needs review, blocked needs manual action."
            >
              Status
            </th>
            <th
              className="cursor-help px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary"
              title="Act: A = add/import, D = duplicate/skip, R = review, I = ignored."
            >
              Act
            </th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Date</th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Type</th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Symbol</th>
            <th className="px-2 py-2 text-right font-medium uppercase tracking-wide text-text-tertiary">Qty</th>
            <th className="px-2 py-2 text-right font-medium uppercase tracking-wide text-text-tertiary">Amount</th>
            <th className="px-2 py-2 text-right font-medium uppercase tracking-wide text-text-tertiary">Cash</th>
            <th className="px-2 py-2 text-left font-medium uppercase tracking-wide text-text-tertiary">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-3 py-8 text-center text-text-tertiary">No preview rows yet.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <ImportPreviewTableRow
                key={`${row.rowIndex}-${row.rowHash}`}
                row={row}
                selected={selected}
                toggle={toggle}
                replaceHistory={replaceHistory === true}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
