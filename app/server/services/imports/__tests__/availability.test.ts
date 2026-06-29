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

  it("uses merger target quantity before a later sell", () => {
    const blocked = findInsufficientQuantityRows([
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
});
