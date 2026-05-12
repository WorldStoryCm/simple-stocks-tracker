import * as queries from "./queries";
import * as mutations from "./mutations";

export const tradesService = {
  list: queries.list,
  getOpenQuantity: queries.getOpenQuantity,
  symbolPnl: queries.symbolPnl,
  create: mutations.create,
  update: mutations.update,
  remove: mutations.remove,
};

export type { TradesListInput } from "./queries";
export type { TradeCreateInput, TradeUpdateInput } from "./mutations";
