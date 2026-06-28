import { Layers, TrendingUp, LineChart, Trophy, Activity, FileSpreadsheet, Banknote } from "lucide-react";

interface Pillar {
  icon: typeof Layers;
  title: string;
  body: string;
  badge?: string;
}

const pillars: Pillar[] = [
  {
    icon: Layers,
    title: "Multi-platform ledger",
    body: "Keep Revolut, IBKR, and manual trades in one ledger with platform-level cash balances.",
  },
  {
    icon: FileSpreadsheet,
    title: "Broker import preview",
    body: "Import Revolut CSV exports, see matched vs missing rows, and rollback a batch if needed.",
  },
  {
    icon: TrendingUp,
    title: "Realized & unrealized P/L",
    body: "FIFO matching. Deterministic. Every figure traces back to the raw trade that produced it.",
  },
  {
    icon: LineChart,
    title: "Capital curves",
    body: "Cumulative P/L over 1M, 3M, 1Y, and all-time. See whether the line is going up.",
  },
  {
    icon: Trophy,
    title: "Wins & losses",
    body: "Win rate, P/L by symbol, recent trades, performance per day, week, month, year.",
  },
  {
    icon: Activity,
    title: "RSI context",
    body: "See the same RSI state on watchlist symbols and open positions before you decide what to do.",
  },
  {
    icon: Banknote,
    title: "Dividends",
    body: "Track dividends and withholding tax separately from trade P/L.",
  },
];

export function PillarGrid() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 lg:px-8 py-16 sm:py-24">
      <div className="max-w-2xl">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Built like a journal, not a brokerage.
        </h2>
        <p className="mt-3 text-text-secondary">
          Import, review, track, and keep the numbers auditable.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pillars.map(({ icon: Icon, title, body, badge }) => (
          <div
            key={title}
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-1)] p-5 hover:bg-[color:var(--surface-2)] transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border)]">
                <Icon className="h-5 w-5 text-text-primary" strokeWidth={1.8} />
              </div>
              {badge ? (
                <span className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">
                  {badge}
                </span>
              ) : null}
            </div>
            <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
            <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
