"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowDownToLine, ArrowUpFromLine, Plus } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Textarea } from "@/components/textarea";
import { trpc } from "@/lib/trpc";
import { formatQuantity, localDateTimeValue, toIso } from "../session-format";

export function SessionEventForm({
  sessionId,
  availableQuantity,
  currentPrice,
  isActive,
}: {
  sessionId: string;
  availableQuantity: number;
  currentPrice: number;
  isActive: boolean;
}) {
  const [eventType, setEventType] = useState<"buy" | "sell">("sell");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState(currentPrice > 0 ? currentPrice.toFixed(4) : "");
  const [fee, setFee] = useState("0");
  const [executedAt, setExecutedAt] = useState(localDateTimeValue());
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  const mutation = trpc.tradingSessions.addEvent.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tradingSessions.get.invalidate({ id: sessionId }),
        utils.tradingSessions.list.invalidate(),
      ]);
      toast.success(`${eventType === "buy" ? "Buy" : "Sell"} added to this session`);
      setQuantity("");
      setNotes("");
      setExecutedAt(localDateTimeValue());
    },
    onError: (error) => toast.error(error.message || "Session action could not be added"),
  });

  const addEvent = () => {
    if (!(Number(quantity) > 0) || !(Number(price) > 0)) {
      toast.error("Enter a quantity and price greater than zero.");
      return;
    }
    if (eventType === "sell" && Number(quantity) > availableQuantity + 0.000001) {
      toast.error(`Only ${formatQuantity(availableQuantity)} shares are available in this session.`);
      return;
    }
    mutation.mutate({
      sessionId,
      eventType,
      executedAt: toIso(executedAt),
      quantity,
      price,
      fee: fee || "0",
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Plus className="h-4 w-4 text-[color:var(--info)]" />
          Record session action
        </div>
        <p className="text-xs text-text-tertiary">
          This action exists only inside the selected session.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        {!isActive ? (
          <div className="rounded-lg bg-[color:var(--surface-2)] p-4 text-sm text-text-secondary">
            This session is closed. Its plan and history remain available to review.
          </div>
        ) : (
          <>
            <div>
              <Label className="mb-2 block">Action</Label>
              <SegmentedControl
                className="w-full"
                value={eventType}
                onChange={setEventType}
                options={[
                  { value: "buy", label: "Buy" },
                  { value: "sell", label: "Sell" },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity" htmlFor="event-quantity">
                <div className="relative">
                  <Input id="event-quantity" type="number" min="0" step="any" value={quantity}
                    className={eventType === "sell" ? "pr-14" : undefined}
                    onChange={(event) => setQuantity(event.target.value)} />
                  {eventType === "sell" && (
                    <button type="button" onClick={() => setQuantity(String(availableQuantity))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-[color:var(--info)] hover:bg-[color:var(--info-soft)]">
                      Max
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Price" htmlFor="event-price">
                <Input id="event-price" type="number" min="0" step="0.0001" value={price}
                  onChange={(event) => setPrice(event.target.value)} />
              </Field>
              <Field label="Fee" htmlFor="event-fee">
                <Input id="event-fee" type="number" min="0" step="0.01" value={fee}
                  onChange={(event) => setFee(event.target.value)} />
              </Field>
              <Field label="Executed at" htmlFor="event-time">
                <Input id="event-time" type="datetime-local" value={executedAt}
                  onChange={(event) => setExecutedAt(event.target.value)} />
              </Field>
            </div>
            <Field label="Notes (optional)" htmlFor="event-notes">
              <Textarea id="event-notes" value={notes} onChange={(event) => setNotes(event.target.value)}
                placeholder="Why this action?" className="min-h-[72px]" />
            </Field>
            <Button onClick={addEvent} disabled={mutation.isPending}>
              {eventType === "buy"
                ? <ArrowDownToLine className="h-4 w-4" />
                : <ArrowUpFromLine className="h-4 w-4" />}
              {mutation.isPending ? "Recording action…" : `Record ${eventType}`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, htmlFor, children }: {
  label: string; htmlFor: string; children: React.ReactNode;
}) {
  return <div className="flex flex-col gap-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}
