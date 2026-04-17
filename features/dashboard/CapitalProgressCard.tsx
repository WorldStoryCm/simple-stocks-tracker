"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type SVGProps,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Rocket, Settings2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/TooltipProvider";
import { cn } from "@/components/component.utils";
import { formatAmount } from "@/lib/currency";

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

type ProgressChartDatum = {
  name: string;
  base: number;
  market: number;
};

type SegmentShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
};

const CONFETTI_COLORS = ["#60a5fa", "#818cf8", "#34d399", "#2dd4bf", "#f9a8d4"];
const SEGMENT_JOIN_OVERLAP = 1.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function compactMoney(amount: number, currencyCode: string) {
  const formatter = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return `${
    currencyCode === "EUR" ? "€" : currencyCode === "USD" ? "$" : `${currencyCode} `
  }${formatter.format(amount)}`;
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

  return Array.from({ length: 22 }, (_, index) => ({
    id: `${seed}-${index}`,
    width: 5 + next() * 4,
    height: 9 + next() * 10,
    x: (next() - 0.5) * 210,
    y: 14 + next() * 96,
    rotate: -240 + next() * 480,
    delay: Math.round(next() * 140),
    duration: Math.round(900 + next() * 600),
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  }));
}

function ConfettiBurst({ seed }: { seed: number }) {
  const particles = useMemo(() => createParticles(seed), [seed]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-36 overflow-hidden">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="animate-milestone-confetti absolute left-1/2 top-8 rounded-[2px] opacity-0"
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
  );
}

function getRoundedSegmentPath(
  x: number,
  y: number,
  width: number,
  height: number,
  {
    roundLeft,
    roundRight,
  }: {
    roundLeft: boolean;
    roundRight: boolean;
  }
) {
  const safeWidth = Math.max(width, 0);
  const safeHeight = Math.max(height, 0);

  if (safeWidth <= 0 || safeHeight <= 0) {
    return "";
  }

  const radius = Math.min(safeHeight / 2, safeWidth / 2);
  const leftRadius = roundLeft ? radius : 0;
  const rightRadius = roundRight ? radius : 0;

  return [
    `M ${x + leftRadius} ${y}`,
    `H ${x + safeWidth - rightRadius}`,
    rightRadius > 0
      ? `A ${rightRadius} ${rightRadius} 0 0 1 ${x + safeWidth} ${y + rightRadius}`
      : `L ${x + safeWidth} ${y}`,
    `V ${y + safeHeight - rightRadius}`,
    rightRadius > 0
      ? `A ${rightRadius} ${rightRadius} 0 0 1 ${x + safeWidth - rightRadius} ${y + safeHeight}`
      : `L ${x + safeWidth} ${y + safeHeight}`,
    `H ${x + leftRadius}`,
    leftRadius > 0
      ? `A ${leftRadius} ${leftRadius} 0 0 1 ${x} ${y + safeHeight - leftRadius}`
      : `L ${x} ${y + safeHeight}`,
    `V ${y + leftRadius}`,
    leftRadius > 0
      ? `A ${leftRadius} ${leftRadius} 0 0 1 ${x + leftRadius} ${y}`
      : `L ${x} ${y}`,
    "Z",
  ].join(" ");
}

function SegmentTooltip({
  label,
  amount,
  dotClassName,
}: {
  label: string;
  amount: string;
  dotClassName: string;
}) {
  return (
    <div className="min-w-[164px] rounded-[1.25rem] border border-slate-200/90 bg-white/96 px-3.5 py-3 text-slate-950 shadow-[0_22px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <span className={cn("h-2.5 w-2.5 rounded-full", dotClassName)} />
        {label}
      </div>
      <div className="mt-2 text-base font-semibold tracking-[-0.03em]">{amount}</div>
    </div>
  );
}

function MilestoneLabel({
  amount,
  currencyCode,
  isReached,
}: {
  amount: number;
  currencyCode: string;
  isReached: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-500",
        isReached
          ? "border-sky-200/80 bg-white/92 text-slate-900"
          : "border-slate-200/80 bg-white/78 text-slate-400"
      )}
    >
      {compactMoney(amount, currencyCode)}
    </div>
  );
}

function LegendItem({
  label,
  amount,
  dotClassName,
}: {
  label: string;
  amount: string;
  dotClassName: string;
}) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/78 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <span className={cn("h-2.5 w-2.5 rounded-full", dotClassName)} />
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-950">{amount}</span>
    </div>
  );
}

export function CapitalProgressCard({ progress }: { progress: CapitalProgressData }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [celebrationSeed, setCelebrationSeed] = useState<number | null>(null);
  const didHydrateRef = useRef(false);
  const previousHighestReachedRef = useRef(0);
  const gradientSeed = useId().replace(/:/g, "");

  const targetAmount = Math.max(progress.targetAmount, 1);
  const positiveMarket = Math.max(progress.marketProfitAmount, 0);
  const isNegativeMarket = progress.marketProfitAmount < 0;
  const clampedTotalAmount = clamp(progress.totalAmount, 0, targetAmount);

  const baseVisibleAmount = isNegativeMarket
    ? clampedTotalAmount
    : clamp(progress.manualContributionAmount, 0, targetAmount);
  const marketVisibleAmount = isNegativeMarket
    ? 0
    : clamp(positiveMarket, 0, Math.max(0, targetAmount - baseVisibleAmount));
  const drawdownAmount = isNegativeMarket
    ? clamp(progress.manualContributionAmount - clampedTotalAmount, 0, targetAmount)
    : 0;

  const baseWidthPercent = clamp((baseVisibleAmount / targetAmount) * 100, 0, 100);
  const marketWidthPercent = clamp((marketVisibleAmount / targetAmount) * 100, 0, 100);
  const drawdownWidthPercent = clamp((drawdownAmount / targetAmount) * 100, 0, 100);
  const currentMarkerPercent = clamp((clampedTotalAmount / targetAmount) * 100, 0, 100);

  const chartData: ProgressChartDatum[] = [
    {
      name: "progress",
      base: baseVisibleAmount,
      market: marketVisibleAmount,
    },
  ];

  const highestReachedMilestone =
    progress.milestones.filter((milestone) => milestone.isReached).at(-1) ?? null;

  useEffect(() => {
    const nextAmount = highestReachedMilestone?.amount ?? 0;
    let timeoutId: number | null = null;

    if (!didHydrateRef.current) {
      previousHighestReachedRef.current = nextAmount;
      didHydrateRef.current = true;
      return;
    }

    if (nextAmount > previousHighestReachedRef.current && !prefersReducedMotion) {
      timeoutId = window.setTimeout(() => setCelebrationSeed(nextAmount), 0);
    }

    previousHighestReachedRef.current = nextAmount;
    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [highestReachedMilestone, prefersReducedMotion]);

  useEffect(() => {
    if (celebrationSeed === null) return;

    const timeoutId = window.setTimeout(() => setCelebrationSeed(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [celebrationSeed]);

  const baseGradientId = `${gradientSeed}-capital-progress-base`;
  const marketGradientId = `${gradientSeed}-capital-progress-market`;
  const baseShadowId = `${gradientSeed}-capital-progress-base-shadow`;
  const marketShadowId = `${gradientSeed}-capital-progress-market-shadow`;

  const renderBaseShape = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill,
  }: SegmentShapeProps) => {
    if (width <= 0 || height <= 0) {
      return null;
    }

    const hasMarketSegment = marketVisibleAmount > 0;
    const hasBaseSegment = width > 0;
    const path = getRoundedSegmentPath(
      x,
      y,
      width + (hasMarketSegment ? SEGMENT_JOIN_OVERLAP : 0),
      height,
      {
        roundLeft: hasBaseSegment,
        roundRight: !hasMarketSegment,
      }
    );

    return <path d={path} fill={fill} filter={`url(#${baseShadowId})`} />;
  };

  const renderMarketShape = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill,
  }: SegmentShapeProps) => {
    if (width <= 0 || height <= 0) {
      return null;
    }

    const hasBaseSegment = baseVisibleAmount > 0;
    const path = getRoundedSegmentPath(
      x - (hasBaseSegment ? SEGMENT_JOIN_OVERLAP : 0),
      y,
      width + (hasBaseSegment ? SEGMENT_JOIN_OVERLAP : 0),
      height,
      {
        roundLeft: !hasBaseSegment,
        roundRight: true,
      }
    );

    return <path d={path} fill={fill} filter={`url(#${marketShadowId})`} />;
  };

  return (
    <TooltipProvider>
      <Card className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.08)] hover:border-slate-200 hover:shadow-[0_28px_88px_rgba(15,23,42,0.12)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.72),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:30px_30px]" />
        {!prefersReducedMotion && celebrationSeed !== null ? (
          <ConfettiBurst seed={celebrationSeed} />
        ) : null}

        <CardContent className="relative p-6 sm:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Path to{" "}
                  {formatAmount(progress.targetAmount, progress.currencyCode, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(16,185,129,0.12))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(148,163,184,0.16)]">
                    <Rocket className="h-5 w-5 text-slate-900" />
                  </div>

                  <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                    <div className="text-3xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-[2.7rem]">
                      {formatAmount(progress.totalAmount, progress.currencyCode, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </div>
                    <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/90 px-3 py-1 text-sm font-semibold text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                      {progress.progressPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <Button
                asChild
                variant="outline"
                className="h-11 shrink-0 rounded-2xl border-slate-200/90 bg-white/82 px-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-slate-300 hover:bg-white"
              >
                <Link href="/settings#capital-progress-settings">
                  Configuration
                  <Settings2 className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="relative py-10">
              {progress.milestones.map((milestone, index) => (
                <div
                  key={milestone.amount}
                  className={cn(
                    "pointer-events-none absolute z-10",
                    index % 2 === 0 ? "top-0" : "bottom-0",
                    index === 0
                      ? "translate-x-0"
                      : index === progress.milestones.length - 1
                        ? "-translate-x-full"
                        : "-translate-x-1/2"
                  )}
                  style={{ left: `${milestone.progress}%` }}
                >
                  <MilestoneLabel
                    amount={milestone.amount}
                    currencyCode={progress.currencyCode}
                    isReached={milestone.isReached}
                  />
                </div>
              ))}

              <div className="relative h-[52px] overflow-hidden rounded-full border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-10px_18px_rgba(148,163,184,0.12)]">
                <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:repeating-linear-gradient(135deg,rgba(148,163,184,0.08)_0,rgba(148,163,184,0.08)_10px,transparent_10px,transparent_22px)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),transparent_60%)]" />

                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                    barCategoryGap="0%"
                    barGap={0}
                  >
                    <defs>
                      <linearGradient id={baseGradientId} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="55%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                      <linearGradient id={marketGradientId} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#2dd4bf" />
                      </linearGradient>
                      <filter
                        id={baseShadowId}
                        x="-20%"
                        y="-80%"
                        width="140%"
                        height="260%"
                      >
                        <feDropShadow
                          dx="0"
                          dy="8"
                          stdDeviation="10"
                          floodColor="#2563eb"
                          floodOpacity="0.12"
                        />
                      </filter>
                      <filter
                        id={marketShadowId}
                        x="-20%"
                        y="-80%"
                        width="140%"
                        height="260%"
                      >
                        <feDropShadow
                          dx="0"
                          dy="8"
                          stdDeviation="10"
                          floodColor="#10b981"
                          floodOpacity="0.12"
                        />
                      </filter>
                    </defs>

                    <XAxis type="number" hide domain={[0, targetAmount]} />
                    <YAxis type="category" dataKey="name" hide width={0} />
                    <Bar
                      dataKey="base"
                      stackId="progress"
                      fill={`url(#${baseGradientId})`}
                      isAnimationActive={!prefersReducedMotion}
                      animationDuration={1000}
                      shape={renderBaseShape as SVGProps<SVGPathElement>}
                    />
                    <Bar
                      dataKey="market"
                      stackId="progress"
                      fill={`url(#${marketGradientId})`}
                      isAnimationActive={!prefersReducedMotion}
                      animationDuration={1000}
                      shape={renderMarketShape as SVGProps<SVGPathElement>}
                    />
                  </BarChart>
                </ResponsiveContainer>

                {progress.milestones.map((milestone) => (
                  <div
                    key={milestone.amount}
                    className="pointer-events-none absolute inset-y-0 z-10"
                    style={{ left: `${milestone.progress}%` }}
                  >
                    <div
                      className={cn(
                        "absolute left-1/2 top-1/2 h-[74%] w-px -translate-x-1/2 -translate-y-1/2 transition-all duration-500",
                        milestone.isReached ? "bg-emerald-400/60" : "bg-slate-300/95"
                      )}
                    />
                    <div
                      className={cn(
                        "absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] transition-all duration-500",
                        milestone.isReached
                          ? "border-white bg-emerald-400 shadow-[0_0_0_4px_rgba(167,243,208,0.55)]"
                          : "border-white bg-slate-300"
                      )}
                    />
                  </div>
                ))}

                {drawdownWidthPercent > 0 ? (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-20 overflow-hidden rounded-r-full"
                    style={{
                      left: `${baseWidthPercent}%`,
                      width: `${drawdownWidthPercent}%`,
                    }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(251,146,60,0.85),rgba(244,63,94,0.82))]" />
                    <div className="absolute inset-0 opacity-65 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.34)_0,rgba(255,255,255,0.34)_9px,transparent_9px,transparent_18px)]" />
                  </div>
                ) : null}

                {currentMarkerPercent > 0 ? (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-30"
                    style={{ left: `${currentMarkerPercent}%` }}
                  >
                    <div className="absolute left-1/2 top-1/2 h-7 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95 shadow-[0_8px_20px_rgba(15,23,42,0.18)]" />
                  </div>
                ) : null}

                {baseWidthPercent > 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Show base amount"
                        className="absolute inset-y-0 left-0 z-40"
                        style={{ width: `${baseWidthPercent}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={14}
                      className="border-0 bg-transparent p-0 shadow-none"
                    >
                      <SegmentTooltip
                        label="Base"
                        amount={formatAmount(
                          progress.manualContributionAmount,
                          progress.currencyCode,
                          {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }
                        )}
                        dotClassName="bg-[linear-gradient(90deg,#2563eb,#6366f1)]"
                      />
                    </TooltipContent>
                  </Tooltip>
                ) : null}

                {marketWidthPercent > 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Show market amount"
                        className="absolute inset-y-0 z-40"
                        style={{
                          left: `${baseWidthPercent}%`,
                          width: `${marketWidthPercent}%`,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={14}
                      className="border-0 bg-transparent p-0 shadow-none"
                    >
                      <SegmentTooltip
                        label="Market"
                        amount={formatAmount(positiveMarket, progress.currencyCode, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                        dotClassName="bg-[linear-gradient(90deg,#10b981,#2dd4bf)]"
                      />
                    </TooltipContent>
                  </Tooltip>
                ) : null}

                {drawdownWidthPercent > 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Show market drawdown"
                        className="absolute inset-y-0 z-40"
                        style={{
                          left: `${baseWidthPercent}%`,
                          width: `${drawdownWidthPercent}%`,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={14}
                      className="border-0 bg-transparent p-0 shadow-none"
                    >
                      <SegmentTooltip
                        label="Market"
                        amount={formatAmount(progress.marketProfitAmount, progress.currencyCode, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                        dotClassName="bg-[linear-gradient(90deg,#fb923c,#f43f5e)]"
                      />
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <LegendItem
                label="Base"
                amount={formatAmount(progress.manualContributionAmount, progress.currencyCode, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
                dotClassName="bg-[linear-gradient(90deg,#2563eb,#6366f1)]"
              />
              <LegendItem
                label="Market"
                amount={formatAmount(progress.marketProfitAmount, progress.currencyCode, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
                dotClassName={
                  progress.marketProfitAmount >= 0
                    ? "bg-[linear-gradient(90deg,#10b981,#2dd4bf)]"
                    : "bg-[linear-gradient(90deg,#fb923c,#f43f5e)]"
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
