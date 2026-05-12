import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { shadowService } from "../services/shadow";

const directionEnum = z.enum(["up", "down", "watch"]);
const statusEnum = z.enum(["open", "review_ready", "closed", "archived"]);
const outcomeEnum = z.enum(["correct", "wrong", "mixed", "invalidated", "unreviewed"]);
const noteTypeEnum = z.enum(["thesis_note", "observation_note", "catalyst_note", "review_note", "lesson_note"]);

const listFiltersInput = z
  .object({
    status: statusEnum.optional(),
    direction: directionEnum.optional(),
    outcome: outcomeEnum.optional(),
    symbol: z.string().optional(),
  })
  .optional();

const createCaseInput = z.object({
  symbol: z.string().min(1).max(12).transform((v) => v.toUpperCase()),
  direction: directionEnum,
  thesis: z.string().min(1),
  confidence: z.string().optional(),
  timeHorizon: z.string().optional(),
  startedAt: z.string(),
  entryPrice: z.string(),
  platformId: z.string().optional(),
});

const reviewCaseInput = z.object({
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
});

const addNoteInput = z.object({
  caseId: z.string(),
  noteType: noteTypeEnum.default("observation_note"),
  title: z.string().optional(),
  body: z.string().min(1),
  isPinned: z.boolean().default(false),
});

export const shadowRouter = router({
  listCases: protectedProcedure
    .input(listFiltersInput)
    .query(({ ctx, input }) => shadowService.listCases(ctx.session.user.id, input)),

  createCase: protectedProcedure
    .input(createCaseInput)
    .mutation(({ ctx, input }) => shadowService.createCase(ctx.session.user.id, input)),

  reviewCase: protectedProcedure
    .input(reviewCaseInput)
    .mutation(({ ctx, input }) => shadowService.reviewCase(ctx.session.user.id, input)),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: statusEnum }))
    .mutation(({ ctx, input }) =>
      shadowService.updateStatus(ctx.session.user.id, input.id, input.status),
    ),

  getStats: protectedProcedure.query(({ ctx }) =>
    shadowService.getStats(ctx.session.user.id),
  ),

  addNote: protectedProcedure
    .input(addNoteInput)
    .mutation(({ ctx, input }) => shadowService.addNote(ctx.session.user.id, input)),

  listNotes: protectedProcedure
    .input(z.object({ caseId: z.string() }))
    .query(({ ctx, input }) =>
      shadowService.listNotes(ctx.session.user.id, input.caseId),
    ),

  listRecentNotes: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(({ ctx, input }) =>
      shadowService.listRecentNotes(ctx.session.user.id, input?.limit ?? 20),
    ),
});
