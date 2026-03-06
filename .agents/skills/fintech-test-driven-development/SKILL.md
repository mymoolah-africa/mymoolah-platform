---
name: fintech-test-driven-development
description: Master fintech Test-Driven Development (TDD) using Jest and Supertest. Use this skill when writing tests for financial endpoints, verifying idempotency, preventing race conditions, mocking external payment providers, and validating double-entry ledger logic.
---

# MyMoolah Fintech Test-Driven Development (TDD)

Strict testing standards for the MyMoolah Node.js/Express backend. Financial systems
require exhaustive testing to prevent money loss, double spends, and corrupted ledgers.
We use Jest for unit/integration testing and Supertest for HTTP endpoint testing.

> **Current State — CRITICAL GAP**: The `tests/` directory has only 4 test files:
> `reconciliation.test.js`, `usdc.test.js`, `tierFeeService.dev.test.js`, and
> `productPurchaseService.voucher.dev.test.js`. There are no Supertest integration
> tests for payment flows, no webhook signature tests, and no concurrency tests.
> This is the #1 priority improvement for MyMoolah's production readiness.
>
> **Test Priority Order**:
> 1. Wallet send money (idempotency + concurrency)
> 2. Flash/EasyPay webhook handlers (signature verification + ledger entries)
> 3. Airtime/Electricity purchase flows (end-to-end with mocked Flash API)
> 4. KYC submission flow
> 5. Reconciliation engine

## When This Skill Activates

- Creating or modifying financial endpoints (wallets, sending, depositing)
- Touching the double-entry accounting models (`LedgerAccount`, `JournalEntry`)
- Testing webhook handlers for external providers (EasyPay, Flash, Peach)
- Implementing idempotency keys
- Debugging race conditions or concurrency issues
- ANY new feature — every feature must ship with tests

---

## 1. Core Fintech Testing Principles

1. **Test for Idempotency**: Always send the same request twice in tests to verify the second call returns the cached response and does NOT mutate the database.
2. **Test for Concurrency (Race Conditions)**: Always send concurrent requests to endpoints that mutate balances using `Promise.all()` to verify locks or database constraints prevent double-spends.
3. **Double-Entry Validation**: Tests that move money must verify that total debits ALWAYS equal total credits across the system before and after the test.
4. **Mock External Providers**: Never hit real APIs in tests. Use `nock` or Jest manual mocks to simulate EasyPay/Flash responses, including failure states and network timeouts.
5. **Precision matters**: Always test decimal arithmetic using whole numbers (cents) or strict decimal libraries, expecting exact string matching, not floating-point approximation.

---

## 2. Testing HTTP Endpoints with Supertest

### Basic Financial Transaction Test
```javascript
// tests/integration/wallet.test.js
const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const app = require('../../server'); // Your Express app
const { User, Wallet, MyMoolahTransaction, sequelize } = require('../../models');

describe('POST /api/wallets/:id/send', () => {
  let sender, receiver, senderWallet, receiverWallet, token;

  beforeEach(async () => {
    // Setup clean database state via transactions or truncation
    await sequelize.truncate({ cascade: true });
    
    // Seed initial state
    sender = await User.create({ email: 'sender@example.com', /* ... */ });
    receiver = await User.create({ email: 'receiver@example.com', /* ... */ });
    
    senderWallet = await Wallet.create({ userId: sender.id, balance: 1000.00 });
    receiverWallet = await Wallet.create({ userId: receiver.id, balance: 0.00 });
    
    // Generate auth token (mocked or real JWT)
    token = generateTestToken(sender); 
  });

  it('should successfully transfer funds and update balances', async () => {
    const idempotencyKey = uuidv4();
    const amount = 250.00;

    const res = await request(app)
      .post(`/api/wallets/${senderWallet.id}/send`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send({ recipientId: receiverWallet.id, amount });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Verify Database State
    const updatedSenderWallet = await Wallet.findByPk(senderWallet.id);
    const updatedReceiverWallet = await Wallet.findByPk(receiverWallet.id);

    // Expect exact string matching for DECIMAL types in Sequelize
    expect(updatedSenderWallet.balance).toBe('750.00');
    expect(updatedReceiverWallet.balance).toBe('250.00');

    // Verify transaction records created
    const txCount = await MyMoolahTransaction.count({ where: { walletId: senderWallet.id } });
    expect(txCount).toBeGreaterThan(0);
  });
});
```

---

## 3. Idempotency Testing Pattern

### The "Double Submit" Test (MANDATORY)
```javascript
it('should be idempotent and not double-charge on repeated requests', async () => {
  const idempotencyKey = uuidv4();
  const payload = { recipientId: receiverWallet.id, amount: 100.00 };

  // First request - should succeed
  const res1 = await request(app)
    .post(`/api/wallets/${senderWallet.id}/send`)
    .set('Authorization', `Bearer ${token}`)
    .set('X-Idempotency-Key', idempotencyKey)
    .send(payload);

  expect(res1.status).toBe(201);

  // Second request - exact same key
  const res2 = await request(app)
    .post(`/api/wallets/${senderWallet.id}/send`)
    .set('Authorization', `Bearer ${token}`)
    .set('X-Idempotency-Key', idempotencyKey)
    .send(payload);

  // Should return 200 (cached success), NOT 201 (created) or 400 (error)
  expect(res2.status).toBe(200); 
  
  // The response body should be identical
  expect(res2.body.data.id).toBe(res1.body.data.id);

  // Database must only show ONE deduction
  const updatedSenderWallet = await Wallet.findByPk(senderWallet.id);
  expect(updatedSenderWallet.balance).toBe('900.00'); // 1000 - 100, NOT 1000 - 200
});
```

---

## 4. Concurrency & Race Condition Testing

### The "Simultaneous Requests" Test
```javascript
it('should prevent negative balances during concurrent requests (Race Condition Check)', async () => {
  const payload = { recipientId: receiverWallet.id, amount: 600.00 }; // Balance is 1000
  
  // Fire 3 requests at the EXACT same time
  // If locks/transactions fail, balance goes to -800
  const requests = Array.from({ length: 3 }).map(() => 
    request(app)
      .post(`/api/wallets/${senderWallet.id}/send`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', uuidv4()) // Different keys to bypass idempotency cache
      .send(payload)
  );

  const responses = await Promise.all(requests);
  
  // Find successful vs failed requests
  const successRes = responses.filter(r => r.status === 201);
  const failedRes = responses.filter(r => r.status === 400);

  // ONLY ONE should succeed (600 < 1000). The other two must fail (600 > 400).
  expect(successRes.length).toBe(1);
  expect(failedRes.length).toBe(2);
  
  // Check failure signature
  expect(failedRes[0].body.error).toBe('INSUFFICIENT_BALANCE');

  // Verify final database state is pristine
  const updatedSenderWallet = await Wallet.findByPk(senderWallet.id);
  expect(updatedSenderWallet.balance).toBe('400.00'); // 1000 - 600
});
```

---

## 5. Mocking External Providers (Nock)

### Testing Webhook Security & Logic
```javascript
const nock = require('nock');
const crypto = require('crypto');

describe('EasyPay Webhook Handler', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it('should process valid webhook and update ledger', async () => {
    const payload = { eventId: 'evt_123', status: 'PAID', amount: 500 };
    const rawBody = JSON.stringify(payload);
    
    // Generate valid HMAC signature
    const signature = crypto
      .createHmac('sha256', process.env.EASYPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const res = await request(app)
      .post('/api/webhooks/easypay')
      .set('x-webhook-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawBody); // Must send raw body to match HMAC

    expect(res.status).toBe(200);
    
    // Verify journal entries were created...
  });

  it('should reject invalid signature', async () => {
    const payload = { eventId: 'evt_hack', status: 'PAID', amount: 99999 };
    
    const res = await request(app)
      .post('/api/webhooks/easypay')
      .set('x-webhook-signature', 'invalid_fake_signature')
      .send(payload);

    expect(res.status).toBe(401);
  });
});
```

---

## 6. MyMoolah-Specific Test Patterns

### Flash API Mock (for Airtime/Voucher Tests)
```javascript
const nock = require('nock');

beforeEach(() => {
  nock('https://api-flashswitch-sandbox.flash-group.com')
    .post('/api/eezi-voucher/purchase')
    .reply(200, {
      status: 'success',
      pin: '176132883283',
      serialNumber: 'SN123456789',
      reference: 'FLASH-REF-001'
    });
});
```

### Double-Entry Ledger Invariant Check
```javascript
async function assertLedgerBalanced() {
  const [result] = await sequelize.query(`
    SELECT
      SUM(CASE WHEN dc = 'debit' THEN amount ELSE 0 END) AS total_debits,
      SUM(CASE WHEN dc = 'credit' THEN amount ELSE 0 END) AS total_credits
    FROM journal_lines
  `, { type: QueryTypes.SELECT });

  expect(result.total_debits).toBe(result.total_credits);
}

// Call after every financial test:
afterEach(async () => {
  await assertLedgerBalanced();
});
```

---

## 7. Financial Test Checklist
- [ ] Database is completely truncated/rolled back before `each` test.
- [ ] Explicitly tested that sending concurrent requests does not bypass balance checks.
- [ ] Explicitly tested that sending identical requests (same idempotency key) returns cached states.
- [ ] Webhook tests verify that invalid HMAC signatures are rejected.
- [ ] Third-party API calls (Flash, EasyPay, Peach) are intercepted via `nock`.
- [ ] Sequelize DECIMAL fields are asserted against Strings (e.g., `'100.00'`), not floats (`100`).
- [ ] Ledger invariant (total debits = total credits) asserted after every financial test.
- [ ] Test data uses realistic ZAR amounts (not $1 or 0.01).
- [ ] Tests run against a dedicated test database, not UAT/Staging.
