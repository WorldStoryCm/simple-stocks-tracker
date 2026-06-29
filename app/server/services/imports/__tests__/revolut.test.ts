import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseManualCsv } from "../adapters/manual";
import { parseRevolutCsv } from "../adapters/revolut";
import { buildCorporateActionAdjustments } from "../corporateActions";
import { convertImportCashImpact } from "../currency";
import { classifyImportRow } from "../match";

const csv = `Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate
2024-01-02T14:30:00Z,TSLA,BUY - MARKET,0.12345678,USD 250.12,USD 30.88,USD,1.10
2024-01-03T14:30:00Z,TSLA,SELL - MARKET,0.1200,USD 260.00,USD 31.20,USD,1.10
2024-01-04T04:00:00Z,TSLA,DIVIDEND,,,USD 0.42,USD,1.10
2024-01-04T04:00:01Z,TSLA,DIVIDEND TAX (CORRECTION),,,USD -0.06,USD,1.10
2024-01-05T04:00:00Z,TSLA,STOCK SPLIT,-1.0000,,USD 0,USD,1.10
2024-01-06T04:00:00Z,,CASH TOP-UP,,,USD 100,USD,1.10
`;

describe("parseRevolutCsv", () => {
  it("normalizes trades, dividends, taxes, corporate actions, and cash rows", () => {
    const rows = parseRevolutCsv(csv);

    assert.equal(rows.length, 6);
    assert.deepEqual(rows.map((row) => row.kind), [
      "trade",
      "trade",
      "cash_event",
      "cash_event",
      "corporate_action",
      "cash_event",
    ]);
    assert.equal(rows[0].tradeType, "buy");
    assert.equal(rows[0].quantity, 0.12345678);
    assert.equal(rows[0].price, 250.12);
    assert.equal(rows[0].cashImpact, -30.88);
    assert.equal(rows[1].cashImpact, 31.2);
    assert.equal(rows[2].eventType, "dividend");
    assert.equal(rows[2].amount, 0.42);
    assert.equal(rows[2].cashImpact, 0.42);
    assert.equal(rows[3].eventType, "dividend_tax");
    assert.equal(rows[3].amount, -0.06);
    assert.equal(rows[4].corporateActionType, "stock_split");
    assert.equal(rows[4].importable, true);
    assert.equal(rows[5].eventType, "deposit");
    assert.equal(rows[5].cashImpact, 100);
  });
});

describe("parseManualCsv", () => {
  it("normalizes exported trade and cash-event backup rows", () => {
    const rows = parseManualCsv(`Kind,Platform,Date,Type,Ticker,Quantity,Price,Amount,Currency,Fee,FX Rate,Notes
trade,Revolut,2024-02-01,buy,TSLA,2,100,-201,USD,1,,manual buy
trade,Revolut,2024-02-02,sell,TSLA,1,120,119.5,USD,0.5,,manual sell
cash_event,Revolut,2024-02-03,dividend,TSLA,,,4.25,USD,,1.1,dividend
`);

    assert.equal(rows.length, 3);
    assert.equal(rows[0].kind, "trade");
    assert.equal(rows[0].tradeType, "buy");
    assert.equal(rows[0].fee, 1);
    assert.equal(rows[0].cashImpact, -201);
    assert.equal(rows[1].tradeType, "sell");
    assert.equal(rows[1].fee, 0.5);
    assert.equal(rows[1].cashImpact, 119.5);
    assert.equal(rows[2].kind, "cash_event");
    assert.equal(rows[2].eventType, "dividend");
    assert.equal(rows[2].fxRate, 1.1);
  });
});

describe("convertImportCashImpact", () => {
  it("uses Revolut FX rate for USD cash movement into a EUR platform balance", () => {
    const value = convertImportCashImpact({
      amount: -110,
      fromCurrency: "USD",
      toCurrency: "EUR",
      fxRate: 1.1,
      rates: { USD: 1, EUR: 1.2 },
    });

    assert.ok(Math.abs(value + 100) < 0.000001);
  });

  it("leaves amounts unchanged when broker and platform currencies match", () => {
    const value = convertImportCashImpact({
      amount: 42,
      fromCurrency: "USD",
      toCurrency: "USD",
      fxRate: 1.1,
      rates: { USD: 1, EUR: 1.2 },
    });

    assert.equal(value, 42);
  });
});

describe("classifyImportRow", () => {
  it("marks exact source-row imports as matched", () => {
    const [row] = parseRevolutCsv(csv);
    const preview = classifyImportRow({
      row,
      sourceSystem: "revolut",
      trades: [{
        id: "trade-1",
        tradeType: "buy",
        tradeDate: "2024-01-02",
        quantity: "0.12345678",
        price: "250.1200",
        sourceSystem: "revolut",
        sourceRowHash: row.rowHash,
        symbol: { ticker: "TSLA" },
      }],
      cashEvents: [],
      symbolExists: true,
    });

    assert.equal(preview.status, "matched");
    assert.equal(preview.matched?.reason, "Source row already imported");
    assert.equal(preview.matched?.recordLabel, "2024-01-02 BUY TSLA 0.1235 @ 250.12");
  });

  it("matches rounded share quantities within a short date window", () => {
    const [row] = parseRevolutCsv(csv);
    const preview = classifyImportRow({
      row,
      sourceSystem: "revolut",
      trades: [{
        id: "trade-2",
        tradeType: "buy",
        tradeDate: "2024-01-04",
        quantity: "0.1235",
        price: "250.1200",
        sourceSystem: null,
        sourceRowHash: null,
        symbol: { ticker: "TSLA" },
      }],
      cashEvents: [],
      symbolExists: true,
    });

    assert.equal(preview.status, "matched");
    assert.equal(preview.matched?.confidence, 0.95);
  });

  it("flags wider date-window matches as possible duplicates", () => {
    const [row] = parseRevolutCsv(csv);
    const preview = classifyImportRow({
      row,
      sourceSystem: "revolut",
      trades: [{
        id: "trade-3",
        tradeType: "buy",
        tradeDate: "2024-01-12",
        quantity: "0.1235",
        price: "250.1200",
        sourceSystem: null,
        sourceRowHash: null,
        symbol: { ticker: "TSLA" },
      }],
      cashEvents: [],
      symbolExists: true,
    });

    assert.equal(preview.status, "possible_match");
    assert.equal(preview.matched?.confidence, 0.75);
    assert.equal(preview.matched?.recordLabel, "2024-01-12 BUY TSLA 0.1235 @ 250.12");
  });

  it("matches dividends by symbol, amount, type, and date tolerance", () => {
    const dividend = parseRevolutCsv(csv)[2];
    const preview = classifyImportRow({
      row: dividend,
      sourceSystem: "revolut",
      trades: [],
      cashEvents: [{
        id: "cash-1",
        eventType: "dividend",
        eventDate: "2024-01-05",
        amount: "0.42",
        sourceSystem: null,
        sourceRowHash: null,
        symbol: { ticker: "TSLA" },
      }],
      symbolExists: true,
    });

    assert.equal(preview.status, "matched");
    assert.equal(preview.matched?.kind, "cash_event");
    assert.equal(preview.matched?.recordLabel, "2024-01-05 dividend TSLA 0.42");
  });

  it("marks corporate actions as importable lot adjustments", () => {
    const corporateAction = parseRevolutCsv(csv)[4];
    const preview = classifyImportRow({
      row: corporateAction,
      sourceSystem: "revolut",
      trades: [],
      cashEvents: [],
      symbolExists: true,
    });

    assert.equal(preview.status, "new");
    assert.equal(preview.importable, true);
  });

  it("matches already imported corporate action rows by source hash", () => {
    const corporateAction = parseRevolutCsv(csv)[4];
    const preview = classifyImportRow({
      row: corporateAction,
      sourceSystem: "revolut",
      trades: [],
      cashEvents: [],
      symbolExists: true,
      existingImportRowHashes: new Set([corporateAction.rowHash]),
    });

    assert.equal(preview.status, "matched");
    assert.equal(preview.message, "Source row already imported");
  });
});

describe("buildCorporateActionAdjustments", () => {
  it("uses a stock split delta to expand open lots before later sells", () => {
    const result = buildCorporateActionAdjustments(23, [
      { tradeId: "mchp-1", quantity: "0.88016249", price: "147.7000", matchedQuantity: 0 },
      { tradeId: "mchp-2", quantity: "1.35171668", price: "147.9600", matchedQuantity: 0 },
      { tradeId: "mchp-3", quantity: "3.35818389", price: "148.8900", matchedQuantity: 0 },
    ], 5.59006306);

    assert.equal(result.factor, 2);
    assert.deepEqual(result.adjustments.map((adjustment) => adjustment.newQuantity), [
      "1.76032498",
      "2.70343336",
      "6.71636778",
    ]);
    assert.deepEqual(result.adjustments.map((adjustment) => adjustment.newPrice), [
      "73.8500",
      "73.9800",
      "74.4450",
    ]);
  });
});
