export type DashboardFilters = {
  platformId?: string;
  symbolId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type DashboardPlatform = {
  id: string;
  name: string;
};

export type DashboardSymbol = {
  id: string;
  ticker: string;
  displayName?: string | null;
};

export type DashboardMover = {
  ticker: string;
  pnl: number;
  pct: number;
};
