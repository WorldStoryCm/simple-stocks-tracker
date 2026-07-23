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
import { convertSessionCurrency, sessionCurrency, type SessionCurrency } from "@/lib/trading-sessions/currency";
import { formatQuantity, localDateTimeValue, toIso } from "../session-format";
import type { PositionOption } from "../types";
import { Field, ManualOpeningFields, type SessionPlatformOption, type SessionSymbolOption } from "./CreateSessionFields";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positions: PositionOption[];
  platforms: SessionPlatformOption[];
  symbols: SessionSymbolOption[];
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
  const [currencyOverride, setCurrencyOverride] = useState<SessionCurrency | null>(null);
  const [fxRateInput, setFxRateInput] = useState("");
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
  const { data: fxData } = trpc.tradingSessions.fxRate.useQuery();
  const usdPerEur = Number(fxRateInput || fxData?.usdPerEur || 1);
  const priceCurrency = currencyOverride ?? sessionCurrency(
    selectedSymbol?.currencyCode
    ?? selectedPosition?.currencyCode,
  );
  const sourceCurrency = sessionCurrency(selectedPosition?.currencyCode);
  const suggestedAverage = selectedPosition
    ? convertSessionCurrency(
      Number(selectedPosition.avgCost),
      sourceCurrency,
      priceCurrency,
      usdPerEur,
    ).toFixed(4)
    : "";
  const resolvedAverageCost = averageCost || suggestedAverage;
  const resolvedOpeningPrice = openingPrice || resolvedAverageCost;

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
    if (source === "manual" && (!(Number(quantity) > 0) || !(Number(resolvedAverageCost) > 0))) {
      toast.error("Enter an opening quantity and average cost greater than zero.");
      return;
    }
    mutation.mutate({
      platformId: resolvedPlatformId,
      symbolId: resolvedSymbolId,
      openingSource: source,
      openingQuantity: source === "manual" ? quantity : undefined,
      openingAverageCost: resolvedAverageCost,
      openingMarketPrice: resolvedOpeningPrice,
      currencyCode: priceCurrency,
      usdPerEur: String(usdPerEur),
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
                setAverageCost("");
                setCurrencyOverride(null);
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
                setAverageCost("");
                setCurrencyOverride(null);
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
                  <span>
                    Imported basis {Number(selectedPosition.avgCost).toFixed(4)} {selectedPosition.currencyCode}
                  </span>
                </div>
              )}
              <Field label={`Opening average price (${priceCurrency})`} htmlFor="position-average-cost">
                <Input id="position-average-cost" type="number" min="0" step="0.0001"
                  value={resolvedAverageCost}
                  onChange={(event) => setAverageCost(event.target.value)} />
              </Field>
            </div>
          ) : (
            <ManualOpeningFields
              platforms={platforms}
              symbols={symbols}
              values={{ platformId, symbolId, quantity, averageCost }}
              setters={{
                setPlatformId,
                setSymbolId: (value) => {
                  setSymbolId(value);
                  setCurrencyOverride(null);
                },
                setQuantity,
                setAverageCost,
              }}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price currency" htmlFor="opening-price-currency">
              <SegmentedControl<SessionCurrency>
                value={priceCurrency}
                onChange={(next) => {
                  if (averageCost) {
                    setAverageCost(convertSessionCurrency(
                      Number(averageCost), priceCurrency, next, usdPerEur,
                    ).toFixed(4));
                  }
                  if (openingPrice) {
                    setOpeningPrice(convertSessionCurrency(
                      Number(openingPrice), priceCurrency, next, usdPerEur,
                    ).toFixed(4));
                  }
                  setCurrencyOverride(next);
                }}
                options={[
                  { value: "USD", label: "USD" },
                  { value: "EUR", label: "EUR" },
                ]}
              />
            </Field>
            <Field label={`Starting/current mark (${priceCurrency})`} htmlFor="opening-price">
              <Input id="opening-price" type="number" min="0" step="0.0001" value={resolvedOpeningPrice}
                onChange={(event) => setOpeningPrice(event.target.value)} />
            </Field>
            <Field label="1 EUR equals (USD)" htmlFor="opening-fx-rate">
              <Input id="opening-fx-rate" type="number" min="0" step="0.000001"
                value={fxRateInput || usdPerEur}
                onChange={(event) => setFxRateInput(event.target.value)} />
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
