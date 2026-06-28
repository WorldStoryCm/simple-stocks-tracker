import { desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { importBatches } from "@/db/schema";

export async function history(userId: string) {
  return db.query.importBatches.findMany({
    where: eq(importBatches.userId, userId),
    orderBy: [desc(importBatches.createdAt)],
    limit: 20,
    with: { platform: true },
  });
}
