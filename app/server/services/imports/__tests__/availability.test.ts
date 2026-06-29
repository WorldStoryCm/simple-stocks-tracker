import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findInsufficientQuantityRows } from "../availability";
import type { PreviewImportRow } from "../types";

function row(values: Partial<PreviewImportRow> & Pick<PreviewImportRow, "rowHash" | "rowIndex" | "kind">): PreviewImportRow {
  return {
    raw: {},
    sourceType: "",
    status: "new",
    confidence: 0,
    importable: true,
    ...values,
  } as PreviewImportRow;
}

describe("findInsufficientQuantityRows", () => {
  it("blocks an orphan GEHC sell from a missing spin-off lot", () => {
    const blocked = findInsufficientQuantityRows([
      row({
        rowHash: "gehc-sell",
        rowIndex: 186,
        kind: "trade",
        tradeType: "sell",
        ticker: "GEHC",
        quantity: 18.96095554,
        date: "2023-01-11",
      }),
    ], new Map());

    assert.match(blocked.get("gehc-sell") ?? "", /Short by 18\.96095554/);
  });

  it("ignores matched duplicate rows during availability simulation", () => {
    const blocked = findInsufficientQuantityRows([
      row({
        rowHash: "old-sell",
        rowIndex: 1,
        kind: "trade",
        tradeType: "sell",
        ticker: "GE",
        quantity: 10,
        status: "matched",
        date: "2023-01-01",
      }),
      row({
        rowHash: "new-sell",
        rowIndex: 2,
        kind: "trade",
        tradeType: "sell",
        ticker: "GE",
        quantity: 5,
        date: "2023-01-02",
      }),
    ], new Map([["GE", 5]]));

    assert.equal(blocked.size, 0);
  });
});
