import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectImportSourceSystem } from "../../../../../lib/importSourceDetection";

describe("detectImportSourceSystem", () => {
  it("detects Stock Tracker backups as manual CSV", () => {
    const csv = `Kind,Platform,Date,Type,Ticker,Quantity,Price,Amount,Currency,Fee,FX Rate,Notes
trade,Revolut,2024-02-01,buy,TSLA,2,100,-201,USD,1,,manual buy
`;

    assert.equal(detectImportSourceSystem("stock-tracker-trades-backup-2026-06-29.csv", csv), "manual");
  });

  it("detects Revolut activity CSVs", () => {
    const csv = "Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate\n";
    assert.equal(detectImportSourceSystem("trading-account-statement.csv", csv), "revolut");
  });

  it("detects IBKR transaction-history CSVs", () => {
    const csv = `Statement,Header,Field Name,Field Value
Statement,Data,Title,Transaction History
Transaction History,Header,Date,Account,Description,Transaction Type,Symbol,Quantity,Price,Price Currency,Gross Amount ,Commission,Net Amount
`;
    assert.equal(detectImportSourceSystem("U24116477.TRANSACTIONS.1Y.csv", csv), "ibkr");
  });
});
