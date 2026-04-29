const crypto = require('crypto');
const { buildRequestHash, redact } = require('../services/ott/ottClient');

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

  it('fails closed when endpoint hash order is missing', () => {
    expect(() => buildRequestHash({ amount: '10.00' }, [], 'key')).toThrow('hash parameter order');
  });

  it('redacts credentials and PII-like fields before logging', () => {
    const redacted = redact({
      accountNumber: '1234567890',
      mobile: '+27825571055',
      provider_providerCode: 'NEDBANK',
      nested: { apiKey: 'secret-value' },
    });

    expect(redacted.provider_providerCode).toBe('NEDBANK');
    expect(redacted.accountNumber).toBe('12***90');
    expect(redacted.mobile).toBe('+2***55');
    expect(redacted.nested.apiKey).toBe('se***ue');
  });
});
