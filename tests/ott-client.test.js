const crypto = require('crypto');
const {
  DEFAULT_HASH_PARAM_ORDER,
  buildRequestHash,
  getConfig,
  redact,
} = require('../services/ott/ottClient');

describe('OTT client helpers', () => {
  it('builds SHA-256 request hash from ordered values plus API key', () => {
    const payload = {
      uniqueReferenceId: 'MM-OTT-1',
      amount: '100.00',
      provider_providerCode: 'NEDBANK',
      ignored: 'not-in-preimage',
    };
    const apiKey = 'test-api-key';
    const expected = crypto
      .createHash('sha256')
      .update('MM-OTT-1100.00NEDBANKtest-api-key', 'utf8')
      .digest('hex');

    expect(buildRequestHash(payload, ['uniqueReferenceId', 'amount', 'provider_providerCode'], apiKey))
      .toBe(expected);
  });

  it('builds SHA-256 request hash from nested OTT manual fields', () => {
    const payload = {
      amount: '100.00',
      provider: { providerCode: '10', providerName: 'Nedbank' },
      recipient: {
        firstname: 'Test',
        surname: 'User',
        mobile: '+27825571055',
        id_type: 'RSAID',
        id_number: '8001015009087',
        bank_id: '0',
      },
      yourUniqueReference: 'MM-OTT-1',
    };
    const apiKey = 'test-api-key';
    const order = [
      'recipient.account_name',
      'recipient.account_number',
      'amount',
      'recipient.bank_id',
      'recipient.firstname',
      'provider.providerCode',
      'recipient.surname',
      'yourUniqueReference',
    ];
    const expected = crypto
      .createHash('sha256')
      .update('100.000Test10UserMM-OTT-1test-api-key', 'utf8')
      .digest('hex');

    expect(buildRequestHash(payload, order, apiKey)).toBe(expected);
  });

  it('fails closed when endpoint hash order is missing', () => {
    expect(() => buildRequestHash({ amount: '10.00' }, [], 'key')).toThrow('hash parameter order');
  });

  it('uses Jaco-confirmed OTT webhook hash order', () => {
    const payload = {
      utctimestamp: '2025-12-11T13:31:15Z',
      transactionId: '3460396',
      merchantUniqueReference: 'Test123',
      message: 'Pending',
      status: '99',
      secret: '00000000-0000-0000-0000-000000000000',
    };
    const apiKey = 'test-api-key';
    const expected = crypto
      .createHash('sha256')
      .update('Test123Pending9934603962025-12-11T13:31:15Ztest-api-key', 'utf8')
      .digest('hex');

    expect(buildRequestHash(payload, DEFAULT_HASH_PARAM_ORDER.webhook, apiKey)).toBe(expected);
  });

  it('defaults OTT API timeout above provider 50 second completion window', () => {
    delete process.env.OTT_API_TIMEOUT_MS;
    expect(getConfig().timeoutMs).toBe(60000);
  });

  it('redacts credentials and PII-like fields before logging', () => {
    const redacted = redact({
      accountNumber: '1234567890',
      mobile: '+27825571055',
      id_number: '6411055084084',
      pin: '3264',
      serialNumber: '5514788701',
      provider_providerCode: 'NEDBANK',
      nested: { apiKey: 'secret-value' },
    });

    expect(redacted.provider_providerCode).toBe('NEDBANK');
    expect(redacted.accountNumber).toBe('12***90');
    expect(redacted.mobile).toBe('+2***55');
    expect(redacted.id_number).toBe('64***84');
    expect(redacted.pin).toBe('****');
    expect(redacted.serialNumber).toBe('55***01');
    expect(redacted.nested.apiKey).toBe('se***ue');
  });
});
