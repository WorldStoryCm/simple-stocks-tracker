import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { platformsService } from "../services/platforms";

const createInput = z.object({
  name: z.string().min(1),
  currencyCode: z.string().default("USD"),
  initialBalance: z.string().optional(),
  notes: z.string().optional(),
});

const updateInput = z.object({
  id: z.string(),
  name: z.string().min(1),
  currencyCode: z.string(),
  notes: z.string().optional(),
  isActive: z.boolean(),
});

const adjustCashInput = z.object({
  id: z.string(),
  amount: z.string(),
  type: z.enum(["deposit", "withdrawal"]),
});

export const platformsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    platformsService.list(ctx.session.user.id),
  ),

  create: protectedProcedure
    .input(createInput)
    .mutation(({ ctx, input }) => platformsService.create(ctx.session.user.id, input)),

  update: protectedProcedure
    .input(updateInput)
    .mutation(({ ctx, input }) => platformsService.update(ctx.session.user.id, input)),

  adjustCash: protectedProcedure
    .input(adjustCashInput)
    .mutation(({ ctx, input }) => platformsService.adjustCash(ctx.session.user.id, input)),
});
