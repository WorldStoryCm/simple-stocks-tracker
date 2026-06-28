import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { dividendsService } from "../services/dividends";

const dividendFiltersInput = z.object({
  eventType: z.enum(["all", "dividend", "dividend_tax"]).default("all"),
  platformId: z.string().optional(),
  symbolId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const dividendListInput = dividendFiltersInput.extend({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(40),
});

export const dividendsRouter = router({
  list: protectedProcedure
    .input(dividendListInput)
    .query(({ ctx, input }) => dividendsService.list(ctx.session.user.id, input)),

  summary: protectedProcedure
    .input(dividendFiltersInput.partial().optional().default({}))
    .query(({ ctx, input }) => dividendsService.summary(ctx.session.user.id, input)),
});
