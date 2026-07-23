import * as mutations from "./mutations";
import * as queries from "./queries";

export const tradingSessionsService = {
  list: queries.list,
  get: queries.get,
  fxRate: queries.fxRate,
  create: mutations.create,
  updateInputs: mutations.updateInputs,
  addEvent: mutations.addEvent,
  deleteEvent: mutations.deleteEvent,
  close: mutations.close,
};

export type {
  TradingSessionCreateInput,
  TradingSessionEventInput,
  TradingSessionInputsUpdate,
} from "./types";
