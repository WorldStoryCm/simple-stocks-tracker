import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPriceLadder,
  replaySession,
  solveTargetPrice,
  type SessionEventValue,
} from "../calculations";

const opening = { quantity: 900, totalCost: 6_309, marketPrice: 7.1 };

function event(values: Partial<SessionEventValue> & Pick<SessionEventValue, "id" | "eventType">) {
  return {
    executedAt: "2026-07-23T10:00:00.000Z",
    quantity: 0,
    price: 0,
    fee: 0,
    ...values,
  };
}

describe("trading session calculations", () => {
  it("replays partial buys and sells using moving average cost", () => {
    const result = replaySession(opening, [
      event({ id: "buy", eventType: "buy", quantity: 100, price: 8, fee: 1 }),
      event({ id: "sell", eventType: "sell", executedAt: "2026-07-23T10:01:00.000Z", quantity: 400, price: 8.5, fee: 2 }),
    ], 8.2);

    assert.equal(result.shortfall, undefined);
    assert.equal(result.state.quantity, 600);
    assert.equal(result.state.averageCost.toFixed(3), "7.110");
    assert.equal(result.state.realizedPnl.toFixed(2), "554.00");
    assert.equal(result.positionPnl.toFixed(2), "1208.00");
    assert.equal(result.sessionPnl.toFixed(2), "1127.00");
  });

  it("reports a sell shortfall without applying the invalid event", () => {
    const result = replaySession(opening, [
      event({ id: "sell", eventType: "sell", quantity: 901, price: 8 }),
    ], 8);

    assert.equal(result.shortfall?.eventId, "sell");
    assert.equal(result.shortfall?.quantity, 1);
    assert.equal(result.state.quantity, 900);
  });

  it("builds 15 rows on each side of the current-price row", () => {
    const rows = buildPriceLadder({
      currentPrice: 7.1,
      quantity: 900,
      averageCost: 7.01,
      step: 0.01,
    });

    assert.equal(rows.length, 31);
    assert.equal(rows[15].offsetSteps, 0);
    assert.equal(rows[15].changeFromCurrent, 0);
    assert.equal(rows[0].price.toFixed(2), "7.25");
    assert.equal(rows[30].price.toFixed(2), "6.95");
  });

  it("rounds a target profit up to the selected tick", () => {
    const result = solveTargetPrice({
      target: 100,
      mode: "position_profit",
      quantity: 900,
      averageCost: 7.01,
      currentPrice: 7.1,
      tickSize: 0.01,
    });

    assert.equal(result?.exactPrice.toFixed(6), "7.121111");
    assert.equal(result?.price.toFixed(2), "7.13");
    assert.ok((result?.projectedProfit ?? 0) >= 100);
  });

  it("solves an additional-profit target from the current price", () => {
    const result = solveTargetPrice({
      target: 100,
      mode: "additional_profit",
      quantity: 100,
      averageCost: 7.01,
      currentPrice: 8,
      fee: 1,
      tickSize: 0.01,
    });

    assert.equal(result?.price.toFixed(2), "9.01");
    assert.equal(result?.projectedProfit.toFixed(2), "100.00");
  });
});
