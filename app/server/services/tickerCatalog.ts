import { and, count, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { tickerCatalog } from "@/db/schema";

const NASDAQ_LISTED = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt";
const OTHER_LISTED = "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt";

type CatalogRow = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  marketCategory: string | null;
  isEtf: boolean;
  isTest: boolean;
};

export type CatalogListInput = {
  page: number;
  limit: number;
  q?: string;
  exchange?: string;
};

function parseNasdaqListed(text: string): CatalogRow[] {
  const lines = text.split(/\r?\n/);
  const rows: CatalogRow[] = [];
  for (const raw of lines.slice(1)) {
    if (!raw || raw.startsWith("File Creation Time")) continue;
    const cols = raw.split("|");
    if (cols.length < 7) continue;
    const [symbol, name, marketCategory, testIssue, _financialStatus, _roundLot, etf] = cols;
    if (!symbol) continue;
    rows.push({
      symbol: symbol.trim().toUpperCase(),
      name: name?.trim() || null,
      exchange: "NASDAQ",
      marketCategory: marketCategory?.trim() || null,
      isEtf: etf?.trim() === "Y",
      isTest: testIssue?.trim() === "Y",
    });
  }
  return rows;
}

function parseOtherListed(text: string): CatalogRow[] {
  // Columns: ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol
  const exchangeMap: Record<string, string> = {
    A: "NYSE MKT",
    N: "NYSE",
    P: "NYSE ARCA",
    Z: "BATS",
    V: "IEX",
  };
  const lines = text.split(/\r?\n/);
  const rows: CatalogRow[] = [];
  for (const raw of lines.slice(1)) {
    if (!raw || raw.startsWith("File Creation Time")) continue;
    const cols = raw.split("|");
    if (cols.length < 7) continue;
    const [actSymbol, name, exchange, _cqs, etf, _roundLot, testIssue] = cols;
    if (!actSymbol) continue;
    rows.push({
      symbol: actSymbol.trim().toUpperCase(),
      name: name?.trim() || null,
      exchange: exchangeMap[exchange?.trim() ?? ""] ?? exchange?.trim() ?? null,
      marketCategory: null,
      isEtf: etf?.trim() === "Y",
      isTest: testIssue?.trim() === "Y",
    });
  }
  return rows;
}

async function downloadAndParse(url: string, parser: (t: string) => CatalogRow[]) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  const text = await res.text();
  return parser(text);
}

async function status() {
  const [{ value }] = await db.select({ value: count() }).from(tickerCatalog);
  const [latest] = await db
    .select({ lastSyncedAt: tickerCatalog.lastSyncedAt })
    .from(tickerCatalog)
    .orderBy(sql`${tickerCatalog.lastSyncedAt} desc`)
    .limit(1);
  return {
    total: Number(value ?? 0),
    lastSyncedAt: latest?.lastSyncedAt ?? null,
  };
}

async function sync() {
  const [nasdaqRows, otherRows] = await Promise.all([
    downloadAndParse(NASDAQ_LISTED, parseNasdaqListed),
    downloadAndParse(OTHER_LISTED, parseOtherListed),
  ]);

  const merged = new Map<string, CatalogRow>();
  for (const r of [...nasdaqRows, ...otherRows]) {
    if (r.isTest) continue;
    if (!merged.has(r.symbol)) merged.set(r.symbol, r);
  }
  const rows = Array.from(merged.values());

  const now = new Date();
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH).map((r) => ({ ...r, lastSyncedAt: now }));
    await db
      .insert(tickerCatalog)
      .values(slice)
      .onConflictDoUpdate({
        target: tickerCatalog.symbol,
        set: {
          name: sql`excluded.name`,
          exchange: sql`excluded.exchange`,
          marketCategory: sql`excluded.market_category`,
          isEtf: sql`excluded.is_etf`,
          isTest: sql`excluded.is_test`,
          lastSyncedAt: now,
        },
      });
  }

  return { upserted: rows.length, syncedAt: now };
}

async function list(input: CatalogListInput) {
  const { page, limit, q, exchange } = input;
  const offset = (page - 1) * limit;

  const conditions = [] as any[];
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(or(ilike(tickerCatalog.symbol, term), ilike(tickerCatalog.name, term)));
  }
  if (exchange && exchange !== "all") {
    conditions.push(eq(tickerCatalog.exchange, exchange));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalRow] = await Promise.all([
    db
      .select()
      .from(tickerCatalog)
      .where(where as any)
      .orderBy(tickerCatalog.symbol)
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(tickerCatalog)
      .where(where as any),
  ]);

  const totalCount = Number(totalRow[0]?.value ?? 0);
  return {
    items,
    page,
    limit,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  };
}

export const tickerCatalogService = { status, sync, list };
