import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  convertSessionCurrency,
  currencyFactor,
  sessionCurrency,
} from "../currency";

describe("trading session currency", () => {
  it("converts EUR prices into USD using USD per EUR", () => {
    assert.equal(convertSessionCurrency(6.55, "EUR", "USD", 1.14).toFixed(3), "7.467");
  });

  it("converts USD prices back into EUR", () => {
    assert.equal(convertSessionCurrency(7.467, "USD", "EUR", 1.14).toFixed(2), "6.55");
  });

  it("uses a neutral factor for the same currency", () => {
    assert.equal(currencyFactor("USD", "USD", 1.14), 1);
    assert.equal(sessionCurrency("GBP"), "USD");
  });
});
