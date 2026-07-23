import { Layers3 } from "lucide-react";
import { Badge } from "@/components/badge";
import { Card, CardContent, CardHeader } from "@/components/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/table";
import { sortSessionEvents } from "@/lib/trading-sessions/calculations";
import type { SessionCurrency } from "@/lib/trading-sessions/currency";
import {
  formatQuantity, formatSessionPrice, formatSessionTime,
} from "../session-format";
import type { TradingSessionDetail } from "../types";

export function AcquisitionLots({
  session,
  displayCurrency,
  conversionFactor,
}: {
  session: TradingSessionDetail;
  displayCurrency: SessionCurrency;
  conversionFactor: number;
}) {
  const openingLots = session.openingLots.map((lot) => ({
    id: lot.id,
    source: "Opening" as const,
    acquiredAt: lot.acquiredAt ?? session.startedAt,
    quantity: Number(lot.quantity),
    price: Number(lot.unitPrice),
  }));
  const sessionBuys = sortSessionEvents(session.events)
    .filter((event) => event.eventType === "buy")
    .map((event) => ({
      id: event.id,
      source: "Session buy" as const,
      acquiredAt: event.executedAt,
      quantity: Number(event.quantity),
      price: Number(event.price),
    }));
  const rows = [...openingLots, ...sessionBuys].sort(
    (left, right) => new Date(left.acquiredAt).getTime() - new Date(right.acquiredAt).getTime(),
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Layers3 className="h-4 w-4 text-[color:var(--info)]" />
          Acquisition prices
        </div>
        <p className="text-xs text-text-tertiary">
          Original snapshot lots and buys added during this session. P/L uses pooled moving average cost.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Source</TableHead>
                <TableHead>Acquired</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="pr-4 text-right">Buy price ({displayCurrency})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-4">
                    <Badge variant={row.source === "Opening" ? "secondary" : "info"}>
                      {row.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-secondary">{formatSessionTime(row.acquiredAt)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatQuantity(row.quantity)}
                  </TableCell>
                  <TableCell className="pr-4 text-right font-mono tabular-nums">
                    {formatSessionPrice(row.price * conversionFactor, displayCurrency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
