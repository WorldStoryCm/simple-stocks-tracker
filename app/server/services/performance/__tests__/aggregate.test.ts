import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregatePnlByPeriod, aggregatePositionCosts } from "../aggregate";

describe("performance aggregation", () => {
  it("uses trade currency and counts closed sells instead of matched lots", () => {
    const result = aggregatePnlByPeriod([
      {
        sellTradeId: "sell-1",
        buyTradeId: "buy-1",
        matchedQuantity: 1,
        matchedCost: 10,
        realizedPnl: 10,
        sellTrade: { platformId: "ibkr", tradeDate: "2026-07-17", currencyCode: "EUR" },
      },
      {
        sellTradeId: "sell-1",
        buyTradeId: "buy-2",
        matchedQuantity: 1,
        matchedCost: 10,
        realizedPnl: -2,
        sellTrade: { platformId: "ibkr", tradeDate: "2026-07-17", currencyCode: "EUR" },
      },
      {
        sellTradeId: "sell-2",
        buyTradeId: "buy-3",
        matchedQuantity: 1,
        matchedCost: 10,
        realizedPnl: -1,
        sellTrade: { platformId: "ibkr", tradeDate: "2026-07-17", currencyCode: "EUR" },
      },
    ], { USD: 1, EUR: 2 }, () => "USD");

    assert.equal(result.totalRealizedPnl, 14);
    assert.equal(result.dailyPnl["2026-07-17"], 14);
    assert.equal(result.closedTrades, 2);
    assert.equal(result.winningTrades, 1);
  });

  it("values open cost using each trade currency", () => {
    const result = aggregatePositionCosts([
      {
        id: "buy",
        platformId: "ibkr",
        symbolId: "rklb",
        tradeType: "buy",
        tradeDate: "2026-07-17",
        quantity: 10,
        price: 10,
        fee: 0,
        currencyCode: "EUR",
      },
    ], [], new Set(["ibkr"]), new Map([
      ["rklb", { ticker: "RKLB", sector: null, currencyCode: "USD" }],
    ]), { USD: 1, EUR: 2 }, () => "USD");

    assert.equal(result.totalInvested, 200);
  });
});
