const test = require('node:test');
const assert = require('node:assert/strict');

const ProductPurchaseService = require('../services/productPurchaseService');

test('maskVoucherCode masks all but last 4 characters', () => {
  const svc = new ProductPurchaseService();
  const masked = svc.maskVoucherCode('VOUCHER_123456789');
  assert.equal(masked, '•••• 6789');
});

test('createVoucherEnvelope returns masked-only when key missing', () => {
  const svc = new ProductPurchaseService();
  const envelope = svc.createVoucherEnvelope('VOUCHER_ABC123', 'REF-1');
  assert.ok(envelope.maskedCode);
  assert.ok(envelope.expiresAt);
  assert.equal(envelope.algorithm, undefined);
});

test('createVoucherEnvelope encrypts when key present', () => {
  const originalKey = process.env.VOUCHER_CODE_KEY;
  process.env.VOUCHER_CODE_KEY = '12345678901234567890123456789012';

  const svc = new ProductPurchaseService();
  const envelope = svc.createVoucherEnvelope('VOUCHER_SECRET', 'REF-2');

  assert.equal(envelope.algorithm, 'aes-256-gcm');
  assert.ok(envelope.ciphertext);
  assert.ok(envelope.iv);
  assert.ok(envelope.authTag);
  assert.ok(envelope.expiresAt);

  process.env.VOUCHER_CODE_KEY = originalKey;
});

