'use strict';

jest.mock('../models', () => ({
  User: { findByPk: jest.fn() },
}));
jest.mock('../middleware/auth', () => jest.fn((req, res, next) => next()));
jest.mock('../middleware/kycMiddleware', () => ({
  requireKYCVerification: jest.fn((req, res, next) => next()),
}));
jest.mock('../middleware/idempotency', () => ({
  idempotencyMiddleware: jest.fn((req, res, next) => next()),
}));
jest.mock('../services/ott/ottPayoutService', () => ({
  isEnabled: jest.fn(() => true),
}));
jest.mock('../services/ott/ottClient', () => ({
  OttClient: jest.fn(),
  buildRequestHash: jest.fn(() => 'expectedhash'),
  getConfig: jest.fn(() => ({
    apiKey: 'api-key',
    hashFieldName: 'hashcheck',
    hashParamOrder: { webhook: ['merchantUniqueReference', 'message', 'status', 'transactionId', 'utctimestamp'] },
  })),
}));

const ottRoutes = require('../routes/ott');

describe('OTT routes helpers', () => {
  test('filters read-only provider payloads to ABSA and Nedbank only', () => {
    const result = ottRoutes._private.filterApprovedCashProviders({
      Providers: [
        { ProviderCode: '2', ProviderName: 'Standard Bank Instant Money' },
        { ProviderCode: '10', ProviderName: 'Nedbank Cardless Withdrawal' },
        { ProviderCode: '112', ProviderName: 'ABSA CashSend' },
        { ProviderCode: '127', ProviderName: 'PayShap Account' },
      ],
    });

    expect(result.Providers).toEqual([
      { ProviderCode: '10', ProviderName: 'Nedbank Cardless Withdrawal' },
      { ProviderCode: '112', ProviderName: 'ABSA CashSend' },
    ]);
  });

  test('rejects webhooks without an OTT hash', () => {
    try {
      ottRoutes._private.verifyWebhookPayload({ status: '100' });
      throw new Error('Expected webhook verification to fail');
    } catch (error) {
      expect(error).toMatchObject({ code: 'OTT_WEBHOOK_HASH_MISSING', statusCode: 401 });
    }
  });
});
