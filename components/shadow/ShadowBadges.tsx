import { Badge } from "@/components/badge";
import { TrendingUp, TrendingDown, Eye } from "lucide-react";

export function DirectionBadge({ direction }: { direction: string }) {
  if (direction === "up") {
    return (
      <Badge variant="success" className="gap-1">
        <TrendingUp className="h-3 w-3" />
        Bullish
      </Badge>
    );
  }
  if (direction === "down") {
    return (
      <Badge variant="destructive" className="gap-1">
        <TrendingDown className="h-3 w-3" />
        Bearish
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Eye className="h-3 w-3" />
      Watch
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "open") return <Badge variant="default">Open</Badge>;
  if (status === "review_ready") return <Badge variant="warning">Review Ready</Badge>;
  if (status === "closed") return <Badge variant="secondary">Closed</Badge>;
  if (status === "archived") return <Badge variant="secondary" className="opacity-60">Archived</Badge>;
  return null;
}

export function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome || outcome === "unreviewed") return <Badge variant="secondary">Unreviewed</Badge>;
  if (outcome === "correct") return <Badge variant="success">Correct</Badge>;
  if (outcome === "wrong") return <Badge variant="destructive">Wrong</Badge>;
  if (outcome === "mixed") return <Badge variant="warning">Mixed</Badge>;
  if (outcome === "invalidated") return <Badge variant="warning" className="opacity-80">Invalidated</Badge>;
  return null;
}

export function MoveBadge({ pct, direction }: { pct: string | null; direction: string }) {
  if (!pct) return <span className="text-muted-foreground text-xs">—</span>;
  const val = parseFloat(pct);
  const isUp = val >= 0;
  const color = isUp ? "text-green-500" : "text-red-500";
  return (
    <span className={`text-xs font-semibold tabular-nums ${color}`}>
      {isUp ? "+" : ""}{val.toFixed(2)}%
    </span>
  );
}
