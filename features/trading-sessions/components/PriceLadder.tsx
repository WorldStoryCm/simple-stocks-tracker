"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Gauge, LocateFixed } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/table";
import { cn } from "@/components/component.utils";
import { buildPriceLadder } from "@/lib/trading-sessions/calculations";
import {
  formatSessionPrice, formatSignedAmount, pnlClass,
} from "../session-format";

const STEP_OPTIONS = ["0.01", "0.1", "1", "10"];

export function PriceLadder({
  currentPrice,
  averageCost,
  availableQuantity,
  plannedQuantity,
  onPlannedQuantityChange,
  currencyCode,
}: {
  currentPrice: number;
  averageCost: number;
  availableQuantity: number;
  plannedQuantity: number;
  onPlannedQuantityChange: (value: number) => void;
  currencyCode: string;
}) {
  const [stepChoice, setStepChoice] = useState("0.01");
  const [customStep, setCustomStep] = useState("0.05");
  const [fee, setFee] = useState("0");
  const centerRef = useRef<HTMLTableRowElement>(null);
  const step = stepChoice === "custom" ? Number(customStep) : Number(stepChoice);
  const validStep = step > 0 ? step : 0.01;

  const rows = useMemo(() => buildPriceLadder({
    currentPrice,
    quantity: plannedQuantity,
    averageCost,
    fee: Math.max(0, Number(fee) || 0),
    step: validStep,
    rows: 15,
  }), [averageCost, currentPrice, fee, plannedQuantity, validStep]);

  useEffect(() => {
    centerRef.current?.scrollIntoView({ block: "center" });
  }, [currentPrice, validStep]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold">
              <Gauge className="h-4 w-4 text-[color:var(--info)]" />
              Exit price ladder
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              15 price steps above and below the current mark. Sale P/L uses the moving average cost.
              {" "}Displayed in {currencyCode}.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => centerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })}
          >
            <LocateFixed className="h-4 w-4" />
            Current
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ladder-quantity">Sell quantity</Label>
              <button type="button" className="text-xs font-medium text-[color:var(--info)] hover:underline"
                onClick={() => onPlannedQuantityChange(availableQuantity)}>
                Use all
              </button>
            </div>
            <Input id="ladder-quantity" type="number" min="0" max={availableQuantity} step="any"
              value={plannedQuantity || ""} onChange={(event) =>
                onPlannedQuantityChange(Math.min(availableQuantity, Math.max(0, Number(event.target.value))))} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ladder-step">Price step</Label>
            <div className="flex gap-2">
              <Select value={stepChoice} onValueChange={setStepChoice}>
                <SelectTrigger id="ladder-step" className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STEP_OPTIONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {stepChoice === "custom" && (
                <Input aria-label="Custom price step" type="number" min="0" step="0.0001"
                  value={customStep} onChange={(event) => setCustomStep(event.target.value)} />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ladder-fee">Estimated sell fee</Label>
            <Input id="ladder-fee" type="number" min="0" step="0.01" value={fee}
              onChange={(event) => setFee(event.target.value)} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-[590px] overflow-auto [scrollbar-gutter:stable]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Exit price ({currencyCode})</TableHead>
                <TableHead className="text-right">Net proceeds</TableHead>
                <TableHead className="text-right">Sale P/L</TableHead>
                <TableHead className="text-right">Return</TableHead>
                <TableHead className="pr-4 text-right">Vs current</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isCurrent = row.offsetSteps === 0;
                return (
                  <TableRow
                    key={row.offsetSteps}
                    ref={isCurrent ? centerRef : undefined}
                    className={cn(
                      "font-mono tabular-nums",
                      row.offsetSteps > 0 && "bg-[color:var(--positive-soft)]/25",
                      row.offsetSteps < 0 && "bg-[color:var(--negative-soft)]/20",
                      isCurrent && "border-y border-[color:var(--info)]/50 bg-[color:var(--info-soft)] hover:bg-[color:var(--info-soft)]",
                    )}
                  >
                    <TableCell className="pl-4 font-semibold text-text-primary">
                      <span className="inline-flex items-center gap-2">
                        {formatSessionPrice(row.price, currencyCode)}
                        {isCurrent && (
                          <span className="rounded bg-[color:var(--info)]/20 px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-[color:var(--info)]">
                            Now
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-text-secondary">
                      {formatSessionPrice(row.proceeds, currencyCode)}
                    </TableCell>
                    <TableCell className={cn("text-right font-semibold", pnlClass(row.salePnl))}>
                      {formatSignedAmount(row.salePnl, currencyCode)}
                    </TableCell>
                    <TableCell className={cn("text-right", pnlClass(row.salePnl))}>
                      {row.returnPercentage > 0 ? "+" : ""}{row.returnPercentage.toFixed(2)}%
                    </TableCell>
                    <TableCell className={cn("pr-4 text-right", pnlClass(row.changeFromCurrent))}>
                      {formatSignedAmount(row.changeFromCurrent, currencyCode)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
