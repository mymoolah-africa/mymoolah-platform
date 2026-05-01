const mockTransaction = {
  LOCK: { UPDATE: 'UPDATE' },
  commit: jest.fn(),
  rollback: jest.fn(),
};

const mockWallet = {
  walletId: 'WAL-OTT-TEST',
  balance: '500.00',
  restrictedBalance: '250.00',
  canCashOut: jest.fn(),
  debit: jest.fn(),
  credit: jest.fn(),
};

const mockPayment = {
  payoutId: 'OTT-TEST',
  uniqueReferenceId: 'MM-OTT-TEST',
  userId: 7,
  walletId: 'WAL-OTT-TEST',
  amount: 100,
  providerFeeAmount: 9.96,
  mmtpFeeAmount: 1.15,
  totalDebit: 111.11,
  currency: 'ZAR',
  status: 'processing',
  metadata: {},
  update: jest.fn(),
};

const mockModels = {
  Sequelize: { Transaction: { LOCK: { UPDATE: 'UPDATE' } } },
  sequelize: { transaction: jest.fn() },
  Wallet: { findOne: jest.fn() },
  OttPayout: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
  Transaction: { create: jest.fn() },
};

const mockPerformPayout = jest.fn();

jest.mock('../models', () => mockModels);
jest.mock('../services/ledgerService', () => ({
  postJournalEntry: jest.fn().mockResolvedValue({}),
}));
jest.mock('../services/ott/ottClient', () => ({
  OttClient: jest.fn().mockImplementation(() => ({
    performPayout: mockPerformPayout,
  })),
  redact: jest.fn((value) => value),
}));

const service = require('../services/ott/ottPayoutService');
const ledgerService = require('../services/ledgerService');

describe('OTT payout service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OTT_PAYOUT_ENABLED = 'true';
    process.env.OTT_PAYOUT_PROVIDER_FEE_ZAR = '9.96';
    process.env.OTT_PAYOUT_MM_FEE_ZAR = '1.15';
    process.env.VAT_RATE = '0.15';
    mockTransaction.commit.mockResolvedValue();
    mockTransaction.rollback.mockResolvedValue();
    mockModels.sequelize.transaction.mockResolvedValue(mockTransaction);
    mockModels.Wallet.findOne.mockResolvedValue(mockWallet);
    mockModels.OttPayout.create.mockResolvedValue(mockPayment);
    mockModels.OttPayout.findOne.mockResolvedValue(mockPayment);
    mockModels.Transaction.create.mockResolvedValue({});
    mockWallet.canCashOut.mockReturnValue({ allowed: true });
    mockWallet.debit.mockResolvedValue(mockWallet);
    mockWallet.credit.mockResolvedValue(mockWallet);
    mockPayment.update.mockResolvedValue(mockPayment);
    mockPerformPayout.mockResolvedValue({
      status: 200,
      data: {
        status: 'accepted',
        paymentReference: 'OTT-PAY-123',
        providerTransactionReference: 'PROV-123',
      },
      request: { yourUniqueReference: 'MM-OTT-TEST' },
    });
    ledgerService.postJournalEntry.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.OTT_PAYOUT_ENABLED;
    delete process.env.OTT_PAYOUT_PROVIDER_FEE_ZAR;
    delete process.env.OTT_PAYOUT_MM_FEE_ZAR;
    delete process.env.VAT_RATE;
  });

  it('builds balanced ledger lines with provider fee as pass-through and VAT only on MMTP fee', () => {
    const lines = service.buildOttPayoutLedgerLines({
      amount: 100,
      providerFeeAmount: 9.96,
      mmtpFeeAmount: 1.15,
      clientFloatCode: '2100-01-01',
      ottFloatCode: '1200-10-08',
      feeRevenueCode: '4000-20-01',
      vatControlCode: '2300-10-01',
      vatRate: 0.15,
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountCode: '2100-01-01', dc: 'debit', amount: 111.11 }),
      expect.objectContaining({ accountCode: '1200-10-08', dc: 'credit', amount: 109.96 }),
      expect.objectContaining({ accountCode: '4000-20-01', dc: 'credit', amount: 1.00 }),
      expect.objectContaining({ accountCode: '2300-10-01', dc: 'credit', amount: 0.15 }),
    ]);
    const debits = lines.filter((line) => line.dc === 'debit').reduce((sum, line) => sum + line.amount, 0);
    const credits = lines.filter((line) => line.dc === 'credit').reduce((sum, line) => sum + line.amount, 0);
    expect(Number(debits.toFixed(2))).toBe(Number(credits.toFixed(2)));
  });

  it('fails closed when payout feature flag is disabled', async () => {
    process.env.OTT_PAYOUT_ENABLED = 'false';
    await expect(service.quoteOttPayout({ amount: 100, providerCode: 'NEDBANK' }))
      .rejects.toMatchObject({ code: 'OTT_PAYOUT_DISABLED', statusCode: 403 });
  });

  it('debits only after unrestricted cash-out guard passes and calls OTT with internal reference', async () => {
    const result = await service.submitOttPayout({
      userId: 7,
      amount: 100,
      providerCode: 'NEDBANK',
      recipient: {
        mobile: '+27825571055',
        firstName: 'Test',
        surname: 'User',
        idType: 'RSAID',
        idNumber: '8001015009087',
        branchCode: '198765',
      },
      reference: 'Cash send',
      idempotencyKey: 'idem-1',
    });

    expect(mockWallet.canCashOut).toHaveBeenCalledWith(111.11, { kycTier: undefined });
    expect(mockWallet.debit).toHaveBeenCalledWith(111.11, 'debit', { transaction: mockTransaction });
    expect(mockModels.OttPayout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        uniqueReferenceId: expect.stringMatching(/^MM-OTT-/),
        providerCode: 'NEDBANK',
        idempotencyKey: 'idem-1',
        totalDebit: 111.11,
      }),
      { transaction: mockTransaction }
    );
    expect(mockPerformPayout).toHaveBeenCalledWith(expect.objectContaining({
      yourUniqueReference: expect.stringMatching(/^MM-OTT-/),
      amount: '100.00',
      provider: expect.objectContaining({ providerCode: 'NEDBANK' }),
      recipient: expect.objectContaining({
        firstname: 'Test',
        surname: 'User',
        id_type: 'RSAID',
        id_number: '8001015009087',
        mobile: '+27825571055',
      }),
    }));
    expect(result.totalDebit).toBe(111.11);
  });

  it('does not call OTT when unrestricted cash-out guard fails', async () => {
    mockWallet.canCashOut.mockReturnValue({ allowed: false, reason: 'restricted funds' });

    await expect(service.submitOttPayout({
      userId: 7,
      amount: 100,
      providerCode: 'NEDBANK',
      recipient: {
        mobile: '+27825571055',
        firstName: 'Test',
        surname: 'User',
        idType: 'RSAID',
        idNumber: '8001015009087',
      },
    })).rejects.toMatchObject({ code: 'WALLET_CASH_WITHDRAW_RESTRICTED' });

    expect(mockWallet.debit).not.toHaveBeenCalled();
    expect(mockPerformPayout).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it('deduplicates repeated webhook events', async () => {
    mockPayment.webhookEventId = 'evt-1';
    const result = await service.updatePayoutFromWebhook({
      uniqueReferenceId: 'MM-OTT-TEST',
      eventId: 'evt-1',
      status: 'completed',
    });

    expect(result).toEqual({ processed: false, duplicate: true, payoutId: 'OTT-TEST' });
    expect(mockPayment.update).not.toHaveBeenCalled();
  });

  it('validates official OTT recipient fields before wallet debit', async () => {
    await expect(service.submitOttPayout({
      userId: 7,
      amount: 100,
      providerCode: 'NEDBANK',
      recipient: {},
    })).rejects.toMatchObject({ code: 'OTT_RECIPIENT_DETAILS_REQUIRED' });

    expect(mockModels.Wallet.findOne).not.toHaveBeenCalled();
    expect(mockWallet.debit).not.toHaveBeenCalled();
    expect(mockPerformPayout).not.toHaveBeenCalled();
  });

  it('reverses wallet debit when OTT returns a failed status body', async () => {
    mockPerformPayout.mockResolvedValue({
      status: 200,
      data: { status: 'failed', message: 'Provider declined' },
      request: { yourUniqueReference: 'MM-OTT-TEST' },
    });

    await service.submitOttPayout({
      userId: 7,
      amount: 100,
      providerCode: 'NEDBANK',
      recipient: {
        mobile: '+27825571055',
        firstName: 'Test',
        surname: 'User',
        idType: 'RSAID',
        idNumber: '8001015009087',
      },
      idempotencyKey: 'idem-failed',
    });

    expect(mockWallet.credit).toHaveBeenCalledWith(111.11, 'credit', { transaction: mockTransaction });
    expect(ledgerService.postJournalEntry).not.toHaveBeenCalled();
  });

  it('surfaces ledger posting failures without crediting the wallet after OTT accepted the payout', async () => {
    ledgerService.postJournalEntry.mockRejectedValue(new Error('missing ledger account'));

    await expect(service.submitOttPayout({
      userId: 7,
      amount: 100,
      providerCode: 'NEDBANK',
      recipient: {
        mobile: '+27825571055',
        firstName: 'Test',
        surname: 'User',
        idType: 'RSAID',
        idNumber: '8001015009087',
      },
      idempotencyKey: 'idem-ledger',
    })).rejects.toMatchObject({ code: 'OTT_LEDGER_POST_FAILED' });

    expect(mockPerformPayout).toHaveBeenCalled();
    expect(mockWallet.credit).not.toHaveBeenCalled();
    expect(mockPayment.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ledger_post_failed',
      rejectionReason: 'missing ledger account',
    }));
  });
});
