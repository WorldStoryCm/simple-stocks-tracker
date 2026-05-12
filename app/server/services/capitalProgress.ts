import { and, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { capitalProgressSettings } from "@/db/schema";

export const CAPITAL_CURRENCIES = ["EUR", "USD"] as const;
export type CapitalCurrency = (typeof CAPITAL_CURRENCIES)[number];

export type CapitalProgressInput = {
  currencyCode: CapitalCurrency;
  targetAmount: string;
};

const DEFAULT_SETTINGS = {
  currencyCode: "EUR" as const,
  targetAmount: "100000.00",
};

function parsePositiveAmount(raw: string, field: string) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be greater than 0`);
  }
  return value.toFixed(2);
}

async function get(userId: string) {
  const existing = await db.query.capitalProgressSettings.findFirst({
    where: eq(capitalProgressSettings.userId, userId),
  });
  return existing ?? DEFAULT_SETTINGS;
}

async function upsert(userId: string, input: CapitalProgressInput) {
  const targetAmount = parsePositiveAmount(input.targetAmount, "Target amount");

  const existing = await db.query.capitalProgressSettings.findFirst({
    where: eq(capitalProgressSettings.userId, userId),
  });

  if (existing) {
    const [updated] = await db
      .update(capitalProgressSettings)
      .set({
        currencyCode: input.currencyCode,
        targetAmount,
        updatedAt: new Date(),
      })
      .where(and(
        eq(capitalProgressSettings.id, existing.id),
        eq(capitalProgressSettings.userId, userId),
      ))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(capitalProgressSettings)
    .values({
      userId,
      currencyCode: input.currencyCode,
      targetAmount,
    })
    .returning();
  return created;
}

export const capitalProgressService = { get, upsert };
