import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { tradesService } from "../services/trades";

const tradesListInput = z
  .object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(40),
    action: z.string().default("all"),
    symbolId: z.string().optional(),
    platformId: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    sortField: z.enum(["tradeDate", "symbolId", "platformId", "tradeType", "price", "quantity", "total"]).default("tradeDate"),
    sortDir: z.enum(["asc", "desc"]).default("desc"),
  })
  .optional()
  .default({});

const tradeMutationInput = z.object({
  platformId: z.string(),
  symbolId: z.string(),
  tradeType: z.enum(["buy", "sell"]),
  tradeDate: z.string(),
  quantity: z.string(),
  price: z.string(),
  fee: z.string().default("0"),
  notes: z.string().optional(),
});

export const tradesRouter = router({
  list: protectedProcedure
    .input(tradesListInput)
    .query(({ ctx, input }) => tradesService.list(ctx.session.user.id, input)),

  getOpenQuantity: protectedProcedure
    .input(z.object({ platformId: z.string(), symbolId: z.string() }))
    .query(({ ctx, input }) =>
      tradesService.getOpenQuantity(ctx.session.user.id, input.platformId, input.symbolId),
    ),

  create: protectedProcedure
    .input(tradeMutationInput)
    .mutation(({ ctx, input }) => tradesService.create(ctx.session.user.id, input)),

  update: protectedProcedure
    .input(tradeMutationInput.extend({ id: z.string() }))
    .mutation(({ ctx, input }) => tradesService.update(ctx.session.user.id, input)),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => tradesService.remove(ctx.session.user.id, input.id)),

  symbolPnl: protectedProcedure
    .input(z.object({
      symbolId: z.string().min(1),
      platformId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(({ ctx, input }) => tradesService.symbolPnl(ctx.session.user.id, input)),
});
