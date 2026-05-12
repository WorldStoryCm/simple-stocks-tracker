import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { performanceService } from "../services/performance";

const filtersSchema = z
  .object({
    platformId: z.string().optional(),
    symbolId: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .optional();

export const performanceRouter = router({
  stats: protectedProcedure
    .input(z.object({ filters: filtersSchema }).optional())
    .query(({ ctx, input }) =>
      performanceService.stats(ctx.session.user.id, input?.filters),
    ),
});
