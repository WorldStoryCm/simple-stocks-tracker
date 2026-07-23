import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGoalRowState } from "../lib/goals";

describe("buildGoalRowState", () => {
  it("preserves a loss sign and prevents a negative progress-bar width", () => {
    const state = buildGoalRowState(-802.95, 2_000);

    assert.equal(state.currentLabel, "-$802.95");
    assert.equal(state.isNegative, true);
    assert.equal(state.fillPercentage, 0);
    assert.equal(state.percentage.toFixed(0), "-40");
    assert.equal(state.remaining, 2_802.95);
  });

  it("keeps positive goal progress capped at one hundred percent", () => {
    const state = buildGoalRowState(25_187.27, 20_000);

    assert.equal(state.currentLabel, "$25,187.27");
    assert.equal(state.isNegative, false);
    assert.equal(state.fillPercentage, 100);
    assert.equal(state.percentage.toFixed(0), "100");
    assert.equal(state.remaining, 0);
  });
});
