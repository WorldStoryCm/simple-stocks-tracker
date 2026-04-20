"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Textarea } from "@/components/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Badge } from "@/components/badge";
import { DirectionBadge, OutcomeBadge, MoveBadge } from "./ShadowBadges";
import { Loader2, Plus, Pin } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/components/component.utils";
import toast from "react-hot-toast";

type ShadowCase = {
  id: string;
  symbol: string;
  direction: string;
  thesis: string;
  confidence: string | null;
  timeHorizon: string | null;
  startedAt: Date;
  entryPrice: string;
  exitPrice: string | null;
  priceChangeAbs: string | null;
  priceChangePct: string | null;
  outcome: string | null;
  resultSummary: string | null;
  status: string;
  endedAt: Date | null;
  createdAt: Date;
};

const reviewSchema = z.object({
  exitPrice: z.string().min(1, "Required"),
  endedAt: z.string().min(1, "Required"),
  outcome: z.enum(["correct", "wrong", "mixed", "invalidated", "unreviewed"]),
  resultSummary: z.string().optional(),
  whatHappened: z.string().optional(),
  whyHappened: z.string().optional(),
  whatInvalidated: z.string().optional(),
  whatMissed: z.string().optional(),
  watchNextTime: z.string().optional(),
});

type ReviewValues = z.infer<typeof reviewSchema>;

const noteTypeLabels: Record<string, string> = {
  thesis_note: "Thesis",
  observation_note: "Observation",
  catalyst_note: "Catalyst",
  review_note: "Review",
  lesson_note: "Lesson",
};

const noteTypeColors: Record<string, string> = {
  thesis_note: "bg-blue-500/10 text-blue-500 ring-blue-500/20",
  observation_note: "bg-muted text-muted-foreground ring-border",
  catalyst_note: "bg-orange-500/10 text-orange-500 ring-orange-500/20",
  review_note: "bg-primary/10 text-primary ring-primary/20",
  lesson_note: "bg-purple-500/10 text-purple-500 ring-purple-500/20",
};

interface ReviewDrawerProps {
  case_: ShadowCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewDrawer({ case_, open, onOpenChange }: ReviewDrawerProps) {
  const utils = trpc.useUtils();
  const [addingNote, setAddingNote] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<"thesis_note" | "observation_note" | "catalyst_note" | "review_note" | "lesson_note">("observation_note");

  const { data: notes } = trpc.shadow.listNotes.useQuery(
    { caseId: case_?.id ?? "" },
    { enabled: !!case_?.id && open }
  );

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      endedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      outcome: "wrong",
    },
  });

  const reviewMutation = trpc.shadow.reviewCase.useMutation({
    onSuccess: () => {
      toast.success("Case reviewed!");
      utils.shadow.listCases.invalidate();
      utils.shadow.getStats.invalidate();
      utils.shadow.listRecentNotes.invalidate();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const addNoteMutation = trpc.shadow.addNote.useMutation({
    onSuccess: () => {
      toast.success("Note added");
      setNoteBody("");
      setAddingNote(false);
      utils.shadow.listNotes.invalidate({ caseId: case_?.id });
      utils.shadow.listRecentNotes.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const statusMutation = trpc.shadow.updateStatus.useMutation({
    onSuccess: () => {
      utils.shadow.listCases.invalidate();
      utils.shadow.getStats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!case_) return null;

  const daysOpen = differenceInDays(new Date(), new Date(case_.startedAt));
  const isClosed = case_.status === "closed" || case_.status === "archived";

  const onReviewSubmit = (data: ReviewValues) => {
    reviewMutation.mutate({ id: case_.id, ...data });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent style={{ maxWidth: 720, width: '100%' }} className="flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight">{case_.symbol}</span>
            <DirectionBadge direction={case_.direction} />
            {isClosed && <OutcomeBadge outcome={case_.outcome} />}
          </div>
          <SheetTitle className="sr-only">Case: {case_.symbol}</SheetTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Started {format(new Date(case_.startedAt), "MMM d, yyyy")} · {daysOpen}d open
            {case_.timeHorizon && ` · ${case_.timeHorizon}`}
            {case_.confidence && ` · Confidence ${case_.confidence}/5`}
          </p>
        </SheetHeader>

        <Tabs defaultValue="thesis" className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-5 mt-3 w-auto justify-start h-8 gap-1 bg-transparent border-b rounded-none pb-0">
            {["thesis", "result", ...(isClosed ? [] : ["review"]), "notes"].map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none capitalize pb-2 text-xs"
              >
                {tab === "review" ? "Review Now" : tab}
              </TabsTrigger>
            ))}
            {isClosed && (
              <TabsTrigger
                value="review"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none capitalize pb-2 text-xs"
              >
                Details
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            {/* Thesis Tab */}
            <TabsContent value="thesis" className="m-0 p-5 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Thesis</p>
                <p className="text-sm leading-relaxed">{case_.thesis}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Entry Price</p>
                  <p className="font-semibold">${parseFloat(case_.entryPrice).toFixed(2)}</p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Horizon</p>
                  <p className="font-semibold">{case_.timeHorizon ?? "—"}</p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Confidence</p>
                  <p className="font-semibold">{case_.confidence ? `${case_.confidence}/5` : "—"}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                {case_.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => statusMutation.mutate({ id: case_.id, status: "review_ready" })}
                    disabled={statusMutation.isPending}
                  >
                    Mark Ready to Review
                  </Button>
                )}
                {case_.status !== "archived" && !isClosed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => statusMutation.mutate({ id: case_.id, status: "archived" })}
                    disabled={statusMutation.isPending}
                  >
                    Archive
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* Result Tab */}
            <TabsContent value="result" className="m-0 p-5 space-y-4">
              {isClosed ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-md p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Entry</p>
                      <p className="font-semibold">${parseFloat(case_.entryPrice).toFixed(2)}</p>
                    </div>
                    <div className="bg-muted/30 rounded-md p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Exit</p>
                      <p className="font-semibold">{case_.exitPrice ? `$${parseFloat(case_.exitPrice).toFixed(2)}` : "—"}</p>
                    </div>
                    <div className="bg-muted/30 rounded-md p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Move</p>
                      <MoveBadge pct={case_.priceChangePct} direction={case_.direction} />
                    </div>
                    <div className="bg-muted/30 rounded-md p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Outcome</p>
                      <OutcomeBadge outcome={case_.outcome} />
                    </div>
                  </div>
                  {case_.resultSummary && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Summary</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{case_.resultSummary}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Close the case to see results.</p>
              )}
            </TabsContent>

            {/* Review Tab (only for open/review_ready) */}
            {!isClosed && (
              <TabsContent value="review" className="m-0 p-5">
                <form onSubmit={handleSubmit(onReviewSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Exit Price</Label>
                      <Input {...register("exitPrice")} type="number" step="0.0001" placeholder="0.00" />
                      {errors.exitPrice && <p className="text-xs text-destructive">{errors.exitPrice.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">End Date</Label>
                      <Input {...register("endedAt")} type="datetime-local" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Outcome</Label>
                    <Select onValueChange={(v) => setValue("outcome", v as ReviewValues["outcome"])} defaultValue="wrong">
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="correct">Correct</SelectItem>
                        <SelectItem value="wrong">Wrong</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                        <SelectItem value="invalidated">Invalidated</SelectItem>
                        <SelectItem value="unreviewed">Unreviewed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {[
                    { name: "whatHappened" as const, label: "What actually happened?" },
                    { name: "whyHappened" as const, label: "Why do I think it happened?" },
                    { name: "whatInvalidated" as const, label: "What invalidated my thesis?" },
                    { name: "whatMissed" as const, label: "What did I miss?" },
                    { name: "watchNextTime" as const, label: "What should I watch next time?" },
                  ].map(field => (
                    <div key={field.name} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{field.label}</Label>
                      <Textarea {...register(field.name)} rows={2} className="resize-none text-sm" />
                    </div>
                  ))}

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Summary (optional)</Label>
                    <Textarea {...register("resultSummary")} rows={2} className="resize-none text-sm" placeholder="Short conclusion..." />
                  </div>

                  <Button type="submit" disabled={reviewMutation.isPending} className="w-full">
                    {reviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Close Case
                  </Button>
                </form>
              </TabsContent>
            )}

            {/* Notes Tab */}
            <TabsContent value="notes" className="m-0 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
                <Button size="sm" variant="outline" onClick={() => setAddingNote(v => !v)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Note
                </Button>
              </div>

              {addingNote && (
                <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                  <Select onValueChange={(v) => setNoteType(v as typeof noteType)} defaultValue="observation_note">
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(noteTypeLabels).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={noteBody}
                    onChange={e => setNoteBody(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                    placeholder="Add a note..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => addNoteMutation.mutate({ caseId: case_.id, noteType, body: noteBody })}
                      disabled={!noteBody || addNoteMutation.isPending}
                    >
                      {addNoteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingNote(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {notes?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                )}
                {notes?.map(note => (
                  <div key={note.id} className="rounded-md border p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full ring-1 ring-inset font-medium",
                        noteTypeColors[note.noteType] ?? "bg-muted text-muted-foreground ring-border"
                      )}>
                        {noteTypeLabels[note.noteType] ?? note.noteType}
                      </span>
                      {note.isPinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), "MMM d, HH:mm")}
                      </span>
                    </div>
                    {note.title && <p className="text-xs font-medium">{note.title}</p>}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.body}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
