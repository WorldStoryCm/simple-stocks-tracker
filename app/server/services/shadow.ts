import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { shadowCases, shadowNotes } from "@/db/schema";
import { getRsi } from "@/lib/rsi";

type Direction = "up" | "down" | "watch";
type Status = "open" | "review_ready" | "closed" | "archived";
type Outcome = "correct" | "wrong" | "mixed" | "invalidated" | "unreviewed";
type NoteType = "thesis_note" | "observation_note" | "catalyst_note" | "review_note" | "lesson_note";

export type ShadowListFilters = {
  status?: Status;
  direction?: Direction;
  outcome?: Outcome;
  symbol?: string;
};

export type ShadowCreateInput = {
  symbol: string;
  direction: Direction;
  thesis: string;
  confidence?: string;
  timeHorizon?: string;
  startedAt: string;
  entryPrice: string;
  platformId?: string;
};

export type ShadowReviewInput = {
  id: string;
  exitPrice: string;
  endedAt: string;
  outcome: Outcome;
  resultSummary?: string;
  whatHappened?: string;
  whyHappened?: string;
  whatInvalidated?: string;
  whatMissed?: string;
  watchNextTime?: string;
};

export type ShadowNoteInput = {
  caseId: string;
  noteType: NoteType;
  title?: string;
  body: string;
  isPinned: boolean;
};

async function listCases(userId: string, filters?: ShadowListFilters) {
  const conditions = [eq(shadowCases.userId, userId)];
  if (filters?.status) conditions.push(eq(shadowCases.status, filters.status));
  if (filters?.direction) conditions.push(eq(shadowCases.direction, filters.direction));
  if (filters?.outcome) conditions.push(eq(shadowCases.outcome, filters.outcome));

  const rows = await db
    .select()
    .from(shadowCases)
    .where(and(...conditions))
    .orderBy(desc(shadowCases.createdAt));

  if (filters?.symbol) {
    const sym = filters.symbol.toUpperCase();
    return rows.filter((r) => r.symbol.toUpperCase().includes(sym));
  }
  return rows;
}

async function createCase(userId: string, input: ShadowCreateInput) {
  // Freeze RSI at entry — best-effort, don't block case creation on it
  let entryRsi: string | undefined;
  try {
    const snap = await getRsi(userId, input.symbol);
    if (snap.rsi != null) entryRsi = snap.rsi.toFixed(2);
  } catch {
    // ignore — entry_rsi stays null
  }

  const [row] = await db.insert(shadowCases).values({
    userId,
    symbol: input.symbol,
    direction: input.direction,
    thesis: input.thesis,
    confidence: input.confidence,
    timeHorizon: input.timeHorizon,
    startedAt: new Date(input.startedAt),
    entryPrice: input.entryPrice,
    entryRsi,
    platformId: input.platformId,
    status: "open",
  }).returning();
  return row;
}

function buildReviewNoteBody(input: ShadowReviewInput): string {
  return [
    input.whatHappened && `**What happened:** ${input.whatHappened}`,
    input.whyHappened && `**Why:** ${input.whyHappened}`,
    input.whatInvalidated && `**What invalidated thesis:** ${input.whatInvalidated}`,
    input.whatMissed && `**What I missed:** ${input.whatMissed}`,
    input.watchNextTime && `**Watch next time:** ${input.watchNextTime}`,
  ].filter(Boolean).join("\n\n");
}

async function reviewCase(userId: string, input: ShadowReviewInput) {
  const [existingCase] = await db
    .select()
    .from(shadowCases)
    .where(and(eq(shadowCases.id, input.id), eq(shadowCases.userId, userId)));

  if (!existingCase) throw new Error("Case not found");

  const entry = parseFloat(existingCase.entryPrice);
  const exit = parseFloat(input.exitPrice);
  const priceChangeAbs = (exit - entry).toFixed(4);
  const priceChangePct = entry !== 0 ? (((exit - entry) / entry) * 100).toFixed(4) : "0";

  const [updated] = await db
    .update(shadowCases)
    .set({
      exitPrice: input.exitPrice,
      endedAt: new Date(input.endedAt),
      outcome: input.outcome,
      resultSummary: input.resultSummary,
      priceChangeAbs,
      priceChangePct,
      status: "closed",
    })
    .where(and(eq(shadowCases.id, input.id), eq(shadowCases.userId, userId)))
    .returning();

  const reviewBody = buildReviewNoteBody(input);
  if (reviewBody) {
    await db.insert(shadowNotes).values({
      shadowCaseId: input.id,
      noteType: "review_note",
      body: reviewBody,
    });
  }

  return updated;
}

async function updateStatus(userId: string, id: string, status: Status) {
  const extra = status === "archived" ? { archivedAt: new Date() } : {};
  const [updated] = await db
    .update(shadowCases)
    .set({ status, ...extra })
    .where(and(eq(shadowCases.id, id), eq(shadowCases.userId, userId)))
    .returning();
  return updated;
}

async function getStats(userId: string) {
  const cases = await db.select().from(shadowCases).where(eq(shadowCases.userId, userId));

  const open = cases.filter((c) => c.status === "open").length;
  const awaitingReview = cases.filter((c) => c.status === "review_ready").length;
  const closed = cases.filter((c) => c.status === "closed");

  const reviewed = closed.filter((c) => c.outcome && c.outcome !== "unreviewed");
  const correct = reviewed.filter((c) => c.outcome === "correct").length;
  const accuracyRate = reviewed.length > 0 ? Math.round((correct / reviewed.length) * 100) : null;

  const moves = closed
    .filter((c) => c.priceChangePct != null)
    .map((c) => ({ symbol: c.symbol, pct: parseFloat(c.priceChangePct!), direction: c.direction, outcome: c.outcome }));

  const directionMultiplier = (d: string) => (d === "down" ? -1 : 1);
  const scoredMoves = moves.map((m) => ({ ...m, score: m.pct * directionMultiplier(m.direction) }));
  const bestCall = scoredMoves.slice().sort((a, b) => b.score - a.score)[0] ?? null;
  const biggestMiss = scoredMoves.slice().sort((a, b) => a.score - b.score)[0] ?? null;

  return { open, awaitingReview, reviewed: reviewed.length, accuracyRate, bestCall, biggestMiss };
}

async function caseBelongsToUser(userId: string, caseId: string) {
  const [c] = await db
    .select({ id: shadowCases.id })
    .from(shadowCases)
    .where(and(eq(shadowCases.id, caseId), eq(shadowCases.userId, userId)));
  return !!c;
}

async function addNote(userId: string, input: ShadowNoteInput) {
  if (!(await caseBelongsToUser(userId, input.caseId))) throw new Error("Case not found");

  const [note] = await db.insert(shadowNotes).values({
    shadowCaseId: input.caseId,
    noteType: input.noteType,
    title: input.title,
    body: input.body,
    isPinned: input.isPinned,
  }).returning();
  return note;
}

async function listNotes(userId: string, caseId: string) {
  if (!(await caseBelongsToUser(userId, caseId))) return [];

  return db
    .select()
    .from(shadowNotes)
    .where(eq(shadowNotes.shadowCaseId, caseId))
    .orderBy(desc(shadowNotes.isPinned), desc(shadowNotes.createdAt));
}

async function listRecentNotes(userId: string, limit: number) {
  return db
    .select({
      id: shadowNotes.id,
      shadowCaseId: shadowNotes.shadowCaseId,
      noteType: shadowNotes.noteType,
      title: shadowNotes.title,
      body: shadowNotes.body,
      isPinned: shadowNotes.isPinned,
      createdAt: shadowNotes.createdAt,
      symbol: shadowCases.symbol,
    })
    .from(shadowNotes)
    .innerJoin(shadowCases, eq(shadowNotes.shadowCaseId, shadowCases.id))
    .where(eq(shadowCases.userId, userId))
    .orderBy(desc(shadowNotes.createdAt))
    .limit(limit);
}

export const shadowService = {
  listCases,
  createCase,
  reviewCase,
  updateStatus,
  getStats,
  addNote,
  listNotes,
  listRecentNotes,
};
