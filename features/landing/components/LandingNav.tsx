import Link from "next/link";
import { Sparkles } from "lucide-react";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[color:var(--background)]/80 border-b border-[color:var(--border)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] shadow-[var(--shadow-glow-brand)]">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.4} />
          </span>
          <span className="font-bold tracking-tight">Stock Tracker</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-sm text-text-secondary">
          <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
          <a href="#mobile" className="hover:text-text-primary transition-colors">Mobile</a>
          <a href="#not-here" className="hover:text-text-primary transition-colors">What&apos;s not here</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center rounded-md px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-[color:var(--surface-2)] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-white [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] shadow-[var(--shadow-glow-brand)] transition-transform hover:scale-[1.02]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
