"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/select";
import { solveTargetPrice } from "@/lib/trading-sessions/calculations";
import { formatSessionPrice, formatSignedAmount } from "../session-format";

export function TargetPriceCard({
  quantity,
  maxQuantity,
  onQuantityChange,
  averageCost,
  currentPrice,
  currencyCode,
}: {
  quantity: number;
  maxQuantity: number;
  onQuantityChange: (value: number) => void;
  averageCost: number;
  currentPrice: number;
  currencyCode: string;
}) {
  const [target, setTarget] = useState("100");
  const [mode, setMode] = useState<"position_profit" | "additional_profit">("position_profit");
  const [tickSize, setTickSize] = useState("0.01");
  const [fee, setFee] = useState("0");

  const result = useMemo(() => solveTargetPrice({
    target: Math.max(0, Number(target) || 0),
    mode,
    quantity,
    averageCost,
    currentPrice,
    fee: Math.max(0, Number(fee) || 0),
    tickSize: Number(tickSize),
  }), [averageCost, currentPrice, fee, mode, quantity, target, tickSize]);

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Calculator className="h-4 w-4 text-[color:var(--info)]" />
          Target price
        </div>
        <p className="text-xs text-text-tertiary">
          Find the minimum tick-aligned exit price for your profit target.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="target-mode">Target means</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
            <SelectTrigger id="target-mode" className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="position_profit">Profit over average cost</SelectItem>
              <SelectItem value="additional_profit">Additional profit from now</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Profit target" htmlFor="profit-target">
            <Input id="profit-target" type="number" min="0" step="1" value={target}
              onChange={(event) => setTarget(event.target.value)} />
          </Field>
          <Field label="Sell quantity" htmlFor="target-quantity">
            <Input id="target-quantity" type="number" min="0" max={maxQuantity} step="any"
              value={quantity || ""} onChange={(event) =>
                onQuantityChange(Math.min(maxQuantity, Math.max(0, Number(event.target.value))))} />
          </Field>
          <Field label="Tick size" htmlFor="target-tick">
            <Select value={tickSize} onValueChange={setTickSize}>
              <SelectTrigger id="target-tick" className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["0.0001", "0.001", "0.01", "0.1", "1"].map((value) =>
                  <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Estimated fee" htmlFor="target-fee">
            <Input id="target-fee" type="number" min="0" step="0.01" value={fee}
              onChange={(event) => setFee(event.target.value)} />
          </Field>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-[color:var(--positive)]/25 bg-[color:var(--positive-soft)] p-4">
          <ArrowUpRight className="absolute -right-2 -top-2 h-16 w-16 text-[color:var(--positive)] opacity-10" />
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-text-tertiary">
            Minimum exit price
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[color:var(--positive)]">
            {result ? formatSessionPrice(result.price, currencyCode) : "—"}
          </p>
          {result && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
              <span>Exact {formatSessionPrice(result.exactPrice, currencyCode)}</span>
              <span>Projected {formatSignedAmount(result.projectedProfit, currencyCode)}</span>
            </div>
          )}
        </div>
        <p className="text-xs leading-5 text-text-tertiary">
          Fees are included. Taxes and broker-specific rounding are not.
        </p>
      </CardContent>
    </Card>
  );
}

function Field({ label, htmlFor, children }: {
  label: string; htmlFor: string; children: React.ReactNode;
}) {
  return <div className="flex flex-col gap-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}
