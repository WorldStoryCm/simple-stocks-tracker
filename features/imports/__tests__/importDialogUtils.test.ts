import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultSelectedRows } from "../importDialogUtils";
import type { ImportPreviewRow } from "../types";

function row(values: Partial<ImportPreviewRow> & Pick<ImportPreviewRow, "rowHash" | "status">): ImportPreviewRow {
  return {
    rowIndex: 1,
    kind: "trade",
    confidence: 0,
    sourceType: "",
    importable: true,
    ...values,
  } as ImportPreviewRow;
}

describe("defaultSelectedRows", () => {
  it("keeps duplicate rows skipped in normal import mode", () => {
    const rows = [
      row({ rowHash: "new", status: "new" }),
      row({ rowHash: "matched", status: "matched" }),
      row({ rowHash: "possible", status: "possible_match" }),
    ];

    assert.deepEqual(defaultSelectedRows(rows, false).map((item) => item.rowHash), ["new"]);
  });

  it("selects every importable file row in replace mode", () => {
    const rows = [
      row({ rowHash: "new", status: "new" }),
      row({ rowHash: "matched", status: "matched" }),
      row({ rowHash: "possible", status: "possible_match" }),
      row({ rowHash: "blocked", status: "needs_review", importable: false }),
    ];

    assert.deepEqual(defaultSelectedRows(rows, true).map((item) => item.rowHash), ["new", "matched", "possible"]);
  });
});
