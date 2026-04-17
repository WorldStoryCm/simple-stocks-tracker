"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Coins, PartyPopper, Settings2, Sparkles, Target, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { cn } from "@/components/component.utils";
import { currencySymbol, formatAmount } from "@/lib/currency";

type CapitalProgressData = {
  currencyCode: string;
  targetAmount: number;
  manualContributionAmount: number;
  marketProfitAmount: number;
  totalAmount: number;
  remainingAmount: number;
  progressPercent: number;
  milestones: Array<{
    amount: number;
    ratio: number;
    isReached: boolean;
    progress: number;
  }>;
};

type Celebration = {
  amount: number;
  label: string;
};

const CONFETTI_COLORS = ["#f59e0b", "#fb7185", "#10b981", "#0ea5e9", "#111827"];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function compactMoney(amount: number, currencyCode: string) {
  const formatter = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return `${currencySymbol(currencyCode)}${formatter.format(amount)}`;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

function createParticles(seed: number) {
  let state = seed || 1;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  return Array.from({ length: 26 }, (_, index) => {
    const direction = next() > 0.5 ? 1 : -1;
    return {
      id: `${seed}-${index}`,
      width: 5 + next() * 6,
      height: 10 + next() * 10,
      x: direction * (24 + next() * 150),
      y: 34 + next() * 120,
      rotate: -220 + next() * 440,
      delay: Math.round(next() * 180),
      duration: Math.round(900 + next() * 700),
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    };
  });
}

function ConfettiBurst({ celebration }: { celebration: Celebration }) {
  const particles = useMemo(() => createParticles(celebration.amount), [celebration.amount]);

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-5 z-20 flex justify-center px-6">
        <div className="animate-milestone-badge inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-card/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-600 shadow-lg backdrop-blur-sm">
          <PartyPopper className="h-3.5 w-3.5" />
          {celebration.label} cleared
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-56 overflow-hidden">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="animate-milestone-confetti absolute left-1/2 top-16 rounded-[2px] opacity-0"
            style={
              {
                width: `${particle.width}px`,
                height: `${particle.height}px`,
                backgroundColor: particle.color,
                "--confetti-x": `${particle.x}px`,
                "--confetti-y": `${particle.y}px`,
                "--confetti-rotate": `${particle.rotate}deg`,
                "--confetti-delay": `${particle.delay}ms`,
                "--confetti-duration": `${particle.duration}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}

export function CapitalProgressCard({ progress }: { progress: CapitalProgressData }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const didHydrateRef = useRef(false);
  const previousHighestReachedRef = useRef(0);

  const positiveProfit = Math.max(progress.marketProfitAmount, 0);
  const negativeProfit = Math.min(progress.marketProfitAmount, 0);
  const baseVisibleAmount = Math.max(0, progress.manualContributionAmount + negativeProfit);
  const baseShare = clamp(baseVisibleAmount / progress.targetAmount, 0, 1);
  const profitShare = clamp(positiveProfit / progress.targetAmount, 0, Math.max(0, 1 - baseShare));
  const totalShare = clamp(progress.totalAmount / progress.targetAmount, 0, 1);

  const highestReachedMilestone = progress.milestones.filter((milestone) => milestone.isReached).at(-1) ?? null;
  const nextMilestone = progress.milestones.find((milestone) => !milestone.isReached) ?? null;
  const completedMilestones = progress.milestones.filter((milestone) => milestone.isReached).length;

  useEffect(() => {
    const nextAmount = highestReachedMilestone?.amount ?? 0;
    let timeoutId: number | null = null;

    if (!didHydrateRef.current) {
      previousHighestReachedRef.current = nextAmount;
      didHydrateRef.current = true;
      return;
    }

    if (nextAmount > previousHighestReachedRef.current && !prefersReducedMotion && highestReachedMilestone) {
      timeoutId = window.setTimeout(() => {
        setCelebration({
          amount: nextAmount,
          label: compactMoney(nextAmount, progress.currencyCode),
        });
      }, 0);
    }

    previousHighestReachedRef.current = nextAmount;
    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [highestReachedMilestone, prefersReducedMotion, progress.currencyCode]);

  useEffect(() => {
    if (!celebration) return;

    const timeoutId = window.setTimeout(() => setCelebration(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [celebration]);

  return (
    <Card className="relative overflow-hidden border-amber-500/20 bg-[linear-gradient(135deg,rgba(255,247,237,0.96),rgba(255,255,255,1)_38%,rgba(240,253,244,0.94)_100%)] shadow-lg shadow-black/5 dark:bg-[linear-gradient(135deg,rgba(38,24,8,0.88),rgba(20,20,21,0.96)_38%,rgba(6,22,16,0.92)_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.2),transparent_52%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_42%)]" />
      {!prefersReducedMotion && celebration ? <ConfettiBurst celebration={celebration} /> : null}

      <CardHeader className="relative gap-4 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-700 shadow-sm dark:bg-white/5 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Path to the first {compactMoney(progress.targetAmount, progress.currencyCode)}
            </div>
            <CardTitle className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Keep the base growing. Let the market color the upside.
            </CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              The amber layer tracks your manual contributions. The green layer shows realized market profit. Each checkpoint is split out so the next push always feels close.
            </CardDescription>
          </div>

          <Button asChild variant="outline" className="shrink-0 border-amber-500/20 bg-white/70 hover:border-amber-500 dark:bg-white/5">
            <Link href="/settings#capital-progress-settings">
              Tune progress settings
              <Settings2 className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative flex flex-col gap-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.95fr)]">
          <div className="rounded-[calc(var(--radius)+0.6rem)] border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Current total</div>
                <div className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl">
                  {formatAmount(progress.totalAmount, progress.currencyCode)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 font-medium text-amber-700 dark:text-amber-300">
                  <Coins className="h-4 w-4" />
                  Base {formatAmount(progress.manualContributionAmount, progress.currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium",
                    progress.marketProfitAmount >= 0
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300"
                  )}
                >
                  {progress.marketProfitAmount >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  Market {formatAmount(progress.marketProfitAmount, progress.currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <span>{progress.progressPercent.toFixed(1)}% complete</span>
                <span>{formatAmount(progress.remainingAmount, progress.currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} to go</span>
              </div>

              <div className="relative h-7 overflow-hidden rounded-full border border-black/10 bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.08]">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.4),transparent_35%,rgba(255,255,255,0.2))] dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.08),transparent_35%,rgba(255,255,255,0.12))]" />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#f59e0b,#f97316)] transition-transform duration-700 ease-[var(--ease-out-expo)]"
                  style={{ width: `${baseShare * 100}%` }}
                />
                {positiveProfit > 0 ? (
                  <div
                    className="absolute inset-y-0 rounded-full bg-[linear-gradient(90deg,#10b981,#14b8a6)] transition-all duration-700 ease-[var(--ease-out-expo)]"
                    style={{
                      left: `${baseShare * 100}%`,
                      width: `${profitShare * 100}%`,
                    }}
                  />
                ) : null}
                <div
                  className="absolute inset-y-0 rounded-full border-r border-white/80 bg-white/20"
                  style={{ left: `${Math.max(totalShare * 100 - 0.2, 0)}%` }}
                />
              </div>

              <div className="relative mt-5 h-14">
                <div className="absolute inset-x-0 top-2 h-px bg-black/10 dark:bg-white/10" />
                {progress.milestones.map((milestone, index) => (
                  <div
                    key={milestone.amount}
                    className={cn(
                      "absolute top-0 flex flex-col items-center gap-2",
                      index === progress.milestones.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
                    )}
                    style={{ left: `${milestone.progress}%` }}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] shadow-sm transition-colors",
                        milestone.isReached
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "border-black/15 bg-white text-muted-foreground dark:border-white/15 dark:bg-zinc-900"
                      )}
                    >
                      {milestone.isReached ? <Trophy className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </div>
                    <div
                      className={cn(
                        "rounded-full px-2 py-1 text-[11px] font-semibold tracking-[0.08em]",
                        milestone.isReached
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "text-muted-foreground"
                      )}
                    >
                      {compactMoney(milestone.amount, progress.currencyCode)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[calc(var(--radius)+0.5rem)] border border-black/10 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Next checkpoint
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                {nextMilestone ? compactMoney(nextMilestone.amount, progress.currencyCode) : "Target hit"}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {nextMilestone
                  ? `${formatAmount(Math.max(0, nextMilestone.amount - progress.totalAmount), progress.currencyCode, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })} left for the next burst.`
                  : "All milestone thresholds are cleared."}
              </p>
            </div>

            <div className="rounded-[calc(var(--radius)+0.5rem)] border border-black/10 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Milestones cleared</div>
              <div className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                {completedMilestones}/{progress.milestones.length}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                The ladder is broken into smaller wins so the next move always feels visible.
              </p>
            </div>

            <div className="rounded-[calc(var(--radius)+0.5rem)] border border-black/10 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Why this split matters</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                When the green layer starts stretching faster than the amber base, the market is compounding harder than salary top-ups.
              </p>
              <Button asChild variant="link" className="mt-3 h-auto p-0 text-sm text-foreground">
                <Link href="/settings#capital-progress-settings">
                  Update contributions
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
