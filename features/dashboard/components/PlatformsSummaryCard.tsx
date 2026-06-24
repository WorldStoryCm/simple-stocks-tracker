"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { fmtPct } from "../lib/format";

export function PlatformsSummaryCard({
  data,
  loading,
}: {
  data: { name: string; value: number }[];
  loading?: boolean;
}) {
  const total = data.reduce((sum, row) => sum + row.value, 0);

  return (
    <Card loading={loading} className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">Platforms Summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-1">
        {data.length === 0 ? (
          <div className="text-sm text-text-tertiary">No platforms.</div>
        ) : (
          data.map((row) => {
            const pct = total > 0 ? (row.value / total) * 100 : 0;
            return (
              <div key={row.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{row.name}</span>
                  <span className="font-tabular text-text-primary">
                    ${row.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="ml-2 text-[color:var(--positive)]">{fmtPct(pct)}</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
                  <div
                    className="h-full rounded-full [background-image:linear-gradient(90deg,var(--brand-from),var(--brand-to))]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
