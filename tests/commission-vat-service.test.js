'use strict';

const mockTaxTransaction = { create: jest.fn() };
const mockPostJournalEntry = jest.fn();

jest.mock('../models', () => ({
  TaxTransaction: mockTaxTransaction,
}));

jest.mock('../services/supplierPricingService', () => ({
  getCommissionInfo: jest.fn(),
  computeCommissionFromInfo: jest.fn(),
}));

jest.mock('../services/ledgerService', () => ({
  postJournalEntry: mockPostJournalEntry,
}));

describe('commissionVatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VAT_RATE = '0.15';
  });

  afterEach(() => {
    delete process.env.VAT_RATE;
  });

  it('persists supplier VAT enrichment on output VAT tax transactions', async () => {
    const service = require('../services/commissionVatService');

    await service.postCommissionVatAndLedger({
      commissionCents: 7,
      supplierCode: 'OTT',
      serviceType: 'voucher',
      walletTransactionId: 'VOUCHER-TEST',
      sourceTransactionId: 'SRC-TEST',
      idempotencyKey: 'idem-test',
      purchaserUserId: 1,
    });

    expect(mockTaxTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        originalTransactionId: 'VOUCHER-TEST',
        taxType: 'vat',
        baseAmount: 0.06,
        taxAmount: 0.01,
        totalAmount: 0.07,
        transactionType: 'voucher',
        entityId: 'OTT',
        vatDirection: 'output',
        supplierCode: 'OTT',
        isClaimable: false,
      }),
      undefined
    );
  });
});
