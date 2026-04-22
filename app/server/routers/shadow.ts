import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { shadowCases, shadowNotes } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getRsi } from '@/lib/rsi';

const directionEnum = z.enum(["up", "down", "watch"]);
const statusEnum = z.enum(["open", "review_ready", "closed", "archived"]);
const outcomeEnum = z.enum(["correct", "wrong", "mixed", "invalidated", "unreviewed"]);
const noteTypeEnum = z.enum(["thesis_note", "observation_note", "catalyst_note", "review_note", "lesson_note"]);

export const shadowRouter = router({
  listCases: protectedProcedure
    .input(z.object({
      status: statusEnum.optional(),
      direction: directionEnum.optional(),
      outcome: outcomeEnum.optional(),
      symbol: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const conditions = [eq(shadowCases.userId, userId)];
      if (input?.status) conditions.push(eq(shadowCases.status, input.status));
      if (input?.direction) conditions.push(eq(shadowCases.direction, input.direction));
      if (input?.outcome) conditions.push(eq(shadowCases.outcome, input.outcome));

      const rows = await db
        .select()
        .from(shadowCases)
        .where(and(...conditions))
        .orderBy(desc(shadowCases.createdAt));

      if (input?.symbol) {
        const sym = input.symbol.toUpperCase();
        return rows.filter(r => r.symbol.toUpperCase().includes(sym));
      }
      return rows;
    }),

  createCase: protectedProcedure
    .input(z.object({
      symbol: z.string().min(1).max(12).transform(v => v.toUpperCase()),
      direction: directionEnum,
      thesis: z.string().min(1),
      confidence: z.string().optional(),
      timeHorizon: z.string().optional(),
      startedAt: z.string(),
      entryPrice: z.string(),
      platformId: z.string().optional(),
      bucket: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

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
        bucket: input.bucket,
        status: "open",
      }).returning();
      return row;
    }),

  reviewCase: protectedProcedure
    .input(z.object({
      id: z.string(),
      exitPrice: z.string(),
      endedAt: z.string(),
      outcome: outcomeEnum,
      resultSummary: z.string().optional(),
      whatHappened: z.string().optional(),
      whyHappened: z.string().optional(),
      whatInvalidated: z.string().optional(),
      whatMissed: z.string().optional(),
      watchNextTime: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

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

      const reviewBody = [
        input.whatHappened && `**What happened:** ${input.whatHappened}`,
        input.whyHappened && `**Why:** ${input.whyHappened}`,
        input.whatInvalidated && `**What invalidated thesis:** ${input.whatInvalidated}`,
        input.whatMissed && `**What I missed:** ${input.whatMissed}`,
        input.watchNextTime && `**Watch next time:** ${input.watchNextTime}`,
      ].filter(Boolean).join('\n\n');

      if (reviewBody) {
        await db.insert(shadowNotes).values({
          shadowCaseId: input.id,
          noteType: "review_note",
          body: reviewBody,
        });
      }

      return updated;
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: statusEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const extra = input.status === "archived" ? { archivedAt: new Date() } : {};
      const [updated] = await db
        .update(shadowCases)
        .set({ status: input.status, ...extra })
        .where(and(eq(shadowCases.id, input.id), eq(shadowCases.userId, userId)))
        .returning();
      return updated;
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const cases = await db
      .select()
      .from(shadowCases)
      .where(eq(shadowCases.userId, userId));

    const open = cases.filter(c => c.status === "open").length;
    const awaitingReview = cases.filter(c => c.status === "review_ready").length;
    const closed = cases.filter(c => c.status === "closed");

    const reviewed = closed.filter(c => c.outcome && c.outcome !== "unreviewed");
    const correct = reviewed.filter(c => c.outcome === "correct").length;
    const accuracyRate = reviewed.length > 0 ? Math.round((correct / reviewed.length) * 100) : null;

    const moves = closed
      .filter(c => c.priceChangePct != null)
      .map(c => ({ symbol: c.symbol, pct: parseFloat(c.priceChangePct!), direction: c.direction, outcome: c.outcome }));

    const directionMultiplier = (d: string) => d === "down" ? -1 : 1;
    const scoredMoves = moves.map(m => ({ ...m, score: m.pct * directionMultiplier(m.direction) }));
    const bestCall = scoredMoves.sort((a, b) => b.score - a.score)[0] ?? null;
    const biggestMiss = scoredMoves.sort((a, b) => a.score - b.score)[0] ?? null;

    return { open, awaitingReview, reviewed: reviewed.length, accuracyRate, bestCall, biggestMiss };
  }),

  addNote: protectedProcedure
    .input(z.object({
      caseId: z.string(),
      noteType: noteTypeEnum.default("observation_note"),
      title: z.string().optional(),
      body: z.string().min(1),
      isPinned: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [c] = await db
        .select({ id: shadowCases.id })
        .from(shadowCases)
        .where(and(eq(shadowCases.id, input.caseId), eq(shadowCases.userId, userId)));
      if (!c) throw new Error("Case not found");

      const [note] = await db.insert(shadowNotes).values({
        shadowCaseId: input.caseId,
        noteType: input.noteType,
        title: input.title,
        body: input.body,
        isPinned: input.isPinned,
      }).returning();
      return note;
    }),

  listNotes: protectedProcedure
    .input(z.object({ caseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [c] = await db
        .select({ id: shadowCases.id })
        .from(shadowCases)
        .where(and(eq(shadowCases.id, input.caseId), eq(shadowCases.userId, userId)));
      if (!c) return [];

      return db
        .select()
        .from(shadowNotes)
        .where(eq(shadowNotes.shadowCaseId, input.caseId))
        .orderBy(desc(shadowNotes.isPinned), desc(shadowNotes.createdAt));
    }),

  listRecentNotes: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const limit = input?.limit ?? 20;

      const notes = await db
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

      return notes;
    }),
});
