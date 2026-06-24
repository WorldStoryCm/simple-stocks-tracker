"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import { formatAmount, formatPrice } from "@/lib/currency";
import type { SortDir, SortField, Trade } from "./types";

export const COLUMN_SIZES = {
  date: 120,
  action: 90,
  symbol: 100,
  platform: 90,
  price: 110,
  quantity: 110,
  total: 130,
  pnl: 130,
  actions: 56,
};

export const TRADE_TABLE_MIN_WIDTH = Object.values(COLUMN_SIZES).reduce((sum, size) => sum + size, 0);

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
}) {
  if (sortField !== field) {
    return <ArrowUpDown className="ml-1.5 inline h-3.5 w-3.5 opacity-30" />;
  }
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1.5 inline h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="ml-1.5 inline h-3.5 w-3.5" />
  );
}

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  return (
    <span className="cursor-pointer" onClick={() => onSort(field)}>
      {label}
      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
    </span>
  );
}

export function useTradesColumns({
  sortField,
  sortDir,
  onSort,
  onEdit,
  onDelete,
}: {
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
}) {
  return useMemo<ColumnDef<Trade>[]>(
    () => [
      {
        id: "tradeDate",
        header: () => (
          <SortHeader field="tradeDate" label="Trade date" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        ),
        size: COLUMN_SIZES.date,
        cell: ({ row }) => format(new Date(row.original.tradeDate), "MMM d, yyyy"),
      },
      {
        id: "tradeType",
        header: () => (
          <SortHeader field="tradeType" label="Action" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        ),
        size: COLUMN_SIZES.action,
        cell: ({ row }) => {
          const isBuy = row.original.tradeType === "buy";
          return (
            <span
              className={
                "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
                (isBuy
                  ? "bg-[color:var(--positive-soft)] text-[color:var(--positive)]"
                  : "bg-[color:var(--negative-soft)] text-[color:var(--negative)]")
              }
            >
              {row.original.tradeType}
            </span>
          );
        },
      },
      {
        id: "symbol",
        header: () => (
          <SortHeader field="symbolId" label="Symbol" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        ),
        size: COLUMN_SIZES.symbol,
        cell: ({ row }) => <span className="font-semibold">{row.original.symbol.ticker}</span>,
      },
      {
        id: "platform",
        header: () => (
          <SortHeader field="platformId" label="Platform" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        ),
        size: COLUMN_SIZES.platform,
        cell: ({ row }) => <span className="text-text-secondary">{row.original.platform.name}</span>,
      },
      {
        id: "price",
        header: () => (
          <SortHeader field="price" label="Price" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        ),
        size: COLUMN_SIZES.price,
        meta: { align: "right" } as const,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatPrice(Number(row.original.price), row.original.currencyCode || "USD")}
          </span>
        ),
      },
      {
        id: "quantity",
        header: () => (
          <SortHeader field="quantity" label="Qty" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        ),
        size: COLUMN_SIZES.quantity,
        meta: { align: "right" } as const,
        cell: ({ row }) => <span className="tabular-nums">{Number(row.original.quantity).toFixed(4)}</span>,
      },
      {
        id: "total",
        header: () => (
          <SortHeader field="total" label="Total" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        ),
        size: COLUMN_SIZES.total,
        meta: { align: "right" } as const,
        cell: ({ row }) => (
          <span className="tabular-nums font-semibold">
            {formatAmount(Number(row.original.quantity) * Number(row.original.price), row.original.currencyCode || "USD")}
          </span>
        ),
      },
      {
        id: "pnl",
        header: () => <span>P/L</span>,
        size: COLUMN_SIZES.pnl,
        meta: { align: "right" } as const,
        cell: ({ row }) => {
          const trade = row.original;
          if (trade.tradeType === "buy") return <span className="text-text-tertiary">-</span>;
          const pnl = trade.realizedPnl != null ? Number(trade.realizedPnl) : null;
          if (pnl == null) return <span className="text-text-tertiary">-</span>;
          const cls = pnl >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]";
          return (
            <span className={`tabular-nums font-semibold ${cls}`}>
              {pnl >= 0 ? "+" : ""}
              {formatAmount(pnl, trade.currencyCode || "USD")}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        size: COLUMN_SIZES.actions,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>Edit Trade</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(row.original.id)} className="text-destructive">
                Delete Trade
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onDelete, onEdit, onSort, sortDir, sortField],
  );
}
