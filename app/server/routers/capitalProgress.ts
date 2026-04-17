import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/db/drizzle";
import { capitalProgressSettings } from "@/db/schema";

const CURRENCIES = ["EUR", "USD"] as const;

const settingsInput = z.object({
  currencyCode: z.enum(CURRENCIES),
  targetAmount: z.string(),
  manualContributionAmount: z.string(),
});

const DEFAULT_SETTINGS = {
  currencyCode: "EUR" as const,
  targetAmount: "100000.00",
  manualContributionAmount: "0.00",
};

function parsePositiveAmount(raw: string, field: string) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be greater than 0`);
  }

  return value.toFixed(2);
}

function parseNonNegativeAmount(raw: string, field: string) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be 0 or greater`);
  }

  return value.toFixed(2);
}

export const capitalProgressRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const existing = await db.query.capitalProgressSettings.findFirst({
      where: eq(capitalProgressSettings.userId, ctx.session.user.id),
    });

    return existing ?? DEFAULT_SETTINGS;
  }),

  upsert: protectedProcedure
    .input(settingsInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const targetAmount = parsePositiveAmount(input.targetAmount, "Target amount");
      const manualContributionAmount = parseNonNegativeAmount(
        input.manualContributionAmount,
        "Manual contribution amount"
      );

      const existing = await db.query.capitalProgressSettings.findFirst({
        where: eq(capitalProgressSettings.userId, userId),
      });

      if (existing) {
        const [updated] = await db
          .update(capitalProgressSettings)
          .set({
            currencyCode: input.currencyCode,
            targetAmount,
            manualContributionAmount,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(capitalProgressSettings.id, existing.id),
              eq(capitalProgressSettings.userId, userId)
            )
          )
          .returning();

        return updated;
      }

      const [created] = await db
        .insert(capitalProgressSettings)
        .values({
          userId,
          currencyCode: input.currencyCode,
          targetAmount,
          manualContributionAmount,
        })
        .returning();

      return created;
    }),
});
