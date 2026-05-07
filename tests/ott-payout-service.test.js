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

const mockSupplierFloat = {
  supplierId: 'OTT',
  ledgerAccountCode: '1200-10-08',
  status: 'active',
  isActive: true,
  currentBalance: '1000.00',
  metadata: {},
  update: jest.fn(),
};

const mockCommercialTerm = {
  supplierCode: 'OTT',
  providerCode: '112',
  providerName: 'ABSA CashSend',
  providerType: 'payout',
  serviceFamily: 'cash_send',
  commercialType: 'fixed_fee',
  fixedFeeExVat: '9.96',
  fixedFeeVatRate: '0.1500',
  fixedFeeIsVatExclusive: true,
  mmtpFeeExVat: '1.34',
  reversalFeeExVat: '9.96',
  effectiveFrom: '2026-05-07',
  effectiveTo: null,
  metadata: { source: 'agreement_3_2' },
};

const mockModels = {
  Sequelize: { Transaction: { LOCK: { UPDATE: 'UPDATE' } } },
  sequelize: { transaction: jest.fn() },
  Wallet: { findOne: jest.fn() },
  OttPayout: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
  Transaction: { create: jest.fn(), update: jest.fn(), findOne: jest.fn() },
  SupplierFloat: { findOne: jest.fn() },
  SupplierCommercialTerm: { findOne: jest.fn() },
  TaxTransaction: { findOne: jest.fn(), create: jest.fn(), update: jest.fn() },
};

const mockPerformPayout = jest.fn();

jest.mock('../models', () => mockModels);
jest.mock('../services/ledgerService', () => ({
  postJournalEntry: jest.fn().mockResolvedValue({}),
  getAccountBalanceByCode: jest.fn().mockResolvedValue(890.04),
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
    process.env.VAT_RATE = '0.15';
    mockPayment.status = 'processing';
    mockPayment.metadata = {};
    mockPayment.webhookEventId = null;
    mockPayment.reversedAt = null;
    mockPayment.providerFeeAmount = 11.45;
    mockPayment.mmtpFeeAmount = 1.55;
    mockPayment.totalDebit = 113.00;
    mockTransaction.commit.mockResolvedValue();
    mockTransaction.rollback.mockResolvedValue();
    mockModels.sequelize.transaction.mockResolvedValue(mockTransaction);
    mockModels.Wallet.findOne.mockResolvedValue(mockWallet);
    mockModels.OttPayout.create.mockResolvedValue(mockPayment);
    mockModels.OttPayout.findOne.mockResolvedValue(mockPayment);
    mockModels.Transaction.create.mockResolvedValue({});
    mockModels.Transaction.update.mockResolvedValue([2]);
    mockModels.Transaction.findOne.mockResolvedValue({ transactionId: 'OTT-FEE-OTT-TEST' });
    mockModels.SupplierFloat.findOne.mockResolvedValue(mockSupplierFloat);
    mockModels.SupplierCommercialTerm.findOne.mockResolvedValue(mockCommercialTerm);
    mockModels.TaxTransaction.findOne.mockResolvedValue(null);
    mockModels.TaxTransaction.create.mockResolvedValue({});
    mockModels.TaxTransaction.update.mockResolvedValue([1]);
    mockWallet.canCashOut.mockReturnValue({ allowed: true });
    mockWallet.debit.mockResolvedValue(mockWallet);
    mockWallet.credit.mockResolvedValue(mockWallet);
    mockPayment.update.mockResolvedValue(mockPayment);
    mockSupplierFloat.metadata = {};
    mockSupplierFloat.update.mockResolvedValue(mockSupplierFloat);
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
    ledgerService.getAccountBalanceByCode.mockResolvedValue(890.04);
  });

  afterEach(() => {
    delete process.env.OTT_PAYOUT_ENABLED;
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
    await expect(service.quoteOttPayout({ amount: 100, providerCode: '112' }))
      .rejects.toMatchObject({ code: 'OTT_PAYOUT_DISABLED', statusCode: 403 });
  });

  it('rejects payout providers outside the ABSA and Nedbank contract scope', async () => {
    await expect(service.quoteOttPayout({ amount: 100, providerCode: '2' }))
      .rejects.toMatchObject({ code: 'OTT_PAYOUT_PROVIDER_NOT_APPROVED', statusCode: 400 });
    expect(mockModels.SupplierCommercialTerm.findOne).not.toHaveBeenCalled();
  });

  it('debits only after unrestricted cash-out guard passes and calls OTT with internal reference', async () => {
    const result = await service.submitOttPayout({
      userId: 7,
      amount: 100,
      providerCode: '112',
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

    expect(mockWallet.canCashOut).toHaveBeenCalledWith(113.00, { kycTier: undefined });
    expect(mockWallet.debit).toHaveBeenCalledWith(113.00, 'debit', { transaction: mockTransaction });
    expect(mockModels.OttPayout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        uniqueReferenceId: expect.stringMatching(/^MM-OTT-/),
        providerCode: '112',
        idempotencyKey: 'idem-1',
        totalDebit: 113.00,
        feeSnapshot: expect.objectContaining({
          feePolicy: expect.objectContaining({
            source: 'supplier_commercial_terms',
            providerFeeExVat: 9.96,
            providerFeeAmount: 11.45,
            mmtpFeeExVat: 1.34,
            mmtpFeeAmount: 1.55,
            totalFeeAmount: 13.00,
          }),
        }),
      }),
      { transaction: mockTransaction }
    );
    expect(mockModels.Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'withdraw',
        amount: 100,
        fee: 13.00,
      }),
      { transaction: mockTransaction }
    );
    expect(mockModels.Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: expect.stringMatching(/^OTT-FEE-OTT-/),
        type: 'fee',
        amount: -13.00,
        description: 'Transaction fee',
      }),
      { transaction: mockTransaction }
    );
    expect(mockPerformPayout).toHaveBeenCalledWith(expect.objectContaining({
      yourUniqueReference: expect.stringMatching(/^MM-OTT-/),
      amount: '100.00',
      provider: expect.objectContaining({ providerCode: '112' }),
      recipient: expect.objectContaining({
        firstname: 'Test',
        surname: 'User',
        id_type: 'RSAID',
        id_number: '8001015009087',
        mobile: '+27825571055',
      }),
    }));
    expect(result.totalDebit).toBe(113.00);
    expect(mockModels.TaxTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      originalTransactionId: expect.stringMatching(/^OTT-FEE-OTT-/),
      taxType: 'vat',
      baseAmount: 1.35,
      taxAmount: 0.20,
      totalAmount: 1.55,
      transactionType: 'ott_payout_fee',
      vatDirection: 'output',
      supplierCode: 'OTT',
      isClaimable: false,
    }));
  });

  it('does not call OTT when unrestricted cash-out guard fails', async () => {
    mockWallet.canCashOut.mockReturnValue({ allowed: false, reason: 'restricted funds' });

    await expect(service.submitOttPayout({
      userId: 7,
      amount: 100,
      providerCode: '112',
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

  it('maps OTT numeric statuses from partner webhook contract', () => {
    expect(service.normalizeProviderStatus('100')).toBe('completed');
    expect(service.normalizeProviderStatus('99')).toBe('processing');
    expect(service.normalizeProviderStatus('98')).toBe('processing');
    expect(service.normalizeProviderStatus('97')).toBe('failed');
    expect(service.normalizeProviderStatus('42')).toBe('failed');
  });

  it('posts ledger when pending payout later completes via OTT webhook', async () => {
    const result = await service.updatePayoutFromWebhook({
      utctimestamp: '2025-12-11T13:31:15Z',
      transactionId: '3460396',
      merchantUniqueReference: 'MM-OTT-TEST',
      message: 'Successful',
      status: '100',
    });

    expect(mockPayment.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      webhookEventId: '3460396',
      ottPaymentReference: '3460396',
      processedAt: expect.any(Date),
    }));
    expect(ledgerService.postJournalEntry).toHaveBeenCalledWith(expect.objectContaining({
      reference: 'OTT-PAYOUT-OTT-TEST',
    }));
    expect(mockModels.Transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        failureReason: null,
      }),
      expect.objectContaining({
        where: expect.objectContaining({
          reference: 'MM-OTT-TEST',
          type: 'withdraw',
          status: ['pending', 'processing'],
        }),
      })
    );
    expect(ledgerService.getAccountBalanceByCode).toHaveBeenCalledWith('1200-10-08');
    expect(mockModels.SupplierFloat.findOne).toHaveBeenCalledWith({
      where: {
        supplierId: 'OTT',
        ledgerAccountCode: '1200-10-08',
        status: 'active',
        isActive: true,
      },
    });
    expect(mockSupplierFloat.update).toHaveBeenCalledWith(expect.objectContaining({
      currentBalance: '890.04',
      metadata: expect.objectContaining({
        lastLedgerSyncSource: 'ott_payout_posted',
      }),
    }));
    expect(result).toEqual({ processed: true, payoutId: 'OTT-TEST', status: 'completed' });
  });

  it('marks the wallet withdrawal completed when OTT completes after ledger was already posted', async () => {
    mockPayment.metadata = { ledgerPostedAt: '2026-05-07T15:45:27.226Z' };

    const result = await service.updatePayoutFromWebhook({
      transactionId: '3460400',
      merchantUniqueReference: 'MM-OTT-TEST',
      message: 'Successful',
      status: '100',
    });

    expect(ledgerService.postJournalEntry).not.toHaveBeenCalled();
    expect(mockModels.Transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        failureReason: null,
      }),
      expect.objectContaining({
        where: expect.objectContaining({
          reference: 'MM-OTT-TEST',
          type: 'withdraw',
          status: ['pending', 'processing'],
        }),
      })
    );
    expect(result).toEqual({ processed: true, payoutId: 'OTT-TEST', status: 'completed' });
  });

  it('keeps OTT webhook 98 and 99 states pending without reversing or posting ledger', async () => {
    const result = await service.updatePayoutFromWebhook({
      transactionId: '3460397',
      merchantUniqueReference: 'MM-OTT-TEST',
      message: 'Pending',
      status: '99',
    });

    expect(mockPayment.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'processing',
      webhookEventId: '3460397',
    }));
    expect(mockWallet.credit).not.toHaveBeenCalled();
    expect(ledgerService.postJournalEntry).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: true, payoutId: 'OTT-TEST', status: 'processing' });
  });

  it('syncs OTT supplier float after reversal ledger posts', async () => {
    mockPayment.metadata = { ledgerPostedAt: '2026-05-05T15:00:00.000Z' };
    mockPayment.reversedAt = null;
    ledgerService.getAccountBalanceByCode.mockResolvedValue(1000);

    const result = await service.updatePayoutFromWebhook({
      transactionId: '3460398',
      merchantUniqueReference: 'MM-OTT-TEST',
      message: 'Provider failed',
      status: '97',
    });

    expect(mockWallet.credit).toHaveBeenCalledWith(113.00, 'credit', { transaction: mockTransaction });
    expect(ledgerService.postJournalEntry).toHaveBeenCalledWith(expect.objectContaining({
      reference: 'OTT-PAYOUT-REV-OTT-TEST',
    }));
    expect(ledgerService.getAccountBalanceByCode).toHaveBeenCalledWith('1200-10-08');
    expect(mockSupplierFloat.update).toHaveBeenCalledWith(expect.objectContaining({
      currentBalance: '1000.00',
      metadata: expect.objectContaining({
        lastLedgerSyncSource: 'ott_payout_reversed',
      }),
    }));
    expect(result).toEqual({
      processed: true,
      payoutId: 'OTT-TEST',
      status: 'failed',
      reversed: true,
    });
  });

  it('validates official OTT recipient fields before wallet debit', async () => {
    await expect(service.submitOttPayout({
      userId: 7,
      amount: 100,
      providerCode: '112',
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
      providerCode: '112',
      recipient: {
        mobile: '+27825571055',
        firstName: 'Test',
        surname: 'User',
        idType: 'RSAID',
        idNumber: '8001015009087',
      },
      idempotencyKey: 'idem-failed',
    });

    expect(mockWallet.credit).toHaveBeenCalledWith(113.00, 'credit', { transaction: mockTransaction });
    expect(mockModels.Transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'reversed',
        failureReason: 'Provider declined',
      }),
      expect.objectContaining({
        where: expect.objectContaining({
          reference: 'MM-OTT-TEST',
          type: ['withdraw', 'fee'],
        }),
        transaction: mockTransaction,
      })
    );
    expect(ledgerService.postJournalEntry).not.toHaveBeenCalled();
  });

  it('keeps the wallet debit pending when OTT submit outcome is unknown', async () => {
    const timeoutError = new Error('timeout of 15000ms exceeded');
    timeoutError.statusCode = 502;
    timeoutError.responseData = {};
    timeoutError.request = { yourUniqueReference: 'MM-OTT-TEST' };
    mockPerformPayout.mockRejectedValue(timeoutError);

    const result = await service.submitOttPayout({
      userId: 7,
      amount: 100,
      providerCode: '112',
      recipient: {
        mobile: '+27825571055',
        firstName: 'Test',
        surname: 'User',
        idType: 'RSAID',
        idNumber: '8001015009087',
      },
      idempotencyKey: 'idem-timeout',
    });

    expect(result).toEqual(expect.objectContaining({
      status: 'processing',
      outcomeUnknown: true,
      requiresPolling: true,
      totalDebit: 113.00,
    }));
    expect(mockWallet.credit).not.toHaveBeenCalled();
    expect(mockPayment.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'processing',
      rejectionReason: 'OTT submit outcome unknown; poll required',
      metadata: expect.objectContaining({
        submitOutcomeUnknownReason: 'timeout of 15000ms exceeded',
      }),
    }));
  });

  it('surfaces ledger posting failures without crediting the wallet after OTT accepted the payout', async () => {
    ledgerService.postJournalEntry.mockRejectedValue(new Error('missing ledger account'));

    await expect(service.submitOttPayout({
      userId: 7,
      amount: 100,
      providerCode: '112',
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

  it('marks payout fee VAT evidence as refunded when an OTT payout fee reverses', async () => {
    mockModels.Transaction.findOne.mockResolvedValue({ transactionId: 'OTT-FEE-OTT-TEST' });

    await service.refundPayoutFeeTaxTransaction(mockPayment);

    expect(mockModels.Transaction.findOne).toHaveBeenCalledWith({
      where: {
        reference: 'MM-OTT-TEST',
        type: 'fee',
        status: 'reversed',
      },
    });
    expect(mockModels.TaxTransaction.update).toHaveBeenCalledWith(
      { status: 'refunded' },
      {
        where: {
          originalTransactionId: 'OTT-FEE-OTT-TEST',
          transactionType: 'ott_payout_fee',
          entityId: 'OTT',
          status: ['pending', 'calculated', 'paid', 'reported'],
        },
      }
    );
  });
});
