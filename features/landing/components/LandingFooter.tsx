import Link from "next/link";
import { Sparkles } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-[color:var(--border)] bg-[color:var(--surface-1)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] shadow-[var(--shadow-glow-brand)]">
            <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
          </span>
          <span className="text-sm font-semibold tracking-tight">Stock Tracker</span>
        </Link>
        <div className="text-xs text-text-tertiary">
          A personal stock journal. Built for one user — you.
        </div>
      </div>
    </footer>
  );
}
