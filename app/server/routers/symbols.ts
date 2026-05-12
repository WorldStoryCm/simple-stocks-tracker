import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { symbolsService } from "../services/symbols";

const symbolCreateInput = z.object({
  ticker: z.string().min(1).toUpperCase(),
  displayName: z.string().optional(),
  exchange: z.string().optional(),
  currencyCode: z.string().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  rsiTicker: z.string().optional(),
  notes: z.string().optional(),
});

const symbolUpdateInput = symbolCreateInput.extend({ id: z.string() });

const symbolPagedInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
});

export const symbolsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    symbolsService.listAll(ctx.session.user.id),
  ),

  paged: protectedProcedure
    .input(symbolPagedInput)
    .query(({ ctx, input }) =>
      symbolsService.listPaged(ctx.session.user.id, input),
    ),

  create: protectedProcedure
    .input(symbolCreateInput)
    .mutation(({ ctx, input }) =>
      symbolsService.create(ctx.session.user.id, input),
    ),

  update: protectedProcedure
    .input(symbolUpdateInput)
    .mutation(({ ctx, input }) =>
      symbolsService.update(ctx.session.user.id, input),
    ),

  enrichAll: protectedProcedure.mutation(({ ctx }) =>
    symbolsService.enrichAll(ctx.session.user.id),
  ),
});
