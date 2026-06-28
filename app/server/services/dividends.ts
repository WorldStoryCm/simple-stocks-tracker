import { and, count, desc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { cashEvents } from "@/db/schema";
import { convertToUSD, getExchangeRates } from "@/lib/exchange-rates";

const DIVIDEND_TYPES = ["dividend", "dividend_tax"] as const;

export type DividendEventType = typeof DIVIDEND_TYPES[number];

export type DividendListInput = {
  page: number;
  limit: number;
  eventType: "all" | DividendEventType;
  platformId?: string;
  symbolId?: string;
  dateFrom?: string;
  dateTo?: string;
};

function buildConditions(userId: string, input: Partial<DividendListInput>) {
  const conditions: SQL[] = [eq(cashEvents.userId, userId)];
  const eventType = input.eventType ?? "all";

  if (eventType === "all") {
    conditions.push(inArray(cashEvents.eventType, [...DIVIDEND_TYPES]));
  } else {
    conditions.push(eq(cashEvents.eventType, eventType));
  }
  if (input.platformId && input.platformId !== "all") conditions.push(eq(cashEvents.platformId, input.platformId));
  if (input.symbolId && input.symbolId !== "all") conditions.push(eq(cashEvents.symbolId, input.symbolId));
  if (input.dateFrom) conditions.push(gte(cashEvents.eventDate, input.dateFrom));
  if (input.dateTo) conditions.push(lte(cashEvents.eventDate, input.dateTo));

  return and(...conditions);
}

export async function list(userId: string, input: DividendListInput) {
  const whereClause = buildConditions(userId, input);
  const [items, totalRows] = await Promise.all([
    db.query.cashEvents.findMany({
      where: whereClause,
      orderBy: [desc(cashEvents.eventDate), desc(cashEvents.createdAt)],
      limit: input.limit,
      offset: (input.page - 1) * input.limit,
      with: { platform: true, symbol: true },
    }),
    db.select({ value: count() }).from(cashEvents).where(whereClause),
  ]);

  const totalCount = Number(totalRows[0]?.value ?? 0);
  return {
    items,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / input.limit)),
    page: input.page,
  };
}

export async function summary(userId: string, input: Partial<DividendListInput> = {}) {
  const rates = await getExchangeRates();
  const rows = await db.query.cashEvents.findMany({
    where: buildConditions(userId, { ...input, eventType: input.eventType ?? "all" }),
    orderBy: [desc(cashEvents.eventDate), desc(cashEvents.createdAt)],
    with: { platform: true, symbol: true },
  });

  let grossDividends = 0;
  let dividendTax = 0;
  for (const row of rows) {
    const value = convertToUSD(Number(row.amount), row.currencyCode, rates);
    if (row.eventType === "dividend") grossDividends += value;
    if (row.eventType === "dividend_tax") dividendTax += value;
  }

  return {
    currencyCode: "USD",
    grossDividends,
    dividendTax,
    netDividends: grossDividends + dividendTax,
    eventCount: rows.length,
    recent: rows.slice(0, 5),
  };
}

export const dividendsService = { list, summary };
