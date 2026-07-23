import { ChartNoAxesCombined, LockKeyhole } from "lucide-react";
import { Button } from "@/components/button";

export function SessionEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[460px] items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-card/40 px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--info-soft)] text-[color:var(--info)]">
          <ChartNoAxesCombined className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-xl font-semibold">Plan the trade before touching the ledger</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Freeze a current or manual position, test exit prices, then record partial buys and sells
          for this session only.
        </p>
        <Button className="mt-6" onClick={onCreate}>Start your first session</Button>
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-text-tertiary">
          <LockKeyhole className="h-3.5 w-3.5" />
          No Trades or Positions data will be changed
        </span>
      </div>
    </div>
  );
}
