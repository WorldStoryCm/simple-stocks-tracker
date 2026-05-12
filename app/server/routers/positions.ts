import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { positionsService } from "../services/positions";

const filtersSchema = z
  .object({
    platformId: z.string().optional(),
    symbolId: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .optional();

export const positionsRouter = router({
  list: protectedProcedure
    .input(z.object({ filters: filtersSchema }).optional())
    .query(({ ctx, input }) =>
      positionsService.list(ctx.session.user.id, input?.filters),
    ),
});
