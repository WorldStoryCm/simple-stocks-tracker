"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader } from "@/components/card";
import { Loader2, Pin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/components/component.utils";

const noteTypeLabels: Record<string, string> = {
  thesis_note: "Thesis",
  observation_note: "Obs",
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

export function RightRail() {
  const { data: notes, isLoading } = trpc.shadow.listRecentNotes.useQuery({ limit: 30 });

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 border-b">
        <h2 className="font-semibold text-sm">Activity</h2>
        <p className="text-xs text-muted-foreground">Recent notes across all cases</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !notes || notes.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <p className="text-xs text-muted-foreground">No notes yet. Add notes to your cases as they develop.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notes.map(note => (
              <div key={note.id} className="rounded-md border bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs">{note.symbol}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full ring-1 ring-inset font-medium",
                    noteTypeColors[note.noteType] ?? "bg-muted text-muted-foreground ring-border"
                  )}>
                    {noteTypeLabels[note.noteType] ?? note.noteType}
                  </span>
                  {note.isPinned && <Pin className="h-2.5 w-2.5 text-muted-foreground" />}
                  <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(note.createdAt), "MMM d")}
                  </span>
                </div>
                {note.title && <p className="text-xs font-medium">{note.title}</p>}
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">{note.body}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
