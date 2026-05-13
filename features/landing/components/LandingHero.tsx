import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Screenshot } from "./Screenshot";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 -top-32 -z-10 mx-auto h-[420px] max-w-[1200px] [background-image:radial-gradient(60%_60%_at_50%_0%,rgba(110,91,255,0.18),transparent_70%)]" />

      <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-8 pt-16 sm:pt-24 pb-12 sm:pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-1)] px-3 py-1 text-xs text-text-secondary">
            Personal stock journal · No broker sync needed
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            A stock journal that turns your trades into{" "}
            <span className="bg-clip-text text-transparent [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))]">
              clean P/L.
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-text-secondary max-w-2xl mx-auto">
            Log every buy and sell across all your brokers in one place. Get FIFO realized P/L,
            RSI-aware positions, and a structured place to track ideas you didn't trade.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-white [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] shadow-[var(--shadow-glow-brand)] transition-transform hover:scale-[1.02]"
            >
              Start your journal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-1)] px-5 py-3 text-sm font-medium hover:bg-[color:var(--surface-2)] transition-colors"
            >
              See the dashboard
            </a>
          </div>
        </div>

        <div className="mt-14 sm:mt-20">
          <Screenshot
            slot="hero"
            aspect="16 / 9"
            label="Dashboard — KPIs, cumulative P/L, goals, recent trades"
          />
        </div>
      </div>
    </section>
  );
}
