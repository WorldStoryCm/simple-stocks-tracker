import { Screenshot } from "./Screenshot";

export function MobileStrip() {
  return (
    <section id="mobile" className="mx-auto w-full max-w-[1200px] px-6 lg:px-8 py-16 sm:py-24">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-wider text-text-tertiary font-medium">Mobile</div>
        <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          Works on the phone in your pocket.
        </h2>
        <p className="mt-3 text-text-secondary">
          Every page is responsive. Log a trade from your phone right after you place it.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        <Screenshot slot="mobile-dashboard" label="Dashboard" aspect="9 / 19.5" variant="phone" />
        <Screenshot slot="mobile-positions" label="Positions" aspect="9 / 19.5" variant="phone" />
        <Screenshot slot="mobile-trades" label="Trades" aspect="9 / 19.5" variant="phone" />
        <Screenshot slot="mobile-symbols" label="Symbols" aspect="9 / 19.5" variant="phone" />
      </div>
    </section>
  );
}
