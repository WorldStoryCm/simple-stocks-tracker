"use client";

import { useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Card } from "@/components/card";

// Map PnL% to a color along a red→neutral→green gradient.
// Intensity saturates at ±20% so extreme values don't dominate.
function pnlColor(pnlPct: number): string {
  const clamped = Math.max(-20, Math.min(20, pnlPct));
  const t = Math.abs(clamped) / 20; // 0..1 intensity
  if (clamped >= 0) {
    const l = 40 - t * 18;
    return `hsl(142 70% ${l}%)`;
  }
  const l = 45 - t * 20;
  return `hsl(0 72% ${l}%)`;
}

function HeatmapContent(props: any) {
  const { x, y, width, height, name, pnlPct, depth } = props;
  if (width <= 0 || height <= 0) return null;
  // Recharts renders the root container (depth 0) through this same component.
  // The root has no custom data fields — skip its rect so only the leaf tiles paint.
  if (depth === 0) return null;
  const hasPct = typeof pnlPct === "number" && Number.isFinite(pnlPct);
  const fill = pnlColor(hasPct ? pnlPct : 0);
  const showLabel = width > 50 && height > 30;
  const showPct = hasPct && width > 70 && height > 45;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="hsl(var(--background))" strokeWidth={2} style={{ cursor: "pointer" }} />
      {showLabel && (
        <text x={x + width / 2} y={y + height / 2 - (showPct ? 8 : 0)} textAnchor="middle" fill="#fff" fontSize={Math.min(16, Math.max(11, width / 8))} fontWeight={700}>
          {name}
        </text>
      )}
      {showPct && (
        <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={11} opacity={0.9}>
          {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%
        </text>
      )}
    </g>
  );
}

export function HeatmapView({
  positions,
  quotes,
  isLoading,
  onSelect,
}: {
  positions: any[];
  quotes: any;
  isLoading: boolean;
  onSelect: (p: any) => void;
}) {
  const data = useMemo(() => {
    return positions
      .map((pos) => {
        const quote = quotes?.[pos.symbol.ticker];
        const marketPrice = quote?.price || Number(pos.avgCost);
        const currentVal = Number(pos.openQty) * marketPrice;
        const invested = Number(pos.investedAmount);
        const pnl = currentVal - invested;
        const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
        return { name: pos.symbol.ticker, size: currentVal, pnl, pnlPct, invested, pos };
      })
      .filter((d) => d.size > 0);
  }, [positions, quotes]);

  if (isLoading) {
    return (
      <Card loading className="h-[500px]" />
    );
  }

  if (data.length === 0) {
    return (
      <Card className="flex h-[500px] items-center justify-center text-muted-foreground text-sm">
        No open positions to visualize.
      </Card>
    );
  }

  return (
    <Card className="p-2">
      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            nameKey="name"
            stroke="hsl(var(--background))"
            content={<HeatmapContent />}
            onClick={(node: any) => node?.pos && onSelect(node.pos)}
            isAnimationActive={false}
          >
            <RechartsTooltip
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                    <div className="font-bold">{d.name}</div>
                    <div className="text-muted-foreground">Value: ${d.size.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-muted-foreground">Invested: ${d.invested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className={d.pnl >= 0 ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>
                      P/L: {d.pnl >= 0 ? "+" : ""}${d.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({d.pnlPct >= 0 ? "+" : ""}{d.pnlPct.toFixed(2)}%)
                    </div>
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted-foreground px-2">
        Tile size = current market value. Color = unrealized P/L % (saturates at ±20%). Click a tile to view details.
      </p>
    </Card>
  );
}
