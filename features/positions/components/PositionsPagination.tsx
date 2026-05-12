"use client";

import { Button } from "@/components/button";

export function PositionsPagination({
  page,
  totalPages,
  total,
  unitLabel,
  isLoading,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  unitLabel: string;
  isLoading: boolean;
  onPage: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="text-sm text-muted-foreground">
        Showing page {page} of {totalPages} ({total} {unitLabel})
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1 || isLoading}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || isLoading}>Next</Button>
      </div>
    </div>
  );
}
