import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { importsService } from "../services/imports";

const importPreviewInput = z.object({
  sourceSystem: z.enum(["revolut", "ibkr", "n26"]),
  platformId: z.string().min(1),
  fileName: z.string().min(1),
  fileContent: z.string().min(1).max(8_000_000),
});

export const importsRouter = router({
  history: protectedProcedure.query(({ ctx }) =>
    importsService.history(ctx.session.user.id),
  ),

  preview: protectedProcedure
    .input(importPreviewInput)
    .mutation(({ ctx, input }) => importsService.preview(ctx.session.user.id, input)),

  commit: protectedProcedure
    .input(importPreviewInput.extend({ selectedRowHashes: z.array(z.string()).optional() }))
    .mutation(({ ctx, input }) => importsService.commit(ctx.session.user.id, input)),

  rollback: protectedProcedure
    .input(z.object({ batchId: z.string() }))
    .mutation(({ ctx, input }) => importsService.rollback(ctx.session.user.id, input.batchId)),
});
