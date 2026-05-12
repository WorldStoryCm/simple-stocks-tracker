import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { tickerCatalogService } from "../services/tickerCatalog";

const listInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  exchange: z.string().optional(),
});

export const tickerCatalogRouter = router({
  status: protectedProcedure.query(() => tickerCatalogService.status()),

  sync: protectedProcedure.mutation(() => tickerCatalogService.sync()),

  list: protectedProcedure
    .input(listInput)
    .query(({ input }) => tickerCatalogService.list(input)),
});
