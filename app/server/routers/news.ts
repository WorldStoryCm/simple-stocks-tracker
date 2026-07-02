import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { newsService } from "../services/news";

const newsFeedInput = z.object({
  limitSymbols: z.number().int().min(1).max(80).default(40),
  newsPerSymbol: z.number().int().min(1).max(8).default(4),
  scope: z.enum(["all", "active", "owned_before"]).default("all"),
}).optional();

export const newsRouter = router({
  feed: protectedProcedure
    .input(newsFeedInput)
    .query(({ ctx, input }) => newsService.feed(ctx.session.user.id, input ?? {})),
});
