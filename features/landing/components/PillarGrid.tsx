import { Layers, TrendingUp, LineChart, Trophy, Activity, Eye, FileSpreadsheet } from "lucide-react";

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
    body: "Log every buy and sell across Revolut, IBKR, whatever you use. One ledger, no spreadsheet.",
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
    title: "RSI badges everywhere",
    body: "The same RSI signal on your watchlist, your open positions, and your shadow cases.",
  },
  {
    icon: Eye,
    title: "Shadow Trading",
    body: "Track ideas you didn't act on. Freeze the entry context. Review honestly later.",
  },
  {
    icon: FileSpreadsheet,
    title: "Import & export",
    body: "Bring your history in from a CSV or Excel file. Export anytime — your data stays yours.",
    badge: "Coming soon",
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
          Six things it does well. Nothing it doesn't.
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
