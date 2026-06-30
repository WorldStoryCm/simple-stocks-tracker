import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAverageCostMatches, type CostBasisTrade } from "../costBasis";

function trade(values: CostBasisTrade): CostBasisTrade {
  return values;
}

function pnlTotal(matches: { realizedPnl: string }[]) {
  return matches.reduce((sum, match) => sum + Number(match.realizedPnl), 0).toFixed(2);
}

describe("calculateAverageCostMatches", () => {
  it("uses moving average cost for partial sells while consuming lots for open quantity", () => {
    const result = calculateAverageCostMatches([
      trade({ id: "buy-fraction", tradeType: "buy", quantity: 0.3638, price: 87.96, fee: 0 }),
      trade({ id: "buy-11", tradeType: "buy", quantity: 11, price: 88, fee: 0 }),
      trade({ id: "buy-20-low", tradeType: "buy", quantity: 20, price: 87, fee: 0 }),
      trade({ id: "sell-first", tradeType: "sell", quantity: 30, price: 88.5, fee: 0 }),
      trade({ id: "buy-20-mid", tradeType: "buy", quantity: 20, price: 88.5, fee: 0 }),
      trade({ id: "buy-20-next", tradeType: "buy", quantity: 20, price: 88.3, fee: 0 }),
      trade({ id: "buy-10", tradeType: "buy", quantity: 10, price: 87.75, fee: 0 }),
      trade({ id: "sell-edited", tradeType: "sell", quantity: 40, price: 93.71, fee: 0 }),
      trade({ id: "buy-after-sell", tradeType: "buy", quantity: 20, price: 94, fee: 0 }),
      trade({ id: "sell-after-buy", tradeType: "sell", quantity: 20, price: 94.5, fee: 0 }),
    ]);

    assert.equal(result.shortfall, undefined);

    assert.equal(pnlTotal(result.matches.filter((match) => match.sellTradeId === "sell-first")), "34.14");
    assert.equal(pnlTotal(result.matches.filter((match) => match.sellTradeId === "sell-edited")), "218.56");
    assert.equal(pnlTotal(result.matches.filter((match) => match.sellTradeId === "sell-after-buy")), "51.70");

    assert.deepEqual(
      result.matches
        .filter((match) => match.sellTradeId === "sell-after-buy")
        .map((match) => match.buyTradeId),
      ["buy-20-next", "buy-10", "buy-after-sell"],
    );
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
