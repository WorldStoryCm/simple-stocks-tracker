"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BriefcaseBusiness, PenLine } from "lucide-react";
import { Button } from "@/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/dialog";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/select";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Textarea } from "@/components/textarea";
import { trpc } from "@/lib/trpc";
import { formatQuantity, localDateTimeValue, toIso } from "../session-format";
import type { PositionOption } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positions: PositionOption[];
  platforms: { id: string; name: string }[];
  symbols: { id: string; ticker: string; displayName: string | null }[];
  onCreated: (id: string) => void;
};

export function CreateSessionDialog({
  open, onOpenChange, positions, platforms, symbols, onCreated,
}: Props) {
  const firstPosition = positions[0];
  const [source, setSource] = useState<"position" | "manual">(
    firstPosition ? "position" : "manual",
  );
  const [positionKey, setPositionKey] = useState(
    firstPosition ? `${firstPosition.platform.id}:${firstPosition.symbol.id}` : "",
  );
  const [platformId, setPlatformId] = useState(platforms[0]?.id ?? "");
  const [symbolId, setSymbolId] = useState(symbols[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [averageCost, setAverageCost] = useState("");
  const [openingPrice, setOpeningPrice] = useState("");
  const [startedAt, setStartedAt] = useState(localDateTimeValue());
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  const selectedPosition = useMemo(
    () => positions.find((position) =>
      `${position.platform.id}:${position.symbol.id}` === positionKey),
    [positionKey, positions],
  );
  const selectedSymbol = source === "position"
    ? selectedPosition?.symbol
    : symbols.find((symbol) => symbol.id === symbolId);
  const { data: quote } = trpc.quotes.getMany.useQuery(
    { tickers: selectedSymbol ? [selectedSymbol.ticker] : [] },
    { enabled: Boolean(selectedSymbol) },
  );

  const livePrice = selectedSymbol ? quote?.[selectedSymbol.ticker]?.price : undefined;
  const suggestedPrice = livePrice && livePrice > 0
    ? String(livePrice)
    : selectedPosition ? String(selectedPosition.avgCost) : "";
  const resolvedOpeningPrice = openingPrice || suggestedPrice;

  const mutation = trpc.tradingSessions.create.useMutation({
    onSuccess: async (session) => {
      await utils.tradingSessions.list.invalidate();
      toast.success("Trading session started");
      onCreated(session.id);
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message || "Trading session could not be started"),
  });

  const startSession = () => {
    const resolvedPlatformId = source === "position" ? selectedPosition?.platform.id : platformId;
    const resolvedSymbolId = source === "position" ? selectedPosition?.symbol.id : symbolId;
    if (!resolvedPlatformId || !resolvedSymbolId || !(Number(resolvedOpeningPrice) > 0)) {
      toast.error("Choose a position and enter a starting market price.");
      return;
    }
    if (source === "manual" && (!(Number(quantity) > 0) || !(Number(averageCost) > 0))) {
      toast.error("Enter an opening quantity and average cost greater than zero.");
      return;
    }
    mutation.mutate({
      platformId: resolvedPlatformId,
      symbolId: resolvedSymbolId,
      openingSource: source,
      openingQuantity: source === "manual" ? quantity : undefined,
      openingAverageCost: source === "manual" ? averageCost : undefined,
      openingMarketPrice: resolvedOpeningPrice,
      startedAt: toIso(startedAt),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent accessibleTitle="Start trading session" className="w-[min(620px,calc(100vw-2rem))]">
        <DialogHeader title="Start trading session" />
        <div className="flex flex-col gap-5 pt-2">
          <div>
            <Label className="mb-2 block">Opening position</Label>
            <SegmentedControl<"position" | "manual">
              className="w-full"
              value={source}
              onChange={(value) => {
                setSource(value);
                setOpeningPrice("");
              }}
              options={[
                { value: "position", label: "Current position", disabled: positions.length === 0 },
                { value: "manual", label: "Enter manually" },
              ]}
            />
          </div>

          {source === "position" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="session-position">Position snapshot</Label>
              <Select value={positionKey} onValueChange={(value) => {
                setPositionKey(value);
                setOpeningPrice("");
              }}>
                <SelectTrigger id="session-position" className="h-10">
                  <SelectValue placeholder="Choose a position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem
                      key={`${position.platform.id}:${position.symbol.id}`}
                      value={`${position.platform.id}:${position.symbol.id}`}
                    >
                      {position.symbol.ticker} · {position.platform.name} · {formatQuantity(position.openQty)} shares
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPosition && (
                <div className="flex gap-4 rounded-lg bg-[color:var(--surface-2)] px-3 py-2 text-xs text-text-secondary">
                  <span>Quantity {formatQuantity(selectedPosition.openQty)}</span>
                  <span>Average cost {Number(selectedPosition.avgCost).toFixed(4)}</span>
                </div>
              )}
            </div>
          ) : (
            <ManualOpeningFields
              platforms={platforms}
              symbols={symbols}
              values={{ platformId, symbolId, quantity, averageCost }}
              setters={{ setPlatformId, setSymbolId, setQuantity, setAverageCost }}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starting market price" htmlFor="opening-price">
              <Input id="opening-price" type="number" min="0" step="0.0001" value={resolvedOpeningPrice}
                onChange={(event) => setOpeningPrice(event.target.value)} />
            </Field>
            <Field label="Session starts" htmlFor="session-start">
              <Input id="session-start" type="datetime-local" value={startedAt}
                onChange={(event) => setStartedAt(event.target.value)} />
            </Field>
          </div>
          <Field label="Notes (optional)" htmlFor="session-notes">
            <Textarea id="session-notes" value={notes} onChange={(event) => setNotes(event.target.value)}
              placeholder="Plan, catalyst, or risk limit…" />
          </Field>
          <div className="flex items-start gap-2 rounded-lg border border-[color:var(--info)]/25 bg-[color:var(--info-soft)] p-3 text-xs text-text-secondary">
            {source === "position" ? <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0" /> : <PenLine className="mt-0.5 h-4 w-4 shrink-0" />}
            This creates a frozen sandbox snapshot. Session actions never change Trades or Positions.
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Keep browsing</Button>
          <Button onClick={startSession} disabled={mutation.isPending}>
            {mutation.isPending ? "Starting session…" : "Start session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, htmlFor, children }: {
  label: string; htmlFor: string; children: React.ReactNode;
}) {
  return <div className="flex flex-col gap-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}

function ManualOpeningFields({ platforms, symbols, values, setters }: {
  platforms: Props["platforms"]; symbols: Props["symbols"];
  values: { platformId: string; symbolId: string; quantity: string; averageCost: string };
  setters: {
    setPlatformId: (value: string) => void; setSymbolId: (value: string) => void;
    setQuantity: (value: string) => void; setAverageCost: (value: string) => void;
  };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Platform" htmlFor="manual-platform">
        <Select value={values.platformId} onValueChange={setters.setPlatformId}>
          <SelectTrigger id="manual-platform" className="h-10"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>{platforms.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Symbol" htmlFor="manual-symbol">
        <Select value={values.symbolId} onValueChange={setters.setSymbolId}>
          <SelectTrigger id="manual-symbol" className="h-10"><SelectValue placeholder="Symbol" /></SelectTrigger>
          <SelectContent>{symbols.map((item) => <SelectItem key={item.id} value={item.id}>{item.ticker}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Quantity" htmlFor="manual-quantity">
        <Input id="manual-quantity" type="number" min="0" step="any" value={values.quantity}
          onChange={(event) => setters.setQuantity(event.target.value)} />
      </Field>
      <Field label="Average cost" htmlFor="manual-average-cost">
        <Input id="manual-average-cost" type="number" min="0" step="0.0001" value={values.averageCost}
          onChange={(event) => setters.setAverageCost(event.target.value)} />
      </Field>
    </div>
  );
}
