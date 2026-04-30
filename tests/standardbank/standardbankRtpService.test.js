const mockDb = {
  StandardBankRtpRequest: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  StandardBankTransaction: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Transaction: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Wallet: {
    findOne: jest.fn(),
  },
  User: {
    findByPk: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
  },
  Sequelize: {
    Transaction: { LOCK: { UPDATE: 'UPDATE' } },
  },
};

const mockSbClient = {
  initiateRequestToPay: jest.fn(),
};

const mockNotificationService = {
  createNotification: jest.fn(),
};

jest.mock('../../models', () => mockDb);
jest.mock('../../integrations/standardbank/client', () => mockSbClient);
jest.mock('../../integrations/standardbank/builders/pain013Builder', () => ({
  buildPain013: jest.fn(),
}));
jest.mock('../../services/payshapFeeService', () => ({
  getMonthlyRtpCount: jest.fn(),
  calculateRtpFee: jest.fn(),
}));
jest.mock('../../services/notificationService', () => mockNotificationService);

const rtpService = require('../../services/standardbankRtpService');

function makeRtpRequest(overrides = {}) {
  const request = {
    id: 101,
    originalMessageId: 'MMRTP-DISCOVERY-001',
    requestId: 'uetr-001',
    merchantTransactionId: 'MM-RTP-001',
    userId: 7,
    walletId: 'WALLET-7',
    amount: '100.00',
    currency: 'ZAR',
    payerName: 'Discovery Payer',
    payerMobileNumber: '0820000000',
    payerAccountNumber: '1234567890',
    payerBankName: 'Discovery Bank',
    status: 'presented',
    metadata: {},
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    processedAt: null,
    update: jest.fn(async function update(values) {
      Object.assign(request, values);
      request.metadata = values.metadata || request.metadata;
      return request;
    }),
    ...overrides,
  };
  return request;
}

describe('standardbankRtpService PBAC retry behaviour', () => {
  const originalEnv = process.env.STANDARDBANK_RTP_AUTO_PBAC_RETRY_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.STANDARDBANK_RTP_AUTO_PBAC_RETRY_ENABLED;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.STANDARDBANK_RTP_AUTO_PBAC_RETRY_ENABLED;
    } else {
      process.env.STANDARDBANK_RTP_AUTO_PBAC_RETRY_ENABLED = originalEnv;
    }
  });

  it('suppresses automatic PBAC retry for proxy system rejects by default', async () => {
    const rtpRequest = makeRtpRequest();
    mockDb.StandardBankRtpRequest.findOne.mockResolvedValueOnce(rtpRequest);

    await rtpService.processRtpCallback(
      'MMRTP-DISCOVERY-001',
      'uetr-001',
      'RJCT',
      {
        orgnlPmtInfAndSts: {
          stsRsnInf: [{ rsn: { prtry: 'EBONF' } }],
        },
      }
    );

    expect(mockSbClient.initiateRequestToPay).not.toHaveBeenCalled();
    expect(mockDb.StandardBankRtpRequest.create).not.toHaveBeenCalled();
    expect(rtpRequest.status).toBe('rejected');
    expect(rtpRequest.metadata).toEqual(expect.objectContaining({
      proxyRejectCodes: ['EBONF'],
      pbacAutoRetry: 'suppressed',
      pbacAutoRetryReason: 'requires_explicit_customer_initiated_account_based_rtp',
    }));
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      7,
      'txn_wallet_credit',
      'Payment Request Could Not Be Processed',
      expect.stringContaining('could not be processed'),
      expect.any(Object)
    );
  });

  it('keeps automatic PBAC retry disabled unless explicitly enabled', () => {
    expect(rtpService.isAutoPbacRetryEnabled()).toBe(false);
    process.env.STANDARDBANK_RTP_AUTO_PBAC_RETRY_ENABLED = 'true';
    expect(rtpService.isAutoPbacRetryEnabled()).toBe(true);
  });
});
