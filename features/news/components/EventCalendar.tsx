"use client";

import type { CompanyEvent } from "@/app/server/services/news/types";
import { Badge } from "@/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { CalendarDays, ExternalLink } from "lucide-react";
import { formatDate } from "../format";

const EVENT_META: Record<CompanyEvent["type"], { label: string; variant: "default" | "info" | "success" | "warning" }> = {
  earnings: { label: "Report", variant: "info" },
  earnings_call: { label: "Call", variant: "default" },
  ex_dividend: { label: "Ex-div", variant: "warning" },
  dividend_payable: { label: "Payable", variant: "success" },
};

export function EventCalendar({
  events,
  loading,
}: {
  events: CompanyEvent[];
  loading: boolean;
}) {
  return (
    <Card loading={loading} className="overflow-hidden rounded-md">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-border">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-text-tertiary" />
            Upcoming events
          </CardTitle>
          <p className="mt-1 text-sm text-text-tertiary">Earnings and dividend dates from tracked symbols.</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px] px-4">Date</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="min-w-[220px]">Details</TableHead>
                <TableHead className="w-[52px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 px-4 text-center text-text-tertiary">
                    No upcoming earnings or dividend dates were returned for the tracked symbols.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => {
                  const meta = EVENT_META[event.type];
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="px-4 font-medium">{formatDate(event.date)}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{event.ticker}</div>
                        <div className="max-w-[160px] truncate text-xs text-text-tertiary">
                          {event.companyName || "Tracked symbol"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                          {event.isEstimate && <Badge variant="secondary">Estimate</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        <div className="font-medium text-text-primary">{event.title}</div>
                        {event.details && <div className="mt-1 text-xs">{event.details}</div>}
                      </TableCell>
                      <TableCell>
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-text-tertiary hover:bg-[color:var(--surface-2)] hover:text-text-primary"
                          aria-label={`Open ${event.ticker} on Yahoo Finance`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
