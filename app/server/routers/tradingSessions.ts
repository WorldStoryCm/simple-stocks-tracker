import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { tradingSessionsService } from "../services/tradingSessions";

const positiveDecimal = z.string().refine((value) => Number(value) > 0, {
  message: "Value must be greater than zero",
});
const nonNegativeDecimal = z.string().refine((value) => Number(value) >= 0, {
  message: "Value cannot be negative",
});

const createInput = z.object({
  platformId: z.string().min(1),
  symbolId: z.string().min(1),
  openingSource: z.enum(["position", "manual"]),
  openingQuantity: positiveDecimal.optional(),
  openingAverageCost: positiveDecimal.optional(),
  openingMarketPrice: positiveDecimal,
  currencyCode: z.enum(["USD", "EUR"]),
  usdPerEur: positiveDecimal.optional(),
  startedAt: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

const eventInput = z.object({
  sessionId: z.string().min(1),
  eventType: z.enum(["buy", "sell"]),
  executedAt: z.string().datetime(),
  quantity: positiveDecimal,
  price: positiveDecimal,
  fee: nonNegativeDecimal.default("0"),
  notes: z.string().max(500).optional(),
});

export const tradingSessionsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    tradingSessionsService.list(ctx.session.user.id)),
  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(({ ctx, input }) => tradingSessionsService.get(ctx.session.user.id, input.id)),
  fxRate: protectedProcedure.query(() => tradingSessionsService.fxRate()),
  create: protectedProcedure
    .input(createInput)
    .mutation(({ ctx, input }) => tradingSessionsService.create(ctx.session.user.id, input)),
  updateInputs: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
      openingAverageCost: positiveDecimal,
      openingMarketPrice: positiveDecimal,
      manualMarkPrice: positiveDecimal,
      currencyCode: z.enum(["USD", "EUR"]),
      usdPerEur: positiveDecimal,
    }))
    .mutation(({ ctx, input }) =>
      tradingSessionsService.updateInputs(ctx.session.user.id, input)),
  addEvent: protectedProcedure
    .input(eventInput)
    .mutation(({ ctx, input }) => tradingSessionsService.addEvent(ctx.session.user.id, input)),
  deleteEvent: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      tradingSessionsService.deleteEvent(ctx.session.user.id, input.id)),
  close: protectedProcedure
    .input(z.object({ id: z.string().min(1), endedAt: z.string().datetime() }))
    .mutation(({ ctx, input }) =>
      tradingSessionsService.close(ctx.session.user.id, input.id, input.endedAt)),
});
