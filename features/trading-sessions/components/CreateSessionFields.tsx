"use client";

import { Input } from "@/components/input";
import { Label } from "@/components/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/select";

export type SessionPlatformOption = { id: string; name: string };
export type SessionSymbolOption = {
  id: string;
  ticker: string;
  displayName: string | null;
  currencyCode?: string | null;
};

export function Field({ label, htmlFor, children }: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function ManualOpeningFields({
  platforms,
  symbols,
  values,
  setters,
}: {
  platforms: SessionPlatformOption[];
  symbols: SessionSymbolOption[];
  values: { platformId: string; symbolId: string; quantity: string; averageCost: string };
  setters: {
    setPlatformId: (value: string) => void;
    setSymbolId: (value: string) => void;
    setQuantity: (value: string) => void;
    setAverageCost: (value: string) => void;
  };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Platform" htmlFor="manual-platform">
        <Select value={values.platformId} onValueChange={setters.setPlatformId}>
          <SelectTrigger id="manual-platform" className="h-10">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            {platforms.map((item) =>
              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Symbol" htmlFor="manual-symbol">
        <Select value={values.symbolId} onValueChange={setters.setSymbolId}>
          <SelectTrigger id="manual-symbol" className="h-10">
            <SelectValue placeholder="Symbol" />
          </SelectTrigger>
          <SelectContent>
            {symbols.map((item) =>
              <SelectItem key={item.id} value={item.id}>{item.ticker}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Quantity" htmlFor="manual-quantity">
        <Input id="manual-quantity" type="number" min="0" step="any" value={values.quantity}
          onChange={(event) => setters.setQuantity(event.target.value)} />
      </Field>
      <Field label="Opening average price" htmlFor="manual-average-cost">
        <Input id="manual-average-cost" type="number" min="0" step="0.0001"
          value={values.averageCost}
          onChange={(event) => setters.setAverageCost(event.target.value)} />
      </Field>
    </div>
  );
}
