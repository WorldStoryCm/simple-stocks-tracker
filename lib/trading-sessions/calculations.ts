const EPSILON = 0.000001;

export type SessionSide = "buy" | "sell";

export type SessionEventValue = {
  id: string;
  eventType: SessionSide;
  executedAt: Date | string;
  createdAt?: Date | string;
  quantity: number | string;
  price: number | string;
  fee: number | string;
};

export type SessionOpeningValue = {
  quantity: number | string;
  totalCost: number | string;
  marketPrice: number | string;
};

export type SessionState = {
  quantity: number;
  totalCost: number;
  averageCost: number;
  realizedPnl: number;
  cashFlow: number;
  feesPaid: number;
};

export type SessionEventSnapshot = {
  event: SessionEventValue;
  realizedPnl: number;
  state: SessionState;
};

export type SessionMetrics = {
  state: SessionState;
  snapshots: SessionEventSnapshot[];
  marketValue: number;
  unrealizedPnl: number;
  positionPnl: number;
  sessionPnl: number;
  shortfall?: { eventId: string; quantity: number };
};

export type LadderRow = {
  price: number;
  proceeds: number;
  salePnl: number;
  returnPercentage: number;
  changeFromCurrent: number;
  offsetSteps: number;
};

function timestamp(value: Date | string | undefined) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
}

export function sortSessionEvents(events: SessionEventValue[]) {
  return [...events].sort((left, right) =>
    timestamp(left.executedAt).localeCompare(timestamp(right.executedAt))
    || timestamp(left.createdAt).localeCompare(timestamp(right.createdAt))
    || left.id.localeCompare(right.id),
  );
}

export function replaySession(
  opening: SessionOpeningValue,
  events: SessionEventValue[],
  markPrice: number,
): SessionMetrics {
  let quantity = Number(opening.quantity);
  let totalCost = Number(opening.totalCost);
  let realizedPnl = 0;
  let cashFlow = 0;
  let feesPaid = 0;
  const snapshots: SessionEventSnapshot[] = [];
  let shortfall: SessionMetrics["shortfall"];

  for (const event of sortSessionEvents(events)) {
    const eventQuantity = Number(event.quantity);
    const price = Number(event.price);
    const fee = Number(event.fee);
    let eventRealizedPnl = 0;

    if (event.eventType === "buy") {
      quantity += eventQuantity;
      totalCost += eventQuantity * price + fee;
      cashFlow -= eventQuantity * price + fee;
    } else {
      if (eventQuantity > quantity + EPSILON) {
        shortfall = { eventId: event.id, quantity: eventQuantity - quantity };
        break;
      }
      const averageCost = quantity > EPSILON ? totalCost / quantity : 0;
      eventRealizedPnl = eventQuantity * price - fee - eventQuantity * averageCost;
      realizedPnl += eventRealizedPnl;
      cashFlow += eventQuantity * price - fee;
      totalCost -= eventQuantity * averageCost;
      quantity -= eventQuantity;
      if (quantity <= EPSILON) {
        quantity = 0;
        totalCost = 0;
      }
    }

    feesPaid += fee;
    snapshots.push({
      event,
      realizedPnl: eventRealizedPnl,
      state: {
        quantity,
        totalCost,
        averageCost: quantity > EPSILON ? totalCost / quantity : 0,
        realizedPnl,
        cashFlow,
        feesPaid,
      },
    });
  }

  const state = {
    quantity,
    totalCost,
    averageCost: quantity > EPSILON ? totalCost / quantity : 0,
    realizedPnl,
    cashFlow,
    feesPaid,
  };
  const marketValue = quantity * markPrice;
  const unrealizedPnl = marketValue - totalCost;
  const openingMarketValue = Number(opening.quantity) * Number(opening.marketPrice);

  return {
    state,
    snapshots,
    marketValue,
    unrealizedPnl,
    positionPnl: realizedPnl + unrealizedPnl,
    sessionPnl: cashFlow + marketValue - openingMarketValue,
    shortfall,
  };
}

export function buildPriceLadder(input: {
  currentPrice: number;
  quantity: number;
  averageCost: number;
  fee?: number;
  step: number;
  rows?: number;
}): LadderRow[] {
  const { currentPrice, quantity, averageCost, fee = 0, step } = input;
  const rows = Math.max(1, input.rows ?? 15);

  return Array.from({ length: rows * 2 + 1 }, (_, index) => {
    const offsetSteps = rows - index;
    const price = Math.max(0, currentPrice + offsetSteps * step);
    const proceeds = quantity * price - fee;
    const salePnl = proceeds - quantity * averageCost;
    const basis = quantity * averageCost;
    return {
      price,
      proceeds,
      salePnl,
      returnPercentage: basis > EPSILON ? (salePnl / basis) * 100 : 0,
      changeFromCurrent: quantity * (price - currentPrice),
      offsetSteps,
    };
  });
}

export function solveTargetPrice(input: {
  target: number;
  mode: "position_profit" | "additional_profit";
  quantity: number;
  averageCost: number;
  currentPrice: number;
  fee?: number;
  tickSize?: number;
}) {
  const { target, mode, quantity, averageCost, currentPrice, fee = 0 } = input;
  const tickSize = input.tickSize ?? 0.01;
  if (quantity <= EPSILON || tickSize <= 0) return null;

  const referencePrice = mode === "position_profit" ? averageCost : currentPrice;
  const exactPrice = referencePrice + (target + fee) / quantity;
  const price = Math.ceil((exactPrice - Number.EPSILON) / tickSize) * tickSize;
  const projectedProfit = quantity * (price - referencePrice) - fee;

  return { exactPrice, price, projectedProfit };
}
