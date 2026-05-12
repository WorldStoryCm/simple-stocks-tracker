export type PerformanceFilters = {
  platformId?: string;
  symbolId?: string;
  dateFrom?: string;
  dateTo?: string;
};

type FilterableTrade = {
  platformId: string;
  symbolId: string;
  tradeDate: string | null;
};

export function tradePassesFilters(t: FilterableTrade, f?: PerformanceFilters): boolean {
  if (!f) return true;
  if (f.platformId && f.platformId !== "all" && t.platformId !== f.platformId) return false;
  if (f.symbolId && f.symbolId !== "all" && t.symbolId !== f.symbolId) return false;
  if (f.dateFrom && (!t.tradeDate || t.tradeDate < f.dateFrom)) return false;
  if (f.dateTo && (!t.tradeDate || t.tradeDate > f.dateTo)) return false;
  return true;
}
