"use client";

import toast from "react-hot-toast";
import { ArrowDownToLine, ArrowUpFromLine, History, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader } from "@/components/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/table";
import {
  sortSessionEvents, type SessionEventSnapshot,
} from "@/lib/trading-sessions/calculations";
import { trpc } from "@/lib/trpc";
import {
  formatQuantity, formatSessionPrice, formatSessionTime, formatSignedAmount, pnlClass,
} from "../session-format";
import type { TradingSessionDetail } from "../types";

export function SessionActivity({
  session,
  snapshots,
}: {
  session: TradingSessionDetail;
  snapshots: SessionEventSnapshot[];
}) {
  const utils = trpc.useUtils();
  const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.event.id, snapshot]));
  const events = sortSessionEvents(session.events).reverse();
  const mutation = trpc.tradingSessions.deleteEvent.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tradingSessions.get.invalidate({ id: session.id }),
        utils.tradingSessions.list.invalidate(),
      ]);
      toast.success("Session action deleted");
    },
    onError: (error) => toast.error(error.message || "Session action could not be deleted"),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border">
        <div className="flex items-center gap-2 text-base font-semibold">
          <History className="h-4 w-4 text-[color:var(--info)]" />
          Session activity
        </div>
        <p className="text-xs text-text-tertiary">
          Actions are replayed by timestamp. Same-day order is preserved.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {events.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-text-secondary">No session actions yet</p>
            <p className="mt-1 text-xs text-text-tertiary">
              Record a buy or sell to see its isolated P/L here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Realized P/L</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead className="w-12 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const snapshot = snapshotById.get(event.id);
                  const isBuy = event.eventType === "buy";
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="pl-4 text-text-secondary">
                        {formatSessionTime(event.executedAt)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 font-medium ${isBuy ? "text-[color:var(--info)]" : "text-[color:var(--warning)]"}`}>
                          {isBuy ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowUpFromLine className="h-3.5 w-3.5" />}
                          {isBuy ? "Buy" : "Sell"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatQuantity(Number(event.quantity))}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatSessionPrice(Number(event.price), session.currencyCode)}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold tabular-nums ${pnlClass(snapshot?.realizedPnl ?? 0)}`}>
                        {isBuy || !snapshot ? "—" : formatSignedAmount(snapshot.realizedPnl, session.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-text-secondary">
                        {snapshot ? formatQuantity(snapshot.state.quantity) : "—"}
                      </TableCell>
                      <TableCell className="pr-4">
                        {session.status === "active" && (
                          <Button variant="icon" size="icon" className="h-8 w-8"
                            aria-label={`Delete ${event.eventType} action`}
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ id: event.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
