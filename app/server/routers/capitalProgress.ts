import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { CAPITAL_CURRENCIES, capitalProgressService } from "../services/capitalProgress";

const settingsInput = z.object({
  currencyCode: z.enum(CAPITAL_CURRENCIES),
  targetAmount: z.string(),
});

export const capitalProgressRouter = router({
  get: protectedProcedure.query(({ ctx }) =>
    capitalProgressService.get(ctx.session.user.id),
  ),

  upsert: protectedProcedure
    .input(settingsInput)
    .mutation(({ ctx, input }) =>
      capitalProgressService.upsert(ctx.session.user.id, input),
    ),
});
