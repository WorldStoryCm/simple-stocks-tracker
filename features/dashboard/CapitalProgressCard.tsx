"use client";

import Link from "next/link";
import { type SVGProps, useId } from "react";
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

const SEGMENT_JOIN_OVERLAP = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createSvgId(...parts: Array<string | number>) {
  return parts
    .map((part) => String(part).replace(/[^a-zA-Z0-9_-]/g, "-"))
    .join("-");
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

  const chartData: ProgressChartDatum[] = [
    {
      name: "progress",
      base: baseVisibleAmount,
      market: marketVisibleAmount,
    },
  ];

  const baseGradientId = `${gradientSeed}-capital-progress-base`;
  const marketGradientId = `${gradientSeed}-capital-progress-market`;
  const baseShadowId = `${gradientSeed}-capital-progress-base-shadow`;
  const marketShadowId = `${gradientSeed}-capital-progress-market-shadow`;

  const renderSegmentSurface = ({
    x,
    y,
    height,
    path,
    fill,
    shadowId,
    surfaceKey,
  }: {
    x: number;
    y: number;
    height: number;
    path: string;
    fill?: string;
    shadowId: string;
    surfaceKey: string;
  }) => {
    const sheenId = createSvgId(surfaceKey, "sheen");

    return (
      <g>
        <defs>
          <linearGradient
            id={sheenId}
            x1={x}
            y1={y}
            x2={x}
            y2={y + height}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
            <stop offset="34%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={path} fill={fill} filter={`url(#${shadowId})`} />
        <path d={path} fill={`url(#${sheenId})`} />
        <path d={path} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
      </g>
    );
  };

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

    return renderSegmentSurface({
      x,
      y,
      height,
      path,
      fill,
      shadowId: baseShadowId,
      surfaceKey: createSvgId(gradientSeed, "base", x, y, width, height),
    });
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
        roundLeft: true,
        roundRight: true,
      }
    );

    return renderSegmentSurface({
      x: x - (hasBaseSegment ? SEGMENT_JOIN_OVERLAP : 0),
      y,
      height,
      path,
      fill,
      shadowId: marketShadowId,
      surfaceKey: createSvgId(gradientSeed, "market", x, y, width, height),
    });
  };

  return (
    <TooltipProvider>
      <Card className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.08)] hover:border-slate-200 hover:shadow-[0_28px_88px_rgba(15,23,42,0.12)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.72),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:30px_30px]" />

        <CardContent className="relative p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap items-start gap-x-3">
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

            <div className="relative py-2">
              <div className="relative">
                <div className="pointer-events-none absolute inset-x-6 top-3 h-8 rounded-full bg-[linear-gradient(90deg,rgba(37,99,235,0.14),rgba(45,212,191,0.16))] blur-2xl" />
                <div className="pointer-events-none absolute inset-x-3 top-4 h-6 rounded-full bg-slate-900/10 blur-xl" />
                <div className="relative h-[24px] overflow-hidden rounded-full border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.98))] shadow-[0_20px_44px_rgba(15,23,42,0.14),0_8px_18px_rgba(99,102,241,0.08),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-10px_18px_rgba(148,163,184,0.12)]">
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
                            dy="10"
                            stdDeviation="12"
                            floodColor="#2563eb"
                            floodOpacity="0.16"
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
                            dy="10"
                            stdDeviation="12"
                            floodColor="#10b981"
                            floodOpacity="0.16"
                          />
                        </filter>
                      </defs>

                      <XAxis type="number" hide domain={[0, targetAmount]} />
                      <YAxis type="category" dataKey="name" hide width={0} />
                      <Bar
                        dataKey="base"
                        stackId="progress"
                        fill={`url(#${baseGradientId})`}
                        isAnimationActive
                        animationDuration={900}
                        shape={renderBaseShape as SVGProps<SVGPathElement>}
                      />
                      <Bar
                        dataKey="market"
                        stackId="progress"
                        fill={`url(#${marketGradientId})`}
                        isAnimationActive
                        animationDuration={900}
                        shape={renderMarketShape as SVGProps<SVGPathElement>}
                      />
                    </BarChart>
                  </ResponsiveContainer>

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
