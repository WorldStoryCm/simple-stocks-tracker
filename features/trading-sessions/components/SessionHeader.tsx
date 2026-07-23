"use client";

import { LockKeyhole, Plus, Square } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/select";
import { formatSessionTime } from "../session-format";
import type { TradingSessionListItem } from "../types";

export function SessionHeader({
  sessions,
  selectedId,
  onSelect,
  onCreate,
  onClose,
  isClosing,
}: {
  sessions: TradingSessionListItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
  isClosing: boolean;
}) {
  const selected = sessions.find((session) => session.id === selectedId);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Trading sessions</h1>
          <Badge variant="info" className="gap-1">
            <LockKeyhole className="h-3 w-3" />
            Sandbox
          </Badge>
        </div>
        <p className="max-w-2xl text-sm text-text-secondary">
          Plan exits and record intraday actions without changing your trade ledger.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {sessions.length > 0 && (
          <Select value={selectedId} onValueChange={onSelect}>
            <SelectTrigger className="h-10 w-full sm:w-[280px]" aria-label="Selected trading session">
              <SelectValue placeholder="Choose a session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.symbol.ticker} · {session.platform.name} · {formatSessionTime(session.startedAt)}
                  {session.status === "closed" ? " · Closed" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selected?.status === "active" && (
          <Button variant="outline" onClick={onClose} disabled={isClosing}>
            <Square className="h-3.5 w-3.5 fill-current" />
            {isClosing ? "Ending…" : "End session"}
          </Button>
        )}
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Start session
        </Button>
      </div>
    </div>
  );
}
