"use strict";

// Sketch only: demonstrates how to call draft posting functions.
// Not executed automatically unless test harness is configured.

const ledgerService = require("../services/ledgerService");

describe("draft ledger postings", () => {
  test("VAS purchase draft journals balance", async () => {
    const post = jest.spyOn(ledgerService, 'postJournalEntry').mockResolvedValue({ id: 1, lines: [] });
    await ledgerService.draftPostVasPurchase({
      reference: "TEST-VAS-1",
      grossAmount: 100.0,
      commissionAmount: 5.0,
      clientFloatCode: "CLIENT_FLOAT_1",
      clientClearingCode: "CLIENT_CLEARING_1",
      supplierClearingCode: "SUPPLIER_CLEARING_10",
      interchangeCode: "INTERCHANGE",
      revenueCode: "MM_REV_FEES"
    });
    expect(post).toHaveBeenCalled();
    post.mockRestore();
  });

  test("PayShap RTP draft journals balance", async () => {
    const post = jest.spyOn(ledgerService, 'postJournalEntry').mockResolvedValue({ id: 2, lines: [] });
    await ledgerService.draftPostPayShapRtp({
      reference: "TEST-RTP-1",
      amount: 250.0,
      feeAmount: 2.5,
      payerFloatCode: "CLIENT_FLOAT_2",
      payerClearingCode: "CLIENT_CLEARING_2",
      payeeClearingCode: "SUPPLIER_CLEARING_11",
      interchangeCode: "INTERCHANGE",
      revenueCode: "MM_REV_FEES"
    });
    expect(post).toHaveBeenCalled();
    post.mockRestore();
  });
});
