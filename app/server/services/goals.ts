import { and, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { goals } from "@/db/schema";

export const GOAL_TYPES = ["monthly_profit", "yearly_profit"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

async function list(userId: string) {
  return db.query.goals.findMany({
    where: and(eq(goals.userId, userId), eq(goals.isActive, true)),
  });
}

async function upsert(userId: string, goalType: GoalType, amount: string) {
  const existing = await db.query.goals.findFirst({
    where: and(eq(goals.userId, userId), eq(goals.goalType, goalType), eq(goals.isActive, true)),
  });

  if (existing) {
    await db.update(goals)
      .set({ amount, updatedAt: new Date() })
      .where(eq(goals.id, existing.id));
    return { id: existing.id };
  }

  const [created] = await db.insert(goals).values({
    userId,
    goalType,
    amount,
    isActive: true,
  }).returning({ id: goals.id });

  return created;
}

async function remove(userId: string, goalType: GoalType) {
  await db.update(goals)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(
      eq(goals.userId, userId),
      eq(goals.goalType, goalType),
      eq(goals.isActive, true),
    ));
  return { success: true };
}

export const goalsService = { list, upsert, remove };
