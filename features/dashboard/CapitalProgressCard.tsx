"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Coins, PartyPopper, Settings2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { cn } from "@/components/component.utils";
import { currencySymbol, formatAmount } from "@/lib/currency";

type CapitalProgressData = {
  currencyCode: string;
  targetAmount: number;
  manualContributionAmount: number;
  marketProfitAmount: number;
  livePositionsAmount: number;
  cashAmount: number;
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
  const negativeProfit = Math.abs(Math.min(progress.marketProfitAmount, 0));
  const baseShare = clamp(progress.manualContributionAmount / progress.targetAmount, 0, 1);
  const profitShare = clamp(positiveProfit / progress.targetAmount, 0, Math.max(0, 1 - baseShare));
  const drawdownShare = clamp(negativeProfit / progress.targetAmount, 0, baseShare);
  const totalShare = clamp(progress.totalAmount / progress.targetAmount, 0, 1);

  const highestReachedMilestone = progress.milestones.filter((milestone) => milestone.isReached).at(-1) ?? null;

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
    <Card className="relative overflow-hidden border-amber-500/15 bg-[linear-gradient(180deg,rgba(255,251,235,0.88),rgba(255,255,255,0.98))] shadow-lg shadow-black/5 dark:bg-[linear-gradient(180deg,rgba(32,22,8,0.88),rgba(20,20,21,0.96))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_52%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_46%)]" />
      {!prefersReducedMotion && celebration ? <ConfettiBurst celebration={celebration} /> : null}

      <CardHeader className="relative pb-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Path to {formatAmount(progress.targetAmount, progress.currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </CardTitle>
            <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
              <div className="text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">
                {formatAmount(progress.totalAmount, progress.currencyCode)}
              </div>
              <div className="pb-1 text-sm text-muted-foreground">
                / {formatAmount(progress.targetAmount, progress.currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          <Button asChild variant="outline" className="shrink-0 bg-white/75 dark:bg-white/5">
            <Link href="/settings#capital-progress-settings">
              Configuration
              <Settings2 className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative pt-1">
        <div className="rounded-[1.15rem] border border-black/8 bg-white/78 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-1.5 dark:bg-white/[0.06]">
                <span className="h-2.5 w-2.5 rounded-full bg-[linear-gradient(90deg,#f59e0b,#f97316)]" />
                Base
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-1.5 dark:bg-white/[0.06]">
                <span className="h-2.5 w-2.5 rounded-full bg-[linear-gradient(90deg,#10b981,#14b8a6)]" />
                Market
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-1.5 dark:bg-white/[0.06]">
                <span className="h-2.5 w-2.5 rounded-full border border-black/25 bg-white dark:border-white/25 dark:bg-zinc-900" />
                Checkpoints
              </span>
            </div>

            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {progress.progressPercent.toFixed(1)}%
            </div>
          </div>

          <div className="mt-5">
            <div className="relative pt-7">
              <div className="relative h-8 overflow-hidden rounded-full border border-black/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.08),rgba(17,24,39,0.02))] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.45),transparent_30%,rgba(255,255,255,0.18))] dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.08),transparent_35%,rgba(255,255,255,0.12))]" />
                <div
                  className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#f59e0b,#f97316_70%,#fb923c)] transition-all duration-700 ease-[var(--ease-out-expo)]"
                  style={{ width: `${baseShare * 100}%` }}
                />
                {profitShare > 0 ? (
                  <div
                    className="absolute inset-y-0 bg-[linear-gradient(90deg,#10b981,#14b8a6_72%,#2dd4bf)] transition-all duration-700 ease-[var(--ease-out-expo)]"
                    style={{
                      left: `${baseShare * 100}%`,
                      width: `${profitShare * 100}%`,
                    }}
                  />
                ) : null}
                {drawdownShare > 0 ? (
                  <div
                    className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,rgba(239,68,68,0.26)_0,rgba(239,68,68,0.26)_8px,rgba(239,68,68,0.1)_8px,rgba(239,68,68,0.1)_16px)]"
                    style={{
                      left: `${totalShare * 100}%`,
                      width: `${drawdownShare * 100}%`,
                    }}
                  />
                ) : null}

                {progress.milestones.map((milestone) => (
                  <div
                    key={milestone.amount}
                    className="absolute inset-y-0"
                    style={{ left: `${milestone.progress}%` }}
                  >
                    <div className="absolute inset-y-0 w-px bg-white/70 dark:bg-white/25" />
                    <div
                      className={cn(
                        "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-sm",
                        milestone.isReached
                          ? "h-3.5 w-3.5 border-white/80 bg-white"
                          : "h-3 w-3 border-white/70 bg-black/15 dark:border-white/35 dark:bg-white/15"
                      )}
                    />
                  </div>
                ))}

                <div
                  className="absolute top-1/2 z-10 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/80 shadow-[0_0_0_4px_rgba(255,255,255,0.7)] dark:shadow-[0_0_0_4px_rgba(9,9,11,0.75)]"
                  style={{ left: `${totalShare * 100}%` }}
                />
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-0 h-7">
                {progress.milestones.map((milestone, index) => (
                  <div
                    key={milestone.amount}
                    className={cn(
                      "absolute top-0",
                      index === 0 ? "translate-x-0" : index === progress.milestones.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
                    )}
                    style={{ left: `${milestone.progress}%` }}
                  >
                    <div
                      className={cn(
                        "whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold tracking-[0.12em]",
                        milestone.isReached
                          ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
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

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <div className="inline-flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
              <Coins className="h-4 w-4" />
              Base {formatAmount(progress.manualContributionAmount, progress.currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-2 font-medium",
                progress.marketProfitAmount >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"
              )}
            >
              {progress.marketProfitAmount >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              Market {formatAmount(progress.marketProfitAmount, progress.currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-muted-foreground">
              Positions {formatAmount(progress.livePositionsAmount, progress.currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-muted-foreground">
              Cash {formatAmount(progress.cashAmount, progress.currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              {formatAmount(progress.remainingAmount, progress.currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} left
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
