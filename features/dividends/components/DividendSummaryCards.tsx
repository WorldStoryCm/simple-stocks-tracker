"use client";

import { Card, CardContent } from "@/components/card";
import { formatAmount } from "@/lib/currency";

function SummaryCard({
  label,
  value,
  currencyCode,
  tone = "default",
}: {
  label: string;
  value: number;
  currencyCode: string;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass = tone === "positive"
    ? "text-[color:var(--positive)]"
    : tone === "negative"
      ? "text-[color:var(--negative)]"
      : "text-text-primary";

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">{label}</span>
        <span className={`font-tabular text-2xl font-semibold tracking-tight ${toneClass}`}>
          {formatAmount(value, currencyCode)}
        </span>
      </CardContent>
    </Card>
  );
}

export function DividendSummaryCards({
  summary,
  loading,
}: {
  summary?: {
    currencyCode: string;
    grossDividends: number;
    dividendTax: number;
    netDividends: number;
    eventCount: number;
  };
  loading?: boolean;
}) {
  const currencyCode = summary?.currencyCode ?? "USD";
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card loading={loading}>
        <CardContent className="flex flex-col gap-2 p-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Events</span>
          <span className="font-tabular text-2xl font-semibold tracking-tight text-text-primary">
            {summary?.eventCount ?? 0}
          </span>
        </CardContent>
      </Card>
      <SummaryCard label="Gross dividends" value={summary?.grossDividends ?? 0} currencyCode={currencyCode} tone="positive" />
      <SummaryCard label="Dividend tax" value={summary?.dividendTax ?? 0} currencyCode={currencyCode} tone="negative" />
      <SummaryCard label="Net dividends" value={summary?.netDividends ?? 0} currencyCode={currencyCode} tone="positive" />
    </div>
  );
}
