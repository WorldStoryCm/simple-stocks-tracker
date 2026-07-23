import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planCommitQuantityAvailability } from "../commitQuantity";
import type { PreviewImportRow } from "../types";

function row(
  values: Partial<PreviewImportRow> & Pick<PreviewImportRow, "rowHash" | "rowIndex" | "kind">,
): PreviewImportRow {
  return {
    raw: {},
    sourceType: "",
    status: "new",
    confidence: 0,
    importable: true,
    ...values,
  } as PreviewImportRow;
}

describe("planCommitQuantityAvailability", () => {
  it("recomputes a partial-history adjustment from the exact selected rows", () => {
    const rows = planCommitQuantityAvailability([
      row({
        rowHash: "rklb-sell",
        rowIndex: 23,
        kind: "trade",
        tradeType: "sell",
        ticker: "RKLB",
        quantity: 70,
        price: 67.72,
        date: "2026-07-17",
      }),
    ], [{
      tradeType: "buy",
      quantity: "40.36380000",
      symbol: { ticker: "RKLB" },
    }]);

    assert.equal(rows[0].importable, true);
    assert.equal(rows[0].positionAdjustment?.quantity.toFixed(8), "29.63620000");
    assert.match(rows[0].message ?? "", /non-cash position adjustment/);
  });

  it("removes a stale preview adjustment when selected rows supply the shares", () => {
    const rows = planCommitQuantityAvailability([
      row({
        rowHash: "rklb-buy",
        rowIndex: 22,
        kind: "trade",
        tradeType: "buy",
        ticker: "RKLB",
        quantity: 30,
        price: 65,
        date: "2026-07-16",
      }),
      row({
        rowHash: "rklb-sell",
        rowIndex: 23,
        kind: "trade",
        tradeType: "sell",
        ticker: "RKLB",
        quantity: 70,
        price: 67.72,
        date: "2026-07-17",
        positionAdjustment: {
          quantity: 29.6362,
          price: 67.72,
          reason: "Preview used a different selection.",
        },
      }),
    ], [{
      tradeType: "buy",
      quantity: "40.00000000",
      symbol: { ticker: "RKLB" },
    }]);

    assert.equal(rows[1].positionAdjustment, undefined);
  });
});
