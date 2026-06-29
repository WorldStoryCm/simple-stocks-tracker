import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateFifoMatches, type FifoTrade } from "../fifo";

function trade(values: FifoTrade): FifoTrade {
  return values;
}

function pnlTotal(matches: { realizedPnl: string }[]) {
  return matches.reduce((sum, match) => sum + Number(match.realizedPnl), 0).toFixed(2);
}

describe("calculateFifoMatches", () => {
  it("recomputes an edited partial sell from the current sell price", () => {
    const result = calculateFifoMatches([
      trade({ id: "buy-fraction", tradeType: "buy", quantity: 0.3638, price: 87.96, fee: 0 }),
      trade({ id: "buy-11", tradeType: "buy", quantity: 11, price: 88, fee: 0 }),
      trade({ id: "buy-20-low", tradeType: "buy", quantity: 20, price: 87, fee: 0 }),
      trade({ id: "sell-first", tradeType: "sell", quantity: 30, price: 88.5, fee: 0 }),
      trade({ id: "buy-20-mid", tradeType: "buy", quantity: 20, price: 88.5, fee: 0 }),
      trade({ id: "buy-20-next", tradeType: "buy", quantity: 20, price: 88.3, fee: 0 }),
      trade({ id: "buy-10", tradeType: "buy", quantity: 10, price: 87.75, fee: 0 }),
      trade({ id: "sell-edited", tradeType: "sell", quantity: 40, price: 93.7, fee: 0 }),
      trade({ id: "buy-after-sell", tradeType: "buy", quantity: 20, price: 94, fee: 0 }),
    ]);

    assert.equal(result.shortfall, undefined);
    const editedSellMatches = result.matches.filter((match) => match.sellTradeId === "sell-edited");

    assert.deepEqual(editedSellMatches.map((match) => match.buyTradeId), [
      "buy-20-low",
      "buy-20-mid",
      "buy-20-next",
    ]);
    assert.equal(pnlTotal(editedSellMatches), "213.78");
  });

  it("returns a shortfall when sells exceed available open lots", () => {
    const result = calculateFifoMatches([
      trade({ id: "buy", tradeType: "buy", quantity: 5, price: 10, fee: 0 }),
      trade({ id: "sell", tradeType: "sell", quantity: 8, price: 12, fee: 0 }),
    ]);

    assert.equal(result.shortfall?.sellTradeId, "sell");
    assert.equal(result.shortfall?.remaining.toFixed(8), "3.00000000");
  });
});
