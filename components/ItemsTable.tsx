"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/checkbox";
import { formatRelativeDate } from "@/lib/format-date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive" | "info"> =
  {
    active: "success",
    consumed: "warning",
    archived: "secondary",
    broken: "destructive",
    sold: "info",
  };

export type ItemRow = {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  status: string;
  quantityDefault?: number | null;
  updatedAt: string | Date;
  category?: { name: string } | null;
  location?: { id?: string; name: string } | null;
  coverImageUrl?: string | null;
};

interface ItemsTableProps {
  items: ItemRow[];
  showLocation?: boolean;
  showCheckbox?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleAll?: () => void;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
}

export function ItemsTable({
  items,
  showLocation = true,
  showCheckbox = false,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  emptyIcon,
  emptyMessage = "No items found.",
}: ItemsTableProps) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        {emptyIcon ?? (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <p className="mt-4 text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const allSelected = items.length > 0 && (selectedIds?.size ?? 0) === items.length;

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {showCheckbox && (
              <TableHead className="w-10 pl-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onToggleAll}
                  aria-label="Select all items"
                />
              </TableHead>
            )}
            <TableHead className="w-[60px] pr-0"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            {showLocation && <TableHead>Location</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right pr-4">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="animate-stagger-in">
          {items.map((item) => {
            const isSelected = selectedIds?.has(item.id) ?? false;
            return (
              <TableRow key={item.id} className={isSelected ? "bg-muted/50" : ""}>
                {showCheckbox && (
                  <TableCell className="pl-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect?.(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                  </TableCell>
                )}
                <TableCell className="w-[60px] pr-0">
                  <Link href={`/items/${item.id}`}>
                    {item.coverImageUrl ? (
                      <img
                        src={item.coverImageUrl}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/items/${item.id}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                  {(item.brand || item.model) && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {[item.brand, item.model].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.category?.name ?? "\u2014"}
                </TableCell>
                {showLocation && (
                  <TableCell className="text-muted-foreground">
                    {item.location?.name ?? "\u2014"}
                  </TableCell>
                )}
                <TableCell>
                  <Badge
                    variant={STATUS_VARIANT[item.status] ?? "secondary"}
                    className="capitalize"
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.quantityDefault ?? "\u2014"}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground pr-4">
                  {formatRelativeDate(item.updatedAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
