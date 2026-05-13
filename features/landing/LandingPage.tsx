import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { LandingJsonLd } from "./components/JsonLd";
import { LandingNav } from "./components/LandingNav";
import { LandingHero } from "./components/LandingHero";
import { PillarGrid } from "./components/PillarGrid";
import { FeatureSections } from "./components/FeatureSections";
import { MobileStrip } from "./components/MobileStrip";
import { NotHere } from "./components/NotHere";
import { LandingFooter } from "./components/LandingFooter";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      <LandingJsonLd />
      <LandingNav />
      <main className="flex-1">
        <LandingHero />
        <PillarGrid />
        <FeatureSections />
        <MobileStrip />
        <NotHere />
        <section className="mx-auto w-full max-w-[1200px] px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] shadow-[var(--shadow-glow-brand)] mb-6">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.4} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Start your journal.</h2>
          <p className="mt-3 text-text-secondary max-w-md mx-auto">
            Sign in with Google. Add a platform. Log your first trade. That's it.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-white [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] shadow-[var(--shadow-glow-brand)] transition-transform hover:scale-[1.02]"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
