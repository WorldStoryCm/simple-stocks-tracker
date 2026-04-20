"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader } from "@/components/card";
import { DirectionBadge, StatusBadge, OutcomeBadge, MoveBadge } from "./ShadowBadges";
import { ReviewDrawer } from "./ReviewDrawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/dropdown-menu";
import { Loader2, MoreHorizontal, ClipboardCheck, Archive, StickyNote } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import toast from "react-hot-toast";

type ShadowCase = {
  id: string;
  symbol: string;
  direction: string;
  thesis: string;
  confidence: string | null;
  timeHorizon: string | null;
  startedAt: Date;
  entryPrice: string;
  exitPrice: string | null;
  priceChangeAbs: string | null;
  priceChangePct: string | null;
  outcome: string | null;
  resultSummary: string | null;
  status: string;
  endedAt: Date | null;
  createdAt: Date;
};

interface CasesTableProps {
  onAddNote?: (c: ShadowCase) => void;
}

const horizonLabel: Record<string, string> = {
  intraday: "Intraday",
  swing: "Swing",
  "1w": "1W",
  "1m": "1M",
  "3m": "3M",
};

function CaseRow({
  c,
  quote,
  onSelect,
  onAction,
}: {
  c: ShadowCase;
  quote?: { price: number; changePercent: number } | null;
  onSelect: () => void;
  onAction: (action: string, c: ShadowCase) => void;
}) {
  const daysOpen = differenceInDays(new Date(), new Date(c.startedAt));
  const isClosed = c.status === "closed" || c.status === "archived";
  const currentPrice = isClosed ? (c.exitPrice ? parseFloat(c.exitPrice) : null) : quote?.price;
  const currentPct = isClosed
    ? c.priceChangePct
    : currentPrice
      ? (((currentPrice - parseFloat(c.entryPrice)) / parseFloat(c.entryPrice)) * 100).toFixed(2)
      : null;

  return (
    <tr
      className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
      onClick={onSelect}
    >
      <td className="px-3 py-2.5">
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{c.symbol}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={c.thesis}>
            {c.thesis.length > 40 ? c.thesis.slice(0, 40) + "…" : c.thesis}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <DirectionBadge direction={c.direction} />
      </td>
      <td className="px-3 py-2.5 text-sm tabular-nums">
        ${parseFloat(c.entryPrice).toFixed(2)}
      </td>
      <td className="px-3 py-2.5 text-sm tabular-nums">
        {currentPrice != null ? `$${currentPrice.toFixed(2)}` : "—"}
      </td>
      <td className="px-3 py-2.5">
        {currentPct != null ? (
          <MoveBadge pct={currentPct} direction={c.direction} />
        ) : "—"}
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
        {daysOpen}d
      </td>
      <td className="px-3 py-2.5">
        {c.timeHorizon ? (
          <span className="text-xs text-muted-foreground">{horizonLabel[c.timeHorizon] ?? c.timeHorizon}</span>
        ) : "—"}
      </td>
      <td className="px-3 py-2.5">
        {isClosed ? <OutcomeBadge outcome={c.outcome} /> : <StatusBadge status={c.status} />}
      </td>
      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isClosed && (
              <DropdownMenuItem onClick={() => onAction("review", c)}>
                <ClipboardCheck className="h-4 w-4" />
                Review Now
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onAction("addNote", c)}>
              <StickyNote className="h-4 w-4" />
              Add Note
            </DropdownMenuItem>
            {!isClosed && (
              <DropdownMenuItem onClick={() => onAction("archive", c)} className="text-muted-foreground">
                <Archive className="h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function CasesTabContent({
  cases,
  quotes,
  onSelect,
  onAction,
}: {
  cases: ShadowCase[];
  quotes: Record<string, { price: number; changePercent: number }> | undefined;
  onSelect: (c: ShadowCase) => void;
  onAction: (action: string, c: ShadowCase) => void;
}) {
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-sm">No cases here yet.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {["Symbol / Thesis", "Direction", "Entry", "Current", "Move", "Days", "Horizon", "Status", ""].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cases.map(c => (
            <CaseRow
              key={c.id}
              c={c}
              quote={quotes?.[c.symbol]}
              onSelect={() => onSelect(c)}
              onAction={onAction}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CasesTable({ onAddNote }: CasesTableProps) {
  const utils = trpc.useUtils();
  const [selectedCase, setSelectedCase] = useState<ShadowCase | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("open");

  const { data: allCases, isLoading } = trpc.shadow.listCases.useQuery();

  const openCases = allCases?.filter(c => c.status === "open" || c.status === "review_ready") ?? [];
  const closedCases = allCases?.filter(c => c.status === "closed") ?? [];
  const archivedCases = allCases?.filter(c => c.status === "archived") ?? [];

  const openSymbols = openCases.map(c => c.symbol);
  const { data: quotes } = trpc.quotes.getMany.useQuery(
    { tickers: openSymbols },
    { enabled: openSymbols.length > 0, refetchInterval: 60000 }
  );

  const archiveMutation = trpc.shadow.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Archived");
      utils.shadow.listCases.invalidate();
      utils.shadow.getStats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAction = (action: string, c: ShadowCase) => {
    if (action === "review" || action === "addNote") {
      setSelectedCase(c);
      setDrawerOpen(true);
    } else if (action === "archive") {
      archiveMutation.mutate({ id: c.id, status: "archived" });
    }
  };

  const handleSelect = (c: ShadowCase) => {
    setSelectedCase(c);
    setDrawerOpen(true);
  };

  return (
    <>
      <Card className="flex flex-col h-full min-h-0">
        <CardHeader className="pb-0 border-b px-4 pt-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent h-auto gap-2 p-0">
              <TabsTrigger
                value="open"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none pb-2 text-xs"
              >
                Open
                <span className="ml-1.5 bg-muted px-1.5 py-0.5 rounded-full text-xs font-medium">
                  {openCases.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="closed"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none pb-2 text-xs"
              >
                Closed
                <span className="ml-1.5 bg-muted px-1.5 py-0.5 rounded-full text-xs font-medium">
                  {closedCases.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="archived"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none pb-2 text-xs"
              >
                Archived
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {activeTab === "open" && (
                <CasesTabContent cases={openCases} quotes={quotes} onSelect={handleSelect} onAction={handleAction} />
              )}
              {activeTab === "closed" && (
                <CasesTabContent cases={closedCases} quotes={undefined} onSelect={handleSelect} onAction={handleAction} />
              )}
              {activeTab === "archived" && (
                <CasesTabContent cases={archivedCases} quotes={undefined} onSelect={handleSelect} onAction={handleAction} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ReviewDrawer
        case_={selectedCase as any}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
