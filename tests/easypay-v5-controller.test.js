const mockTransaction = {
  LOCK: { UPDATE: 'UPDATE' },
  commit: jest.fn(),
  rollback: jest.fn(),
};

const mockBill = {
  id: 42,
  userId: 7,
  status: 'pending',
  amount: 5000,
  minAmount: 5000,
  maxAmount: 5000,
  dueDate: '2026-05-29',
  update: jest.fn(),
  reload: jest.fn(),
};

const mockWallet = {
  id: 9,
  walletId: 'WAL-TEST-0007',
  status: 'active',
  credit: jest.fn(),
  debit: jest.fn(),
};

const mockPayment = {
  update: jest.fn(),
};

const mockModels = {
  Bill: { findOne: jest.fn() },
  Payment: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Wallet: { findOne: jest.fn() },
  Transaction: { create: jest.fn() },
  User: {},
  sequelize: {
    transaction: jest.fn(),
  },
};

jest.mock('../models', () => mockModels);
jest.mock('../services/easyPayDepositService', () => ({
  calculateEasyPayFee: jest.fn(() => ({
    feeExclVat: 5.5,
    vat: 0.83,
    totalFee: 6.33,
    netAmount: 43.67,
  })),
  postEasyPayDeposit: jest.fn().mockResolvedValue({}),
}));
jest.mock('../services/notificationService', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}));

const easyPayController = require('../controllers/easyPayController');

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('EasyPay V5 controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.commit.mockResolvedValue();
    mockTransaction.rollback.mockResolvedValue();
    mockModels.sequelize.transaction.mockResolvedValue(mockTransaction);
    mockBill.status = 'pending';
    mockBill.update.mockResolvedValue(mockBill);
    mockBill.reload.mockResolvedValue(mockBill);
    mockWallet.credit.mockResolvedValue(mockWallet);
    mockWallet.debit.mockResolvedValue(mockWallet);
    mockPayment.update.mockResolvedValue(mockPayment);
    mockWallet.status = 'active';
    mockModels.Bill.findOne.mockResolvedValue(mockBill);
    mockModels.Wallet.findOne.mockResolvedValue(mockWallet);
    mockModels.Payment.findOne.mockResolvedValue(null);
    mockModels.Payment.create.mockResolvedValue({});
    mockModels.Transaction.create
      .mockResolvedValueOnce({ id: 1001 })
      .mockResolvedValueOnce({ id: 1002 });
  });

  it('stores authorisation with an internal EasyPay-specific reference', async () => {
    const res = createResponse();

    await easyPayController.authorisationRequest({
      body: {
        EasyPayNumber: '95063163563805',
        AccountNumber: '16356380',
        Amount: 5000,
        Reference: '1',
        EchoData: 'auth-echo',
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ResponseCode).toBe('0');
    expect(mockModels.Payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'EPV5-95063163563805-1',
        transactionId: '1',
        easyPayNumber: '95063163563805',
      }),
      { transaction: mockTransaction }
    );
  });

  it('does not create a duplicate payment on repeated authorisation', async () => {
    mockModels.Payment.findOne.mockResolvedValue({ id: 55 });
    const res = createResponse();

    await easyPayController.authorisationRequest({
      body: {
        EasyPayNumber: '95063163563805',
        AccountNumber: '16356380',
        Amount: 5000,
        Reference: '1',
        EchoData: 'auth-echo',
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ResponseCode).toBe('0');
    expect(mockModels.Payment.create).not.toHaveBeenCalled();
  });

  it('records payment notification transactions with the wallet string ID', async () => {
    mockModels.Payment.findOne.mockResolvedValue(mockPayment);
    const res = createResponse();

    await easyPayController.paymentNotification({
      body: {
        MerchantId: '000000000000002',
        TerminalId: '00000001',
        PaymentDate: '2026-04-29 12:58:36',
        Reference: '1',
        EasyPayNumber: '95063163563805',
        AccountNumber: '16356380',
        Amount: 5000,
        EchoData: 'payment-echo',
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ EchoData: 'payment-echo' });
    expect(mockModels.Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: expect.stringMatching(/^EP-42-\d+-DEP$/),
        type: 'deposit',
        walletId: 'WAL-TEST-0007',
      }),
      { transaction: mockTransaction }
    );
    expect(mockModels.Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: expect.stringMatching(/^EP-42-\d+-FEE$/),
        type: 'fee',
        walletId: 'WAL-TEST-0007',
      }),
      { transaction: mockTransaction }
    );
    expect(mockWallet.debit).toHaveBeenCalledWith(6.33, 'debit', {
      transaction: mockTransaction,
      bypassDailyMonthlyLimits: true,
    });
    expect(mockPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        userId: 7,
        walletId: 'WAL-TEST-0007',
      }),
      { transaction: mockTransaction }
    );
  });

  it('returns EchoData without double-crediting duplicate paid notifications', async () => {
    mockBill.status = 'paid';
    const res = createResponse();

    await easyPayController.paymentNotification({
      body: {
        EasyPayNumber: '95063163563805',
        AccountNumber: '16356380',
        Amount: 5000,
        EchoData: 'duplicate-echo',
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ EchoData: 'duplicate-echo' });
    expect(mockWallet.credit).not.toHaveBeenCalled();
    expect(mockModels.Transaction.create).not.toHaveBeenCalled();
  });
});
