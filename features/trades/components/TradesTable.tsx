"use client";

import { flexRender, type ColumnDef, type Table } from "@tanstack/react-table";
import { Card } from "@/components/card";
import type { Trade } from "../types";
import { TRADE_TABLE_MIN_WIDTH } from "../useTradesColumns";

type ColumnMeta = {
  align?: "left" | "right";
};

function getAlign(meta: ColumnDef<Trade>["meta"]) {
  return ((meta ?? {}) as ColumnMeta).align ?? "left";
}

export function TradesTable({
  table,
  columns,
  isLoading,
  tradesCount,
}: {
  table: Table<Trade>;
  columns: ColumnDef<Trade>[];
  isLoading: boolean;
  tradesCount: number;
}) {
  return (
    <Card loading={isLoading} className="overflow-x-auto [scrollbar-gutter:stable]">
      <table className="w-full text-sm" style={{ tableLayout: "fixed", minWidth: TRADE_TABLE_MIN_WIDTH }}>
        <colgroup>
          {table.getVisibleLeafColumns().map((column) => (
            <col key={column.id} style={{ width: column.getSize() }} />
          ))}
        </colgroup>
        <thead className="bg-[color:var(--surface-2)]/40">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => {
                const align = getAlign(header.column.columnDef.meta);
                return (
                  <th
                    key={header.id}
                    className={
                      "h-10 whitespace-nowrap px-3 align-middle text-xs font-medium uppercase tracking-wide text-text-tertiary " +
                      (align === "right" ? "text-right" : "text-left")
                    }
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="h-[360px]" />
            </tr>
          ) : tradesCount === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center text-text-tertiary">
                No trades match the current filters.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border transition-colors last:border-0 hover:bg-[color:var(--surface-2)]/40"
              >
                {row.getVisibleCells().map((cell) => {
                  const align = getAlign(cell.column.columnDef.meta);
                  return (
                    <td
                      key={cell.id}
                      className={
                        "h-11 overflow-hidden text-ellipsis whitespace-nowrap px-3 align-middle " +
                        (align === "right" ? "text-right" : "text-left")
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}
