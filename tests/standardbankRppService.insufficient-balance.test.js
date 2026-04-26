jest.mock('../integrations/standardbank/client', () => ({
  initiatePayment: jest.fn(),
}));

jest.mock('../integrations/standardbank/builders/pain001Builder', () => ({
  buildPain001: jest.fn(() => ({
    pain001: '<xml />',
    msgId: 'MSG-TEST',
    uetr: 'UETR-TEST',
  })),
}));

jest.mock('../integrations/standardbank/builders/pain013Builder', () => ({
  buildPain013: jest.fn(() => ({
    pain013: '<xml />',
    msgId: 'MSG-RTP-TEST',
    uetr: 'UETR-RTP-TEST',
  })),
}));

const mockRollback = jest.fn();
const mockCommit = jest.fn();
const mockWallet = {
  id: 1,
  userId: 5,
  walletId: 'WAL-TEST',
  balance: '64.50',
  canDebit: jest.fn(() => ({ allowed: false, reason: 'Insufficient balance' })),
};

jest.mock('../models', () => ({
  Sequelize: {
    Transaction: {
      LOCK: {
        UPDATE: 'UPDATE',
      },
    },
  },
  sequelize: {
    transaction: jest.fn(async () => ({ rollback: mockRollback, commit: mockCommit })),
  },
  Wallet: {
    findOne: jest.fn(async () => mockWallet),
  },
  StandardBankTransaction: {
    count: jest.fn(async () => 0),
  },
}));

const sbClient = require('../integrations/standardbank/client');
const {
  initiateRppPayment,
  buildRppLedgerLines,
} = require('../services/standardbankRppService');
const {
  buildRtpPaidLedgerLines,
} = require('../services/standardbankRtpService');

describe('standardbankRppService insufficient balance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns fee and maximum payment metadata before calling SBSA', async () => {
    await expect(initiateRppPayment({
      userId: 5,
      walletId: 'WAL-TEST',
      amount: 60,
      creditorAccountNumber: '1234567890',
      creditorBankBranchCode: '470010',
      creditorName: 'Capitec Beneficiary',
      bankName: 'Capitec Bank',
    })).rejects.toMatchObject({
      statusCode: 400,
      code: 'INSUFFICIENT_BALANCE',
      details: {
        availableBalance: 64.50,
        requestedAmount: 60.00,
        instantPaymentFee: 5.75,
        totalUserFee: 6.75,
        totalDebit: 66.75,
        maximumPaymentAmount: 57.75,
        currency: 'ZAR',
      },
    });

    expect(mockWallet.canDebit).toHaveBeenCalledWith(66.75);
    expect(mockRollback).toHaveBeenCalled();
    expect(mockCommit).not.toHaveBeenCalled();
    expect(sbClient.initiatePayment).not.toHaveBeenCalled();
  });

  it('builds RPP ledger lines with SBSA fee as pass-through and VAT only on MM markup', () => {
    const lines = buildRppLedgerLines({
      numAmount: 60.00,
      totalDebit: 66.75,
      monthlyCount: 0,
      fee: {
        sbsaFeeVatIncl: 5.75,
        sbsaFeeExVat: 5.00,
        sbsaVat: 0.75,
        mmMarkupVatIncl: 1.00,
        mmMarkupExVat: 0.87,
        mmMarkupVat: 0.13,
      },
      clientFloatCode: '2100-01-01',
      bankLedgerCode: '1100-01-01',
      sbsaClearingCode: '2200-02-01',
      feeRevenueCode: '4000-20-01',
      vatControlCode: '2300-10-01',
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountCode: '2100-01-01', dc: 'debit', amount: 66.75 }),
      expect.objectContaining({ accountCode: '1100-01-01', dc: 'credit', amount: 60.00 }),
      expect.objectContaining({ accountCode: '2200-02-01', dc: 'credit', amount: 5.75 }),
      expect.objectContaining({ accountCode: '4000-20-01', dc: 'credit', amount: 0.87 }),
      expect.objectContaining({ accountCode: '2300-10-01', dc: 'credit', amount: 0.13 }),
    ]);

    const debits = lines.filter(line => line.dc === 'debit').reduce((sum, line) => sum + line.amount, 0);
    const credits = lines.filter(line => line.dc === 'credit').reduce((sum, line) => sum + line.amount, 0);
    expect(Number(debits.toFixed(2))).toBe(Number(credits.toFixed(2)));
  });
});

describe('standardbankRtpService ledger lines', () => {
  it('posts RTP SBSA fee as pass-through clearing with no VAT control line', () => {
    const lines = buildRtpPaidLedgerLines({
      principalAmount: 10.00,
      netCredit: 4.25,
      fee: {
        sbsaFeeVatIncl: 5.75,
        sbsaFeeExVat: 5.00,
        sbsaVat: 0.75,
      },
      bankLedgerCode: '1100-01-01',
      clientFloatCode: '2100-01-01',
      sbsaClearingCode: '2200-02-01',
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountCode: '1100-01-01', dc: 'debit', amount: 10.00 }),
      expect.objectContaining({ accountCode: '2100-01-01', dc: 'credit', amount: 4.25 }),
      expect.objectContaining({ accountCode: '2200-02-01', dc: 'credit', amount: 5.75 }),
    ]);
    expect(lines).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountCode: '2300-10-01' }),
        expect.objectContaining({ accountCode: '5000-10-01' }),
      ])
    );

    const debits = lines.filter(line => line.dc === 'debit').reduce((sum, line) => sum + line.amount, 0);
    const credits = lines.filter(line => line.dc === 'credit').reduce((sum, line) => sum + line.amount, 0);
    expect(Number(debits.toFixed(2))).toBe(Number(credits.toFixed(2)));
  });
});
