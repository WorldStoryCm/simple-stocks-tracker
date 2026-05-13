import { Screenshot } from "./Screenshot";

interface Feature {
  slot: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  label: string;
}

const features: Feature[] = [
  {
    slot: "dashboard",
    eyebrow: "Dashboard",
    title: "Your portfolio at a glance.",
    body: "KPIs for the month and all-time, monthly and yearly goals with live progress, and a cumulative P/L chart you can toggle between 1M, 3M, 1Y, and all-time.",
    bullets: ["Monthly + yearly profit goals", "Cumulative P/L chart", "Platforms summary, recent trades, P/L by symbol"],
    label: "Dashboard — KPIs, goals, cumulative P/L, recent trades",
  },
  {
    slot: "positions",
    eyebrow: "Positions",
    title: "Open holdings with context.",
    body: "Live prices, realized vs unrealized P/L, and RSI badges so you know where each position sits before you decide to sell.",
    bullets: ["Table or heatmap view", "Grouped by platform", "RSI state on every row"],
    label: "Positions — table + heatmap with RSI badges",
  },
  {
    slot: "trades",
    eyebrow: "Trades",
    title: "Every buy and sell, filterable.",
    body: "A clean, sortable log with FIFO realized P/L written next to every sell. Filter by symbol, platform, or action. Edit a trade and dependent matches recompute.",
    bullets: ["All Actions / Buy / Sell tabs", "Sort by date, price, qty, P/L", "Edit history without breaking older P/L"],
    label: "Trades — filterable log with FIFO realized P/L",
  },
  {
    slot: "performance",
    eyebrow: "Performance",
    title: "How are you actually doing?",
    body: "Realized P/L and win rate broken out by day, week, month, or year — plus a portfolio growth chart for the long view.",
    bullets: ["Daily / Weekly / Monthly / Yearly tabs", "Win rate per period", "Portfolio growth chart"],
    label: "Performance — periods + win rate + growth chart",
  },
  {
    slot: "symbols",
    eyebrow: "Symbols",
    title: "Your watchlist with RSI signals.",
    body: "Add tickers from a catalog, see live price, daily move, and an RSI badge with the state label. Run a quick RSI-below-35 backtest on any name.",
    bullets: ["Ticker-catalog autocomplete", "Oversold / Neutral / Overbought labels", "One-click RSI backtest"],
    label: "Symbols — watchlist with RSI and backtest",
  },
  {
    slot: "shadow",
    eyebrow: "Shadow Trading",
    title: "Track the trades you almost made.",
    body: "Capture a directional idea, freeze the entry price and RSI, observe what happens, and review it honestly. The product value is decision review, not fake execution.",
    bullets: ["Frozen entry context (price + RSI)", "Structured review drawer", "Outcomes: correct, wrong, mixed, invalidated"],
    label: "Shadow Trading — track ideas you didn't trade",
  },
];

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  const reverse = index % 2 === 1;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <div className={reverse ? "lg:order-2" : ""}>
        <div className="text-xs uppercase tracking-wider text-text-tertiary font-medium">{feature.eyebrow}</div>
        <h3 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">{feature.title}</h3>
        <p className="mt-3 text-text-secondary leading-relaxed">{feature.body}</p>
        <ul className="mt-5 space-y-2 text-sm">
          {feature.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-text-secondary">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))]" />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className={reverse ? "lg:order-1" : ""}>
        <Screenshot slot={feature.slot} label={feature.label} aspect="16 / 10" />
      </div>
    </div>
  );
}

export function FeatureSections() {
  return (
    <section id="features" className="mx-auto w-full max-w-[1200px] px-6 lg:px-8 py-16 sm:py-24 space-y-24">
      {features.map((feature, i) => (
        <FeatureRow key={feature.slot} feature={feature} index={i} />
      ))}
    </section>
  );
}
