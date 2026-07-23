"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { BadgeDollarSign, Save } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { SegmentedControl } from "@/components/SegmentedControl";
import { trpc } from "@/lib/trpc";
import {
  convertSessionCurrency,
  sessionCurrency,
  type SessionCurrency,
} from "@/lib/trading-sessions/currency";
import type { TradingSessionDetail } from "../types";

export function SessionInputs({
  session,
  usdPerEur,
  displayCurrency,
  onDisplayCurrencyChange,
}: {
  session: TradingSessionDetail;
  usdPerEur: number;
  displayCurrency: SessionCurrency;
  onDisplayCurrencyChange: (currency: SessionCurrency) => void;
}) {
  const initialCurrency = sessionCurrency(session.currencyCode);
  const [priceCurrency, setPriceCurrency] = useState<SessionCurrency>(initialCurrency);
  const [openingAverage, setOpeningAverage] = useState(
    (Number(session.openingTotalCost) / Number(session.openingQuantity)).toFixed(4),
  );
  const [startMark, setStartMark] = useState(Number(session.openingMarketPrice).toFixed(4));
  const [currentMark, setCurrentMark] = useState(
    Number(session.manualMarkPrice ?? session.openingMarketPrice).toFixed(4),
  );
  const [fxRate, setFxRate] = useState(usdPerEur.toFixed(6));
  const utils = trpc.useUtils();

  const mutation = trpc.tradingSessions.updateInputs.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tradingSessions.get.invalidate({ id: session.id }),
        utils.tradingSessions.list.invalidate(),
      ]);
      onDisplayCurrencyChange(priceCurrency);
      toast.success("Session prices updated");
    },
    onError: (error) => toast.error(error.message || "Session prices could not be updated"),
  });

  const changePriceCurrency = (next: SessionCurrency) => {
    const rate = Number(fxRate);
    const convert = (value: string) =>
      convertSessionCurrency(Number(value), priceCurrency, next, rate).toFixed(4);
    setOpeningAverage(convert(openingAverage));
    setStartMark(convert(startMark));
    setCurrentMark(convert(currentMark));
    setPriceCurrency(next);
  };

  const save = () => {
    if (
      !(Number(openingAverage) > 0)
      || !(Number(startMark) > 0)
      || !(Number(currentMark) > 0)
      || !(Number(fxRate) > 0)
    ) {
      toast.error("Enter positive prices and an EUR/USD rate greater than zero.");
      return;
    }
    mutation.mutate({
      id: session.id,
      openingAverageCost: openingAverage,
      openingMarketPrice: startMark,
      manualMarkPrice: currentMark,
      currencyCode: priceCurrency,
      usdPerEur: fxRate,
    });
  };

  return (
    <Card>
      <CardHeader className="gap-1 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <BadgeDollarSign className="h-4 w-4 text-[color:var(--info)]" />
            Session prices
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">Display in</span>
            <SegmentedControl<SessionCurrency>
              value={displayCurrency}
              onChange={onDisplayCurrencyChange}
              options={[
                { value: "USD", label: "USD" },
                { value: "EUR", label: "EUR" },
              ]}
            />
          </div>
        </div>
        <p className="text-xs text-text-tertiary">
          Calculations use the price currency. The display toggle only converts what you see.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 sm:grid-cols-2 xl:grid-cols-6">
        <Field label="Price currency" htmlFor="session-price-currency">
          <SegmentedControl<SessionCurrency>
            className="w-full"
            value={priceCurrency}
            onChange={changePriceCurrency}
            options={[
              { value: "USD", label: "USD" },
              { value: "EUR", label: "EUR" },
            ]}
          />
        </Field>
        <Field label={`Opening average (${priceCurrency})`} htmlFor="opening-average">
          <Input id="opening-average" type="number" min="0" step="0.0001"
            value={openingAverage} onChange={(event) => setOpeningAverage(event.target.value)} />
        </Field>
        <Field label={`Start mark (${priceCurrency})`} htmlFor="session-start-mark">
          <Input id="session-start-mark" type="number" min="0" step="0.0001"
            value={startMark} onChange={(event) => setStartMark(event.target.value)} />
        </Field>
        <Field label={`Current mark (${priceCurrency})`} htmlFor="session-current-mark">
          <Input id="session-current-mark" type="number" min="0" step="0.0001"
            value={currentMark} onChange={(event) => setCurrentMark(event.target.value)} />
        </Field>
        <Field label="1 EUR equals (USD)" htmlFor="session-fx-rate">
          <Input id="session-fx-rate" type="number" min="0" step="0.000001"
            value={fxRate} onChange={(event) => setFxRate(event.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button className="w-full" onClick={save} disabled={mutation.isPending}>
            <Save className="h-4 w-4" />
            {mutation.isPending ? "Saving prices…" : "Save prices"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, htmlFor, children }: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={htmlFor} className="truncate text-xs">{label}</Label>
      {children}
    </div>
  );
}
