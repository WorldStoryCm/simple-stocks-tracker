import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { GOAL_TYPES, goalsService } from "../services/goals";

const goalTypeEnum = z.enum(GOAL_TYPES);

export const goalsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    goalsService.list(ctx.session.user.id),
  ),

  upsert: protectedProcedure
    .input(z.object({ goalType: goalTypeEnum, amount: z.string() }))
    .mutation(({ ctx, input }) =>
      goalsService.upsert(ctx.session.user.id, input.goalType, input.amount),
    ),

  delete: protectedProcedure
    .input(z.object({ goalType: goalTypeEnum }))
    .mutation(({ ctx, input }) =>
      goalsService.remove(ctx.session.user.id, input.goalType),
    ),
});
