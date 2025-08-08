"use strict";

const request = require("supertest");
const app = require("../server");
const { sequelize, LedgerAccount, JournalEntry, JournalLine } = require("../models");

beforeAll(async () => {
  await sequelize.sync();
});

afterAll(async () => {
  await sequelize.close();
});

describe("Ledger API", () => {
  test("create accounts, post balanced journal, and fetch trial balance", async () => {
    // Create accounts
    const cash = await request(app)
      .post("/api/v1/ledger/accounts")
      .send({ code: "1000", name: "Cash", type: "asset", normalSide: "debit" })
      .expect(200);

    const revenue = await request(app)
      .post("/api/v1/ledger/accounts")
      .send({ code: "4000", name: "Revenue", type: "revenue", normalSide: "credit" })
      .expect(200);

    expect(cash.body.success).toBe(true);
    expect(revenue.body.success).toBe(true);

    // Post journal
    const jr = await request(app)
      .post("/api/v1/ledger/journal-entries")
      .send({
        reference: "TEST-001",
        description: "Sale for cash",
        lines: [
          { accountCode: "1000", dc: "debit", amount: 100.0 },
          { accountCode: "4000", dc: "credit", amount: 100.0 }
        ]
      })
      .expect(200);

    expect(jr.body.success).toBe(true);
    expect(jr.body.data.lines.length).toBe(2);

    // Trial balance
    const tb = await request(app).get("/api/v1/ledger/trial-balance").expect(200);
    expect(tb.body.success).toBe(true);
    const totals = tb.body.data.totals;
    expect(Number(totals.debits).toFixed(2)).toBe(Number(totals.credits).toFixed(2));
  });
});
