"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { itemStatusValues } from "@/features/items/schema";

interface FilterItem {
  id: string;
  name: string;
}

interface ItemFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  categories?: FilterItem[];
  categoryFilter?: string;
  onCategoryFilterChange?: (value: string) => void;
  locations?: FilterItem[];
  locationFilter?: string;
  onLocationFilterChange?: (value: string) => void;
}

export function ItemFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search items...",
  statusFilter,
  onStatusFilterChange,
  categories,
  categoryFilter,
  onCategoryFilterChange,
  locations,
  locationFilter,
  onLocationFilterChange,
}: ItemFilterBarProps) {
  const activeFilterCount =
    (statusFilter && statusFilter !== "all" ? 1 : 0) +
    (categoryFilter && categoryFilter !== "all" ? 1 : 0) +
    (locationFilter && locationFilter !== "all" ? 1 : 0);

  const clearFilters = () => {
    onStatusFilterChange?.("all");
    onCategoryFilterChange?.("all");
    onLocationFilterChange?.("all");
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {statusFilter !== undefined && onStatusFilterChange && (
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {itemStatusValues.map((status) => (
              <SelectItem key={status} value={status}>
                <span className="capitalize">{status}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(categories?.length ?? 0) > 0 && categoryFilter !== undefined && onCategoryFilterChange && (
        <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="none">No category</SelectItem>
            {(categories ?? []).map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(locations?.length ?? 0) > 0 && locationFilter !== undefined && onLocationFilterChange && (
        <Select value={locationFilter} onValueChange={onLocationFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            <SelectItem value="none">No location</SelectItem>
            {(locations ?? []).map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground gap-1"
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
          <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-medium">
            {activeFilterCount}
          </span>
        </Button>
      )}
    </div>
  );
}
