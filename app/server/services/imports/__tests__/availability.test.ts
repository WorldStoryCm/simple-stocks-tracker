import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeQuantityAvailability, applyQuantityAvailability } from "../availability";
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

describe("applyQuantityAvailability", () => {
  it("adds a non-cash position adjustment for an orphan sell", () => {
    const rows = applyQuantityAvailability([
      row({
        rowHash: "gehc-sell",
        rowIndex: 186,
        kind: "trade",
        tradeType: "sell",
        ticker: "GEHC",
        quantity: 18.96095554,
        price: 61.94,
        date: "2023-01-11",
      }),
    ], new Map());

    assert.equal(rows[0].status, "new");
    assert.equal(rows[0].importable, true);
    assert.equal(rows[0].positionAdjustment?.quantity, 18.96095554);
    assert.equal(rows[0].positionAdjustment?.price, 61.94);
    assert.match(rows[0].message ?? "", /non-cash position adjustment/);
  });

  it("ignores matched duplicate rows during availability simulation", () => {
    const { blocked } = analyzeQuantityAvailability([
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

  it("uses merger target quantity before a later sell", () => {
    const { blocked } = analyzeQuantityAvailability([
      row({
        rowHash: "crgy-merger",
        rowIndex: 496,
        kind: "corporate_action",
        corporateActionType: "merger_stock",
        ticker: "CRGY",
        quantity: 91.47776368,
        date: "2025-12-16",
      }),
      row({
        rowHash: "vtle-merger",
        rowIndex: 497,
        kind: "corporate_action",
        corporateActionType: "merger_stock",
        ticker: "VTLE",
        quantity: -47.98959379,
        date: "2025-12-16",
      }),
      row({ rowHash: "buy-1", rowIndex: 519, kind: "trade", tradeType: "buy", ticker: "CRGY", quantity: 272.91954834, date: "2026-02-23" }),
      row({ rowHash: "sell", rowIndex: 560, kind: "trade", tradeType: "sell", ticker: "CRGY", quantity: 364.39731202, date: "2026-03-24" }),
    ], new Map([["VTLE", 47.98959379]]));

    assert.equal(blocked.size, 0);
  });

  it("adds a position adjustment for a small final source-file shortfall", () => {
    const rows = applyQuantityAvailability([
      row({
        rowHash: "buy",
        rowIndex: 1,
        kind: "trade",
        tradeType: "buy",
        ticker: "GGB",
        quantity: 2252.5487474,
        price: 3,
        date: "2026-05-01",
      }),
      row({
        rowHash: "sell",
        rowIndex: 2,
        kind: "trade",
        tradeType: "sell",
        ticker: "GGB",
        quantity: 2276.58772756,
        price: 4.66,
        date: "2026-05-28",
      }),
    ], new Map());

    assert.equal(rows[1].importable, true);
    assert.equal(rows[1].positionAdjustment?.quantity.toFixed(8), "24.03898016");
  });
});
