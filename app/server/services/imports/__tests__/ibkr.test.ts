import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseIbkrCsv } from "../adapters/ibkr";

const csv = `Statement,Header,Field Name,Field Value
Statement,Data,Title,Transaction History
Summary,Header,Field Name,Field Value
Summary,Data,Base Currency,EUR
Transaction History,Header,Date,Account,Description,Transaction Type,Symbol,Quantity,Price,Price Currency,Gross Amount ,Commission,Net Amount
Transaction History,Data,2026-06-30,U***16477,ROCKET LAB CORP,Buy,RKLB,10.0,99.5,USD,-871.1623,-0.8755662662,-872.0378662662
Transaction History,Data,2026-06-30,U***16477,ROCKET LAB CORP,Sell,RKLB,-10.0,99.7,USD,872.91338,-0.8952555848279999,872.018124415172
Transaction History,Data,2026-06-25,U***16477,PYPL Cash Dividend USD 0.14 per Share,Dividend,PYPL,-,-,-,6.7019424,-,6.7019424
Transaction History,Data,2026-06-25,U***16477,PYPL Cash Dividend USD 0.14 per Share - US Tax,Foreign Tax Withholding,PYPL,-,-,-,-1.0026528,-,-1.0026528
Transaction History,Data,2026-06-23,U***16477,Electronic Fund Transfer,Deposit,-,-,-,-,4000.0,-,4000.0
Transaction History,Data,2026-06-30,U***16477,Net Amount in Base from Forex Trade: -29.48 EUR.USD,Forex Trade Component,EUR.USD,-29.48,1.13956,USD,-0.06690891644799635,-,-0.06690891644799635
Transaction History,Data,2026-06-30,U***16477,FX Translations P&L,Adjustment,-,-,-,-,23.69105372243348,-,23.69105372243348
`;

describe("parseIbkrCsv", () => {
  it("normalizes trades into statement base currency", () => {
    const rows = parseIbkrCsv(csv);

    assert.equal(rows[0].kind, "trade");
    assert.equal(rows[0].tradeType, "buy");
    assert.equal(rows[0].ticker, "RKLB");
    assert.equal(rows[0].quantity, 10);
    assert.equal(rows[0].currencyCode, "EUR");
    assert.equal(rows[0].price, 87.11623);
    assert.equal(rows[0].fee, 0.8755662662);
    assert.equal(rows[0].cashImpact, -872.0378662662);
    assert.equal(rows[0].executedAt, undefined);
    assert.equal(rows[0].executionOrder, -1);
    assert.match(rows[0].message ?? "", /same-day execution order is inferred/);

    assert.equal(rows[1].tradeType, "sell");
    assert.equal(rows[1].quantity, 10);
    assert.equal(rows[1].price, 87.291338);
    assert.equal(rows[1].cashImpact, 872.018124415172);
  });

  it("normalizes dividends, withholding, deposits, forex, and adjustments", () => {
    const rows = parseIbkrCsv(csv);

    assert.deepEqual(rows.map((row) => row.kind), [
      "trade",
      "trade",
      "cash_event",
      "cash_event",
      "cash_event",
      "cash_event",
      "cash_event",
    ]);
    assert.equal(rows[2].eventType, "dividend");
    assert.equal(rows[2].ticker, "PYPL");
    assert.equal(rows[2].amount, 6.7019424);
    assert.equal(rows[3].eventType, "dividend_tax");
    assert.equal(rows[3].amount, -1.0026528);
    assert.equal(rows[4].eventType, "deposit");
    assert.equal(rows[4].amount, 4000);
    assert.equal(rows[5].eventType, "other");
    assert.equal(rows[5].ticker, undefined);
    assert.equal(rows[5].amount, -0.06690891644799635);
    assert.equal(rows[6].eventType, "other");
    assert.equal(rows[6].amount, 23.69105372243348);
  });

  it("imports an exact execution timestamp when the report provides one", () => {
    const timestampCsv = `Summary,Data,Base Currency,EUR
Transaction History,Header,Date/Time,Account,Description,Transaction Type,Symbol,Quantity,Price,Price Currency,Gross Amount,Commission,Net Amount
Transaction History,Data,2026-07-17 15:42:09,U***16477,ROCKET LAB CORP,Sell,RKLB,-10,70,USD,610,-1,609
`;

    const [row] = parseIbkrCsv(timestampCsv);

    assert.equal(row.date, "2026-07-17");
    assert.equal(row.executedAt, "2026-07-17T15:42:09");
  });
});
