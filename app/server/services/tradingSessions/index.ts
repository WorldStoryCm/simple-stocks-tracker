import * as mutations from "./mutations";
import * as queries from "./queries";

export const tradingSessionsService = {
  list: queries.list,
  get: queries.get,
  create: mutations.create,
  addEvent: mutations.addEvent,
  deleteEvent: mutations.deleteEvent,
  close: mutations.close,
};

export type {
  TradingSessionCreateInput,
  TradingSessionEventInput,
} from "./types";
