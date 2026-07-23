import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAverageCostMatches, compareCostBasisTrades, type CostBasisTrade } from "../costBasis";

function trade(values: CostBasisTrade): CostBasisTrade {
  return values;
}

function pnlTotal(matches: { realizedPnl: string }[]) {
  return matches.reduce((sum, match) => sum + Number(match.realizedPnl), 0).toFixed(2);
}

function at(index: number) {
  return `2026-06-24T00:00:${String(index).padStart(2, "0")}.000Z`;
}

describe("calculateAverageCostMatches", () => {
  it("uses moving average cost for partial sells while consuming lots for open quantity", () => {
    const result = calculateAverageCostMatches([
      trade({ id: "buy-fraction", tradeDate: "2026-06-24", createdAt: at(1), tradeType: "buy", quantity: 0.3638, price: 87.96, fee: 0 }),
      trade({ id: "buy-11", tradeDate: "2026-06-24", createdAt: at(2), tradeType: "buy", quantity: 11, price: 88, fee: 0 }),
      trade({ id: "buy-20-low", tradeDate: "2026-06-24", createdAt: at(3), tradeType: "buy", quantity: 20, price: 87, fee: 0 }),
      trade({ id: "sell-first", tradeDate: "2026-06-24", createdAt: at(4), tradeType: "sell", quantity: 30, price: 88.5, fee: 0 }),
      trade({ id: "buy-20-mid", tradeDate: "2026-06-24", createdAt: at(5), tradeType: "buy", quantity: 20, price: 88.5, fee: 0 }),
      trade({ id: "buy-20-next", tradeDate: "2026-06-24", createdAt: at(6), tradeType: "buy", quantity: 20, price: 88.3, fee: 0 }),
      trade({ id: "buy-10", tradeDate: "2026-06-24", createdAt: at(7), tradeType: "buy", quantity: 10, price: 87.75, fee: 0 }),
      trade({ id: "sell-edited", tradeDate: "2026-06-29", createdAt: at(8), tradeType: "sell", quantity: 40, price: 93.71, fee: 0 }),
      trade({ id: "buy-after-sell", tradeDate: "2026-06-29", createdAt: at(9), tradeType: "buy", quantity: 20, price: 94, fee: 0 }),
      trade({ id: "sell-after-buy", tradeDate: "2026-06-29", createdAt: at(10), tradeType: "sell", quantity: 20, price: 94.5, fee: 0 }),
    ].sort(compareCostBasisTrades));

    assert.equal(result.shortfall, undefined);

    assert.equal(pnlTotal(result.matches.filter((match) => match.sellTradeId === "sell-first")), "17.40");
    assert.equal(pnlTotal(result.matches.filter((match) => match.sellTradeId === "sell-edited")), "163.44");
    assert.equal(pnlTotal(result.matches.filter((match) => match.sellTradeId === "sell-after-buy")), "97.52");

    assert.deepEqual(
      result.matches
        .filter((match) => match.sellTradeId === "sell-after-buy")
        .map((match) => match.buyTradeId),
      ["buy-20-next", "buy-10", "buy-after-sell"],
    );
  });

  it("orders same-day buys before sells when only trade dates are known", () => {
    const ordered = [
      trade({ id: "sell", tradeDate: "2023-01-11", createdAt: "2026-06-29T15:01:28.919Z", tradeType: "sell", quantity: 1, price: 10, fee: 0 }),
      trade({ id: "adjustment-buy", tradeDate: "2023-01-11", createdAt: "2026-06-29T15:01:28.919Z", tradeType: "buy", quantity: 1, price: 10, fee: 0 }),
    ].sort(compareCostBasisTrades);

    assert.deepEqual(ordered.map((item) => item.id), ["adjustment-buy", "sell"]);
  });

  it("preserves same-day execution sequence instead of pooling later buys", () => {
    const ordered = [
      trade({ id: "later-buy", tradeDate: "2026-07-17", executionOrder: 3, tradeType: "buy", quantity: 10, price: 200, fee: 0 }),
      trade({ id: "first-sell", tradeDate: "2026-07-17", executionOrder: 2, tradeType: "sell", quantity: 10, price: 110, fee: 0 }),
      trade({ id: "opening-buy", tradeDate: "2026-07-17", executionOrder: 1, tradeType: "buy", quantity: 10, price: 100, fee: 0 }),
    ].sort(compareCostBasisTrades);
    const result = calculateAverageCostMatches(ordered);

    assert.deepEqual(ordered.map((item) => item.id), ["opening-buy", "first-sell", "later-buy"]);
    assert.equal(pnlTotal(result.matches), "100.00");
  });

  it("returns a shortfall when sells exceed available open quantity", () => {
    const result = calculateAverageCostMatches([
      trade({ id: "buy", tradeType: "buy", quantity: 5, price: 10, fee: 0 }),
      trade({ id: "sell", tradeType: "sell", quantity: 8, price: 12, fee: 0 }),
    ]);

    assert.equal(result.shortfall?.sellTradeId, "sell");
    assert.equal(result.shortfall?.remaining.toFixed(8), "3.00000000");
  });
});
