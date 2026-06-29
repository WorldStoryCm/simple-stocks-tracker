import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expandSelectedRowsWithRequiredCorporateActions } from "../selection";
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

describe("expandSelectedRowsWithRequiredCorporateActions", () => {
  it("adds a preceding stock split needed by a later selected sell", () => {
    const rows = [
      row({
        rowHash: "split",
        rowIndex: 23,
        kind: "corporate_action",
        corporateActionType: "stock_split",
        ticker: "MCHP",
        date: "2021-10-13",
      }),
      row({
        rowHash: "sell",
        rowIndex: 62,
        kind: "trade",
        tradeType: "sell",
        ticker: "MCHP",
        date: "2022-01-14",
      }),
    ];

    const selected = expandSelectedRowsWithRequiredCorporateActions(rows, ["sell"]);

    assert.deepEqual([...selected].sort(), ["sell", "split"]);
  });

  it("does not add matched duplicate split rows", () => {
    const rows = [
      row({
        rowHash: "split",
        rowIndex: 23,
        kind: "corporate_action",
        corporateActionType: "stock_split",
        status: "matched",
        ticker: "MCHP",
        date: "2021-10-13",
      }),
      row({ rowHash: "sell", rowIndex: 62, kind: "trade", ticker: "MCHP", date: "2022-01-14" }),
    ];

    const selected = expandSelectedRowsWithRequiredCorporateActions(rows, ["sell"]);

    assert.deepEqual([...selected], ["sell"]);
  });

  it("adds paired merger rows needed by a later target ticker sell", () => {
    const rows = [
      row({
        rowHash: "crgy-merger",
        rowIndex: 496,
        kind: "corporate_action",
        corporateActionType: "merger_stock",
        ticker: "CRGY",
        quantity: 91.47776368,
        date: "2025-12-16",
        raw: { Date: "2025-12-16T15:26:56.816694Z" },
      }),
      row({
        rowHash: "vtle-merger",
        rowIndex: 497,
        kind: "corporate_action",
        corporateActionType: "merger_stock",
        ticker: "VTLE",
        quantity: -47.98959379,
        date: "2025-12-16",
        raw: { Date: "2025-12-16T15:26:56.909757Z" },
      }),
      row({ rowHash: "sell", rowIndex: 560, kind: "trade", tradeType: "sell", ticker: "CRGY", date: "2026-03-24" }),
    ];

    const selected = expandSelectedRowsWithRequiredCorporateActions(rows, ["sell"]);

    assert.deepEqual([...selected].sort(), ["crgy-merger", "sell", "vtle-merger"]);
  });
});
