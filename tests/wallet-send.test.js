/**
 * Wallet Send Money — Integration Tests
 *
 * Tests the POST /api/v1/wallets/send endpoint for:
 * - Successful transfer with balance updates
 * - Insufficient balance rejection
 * - Idempotency (double-submit with same key)
 * - Concurrency (race condition protection)
 * - Invalid input handling
 */
const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const app = require('../server');
const {
  createTestUser,
  createTestWallet,
  generateAuthToken,
  assertLedgerBalanced,
  sequelize,
} = require('./helpers/testSetup');
const { Wallet } = require('../models');

describe('POST /api/v1/wallets/send', () => {
  let sender, receiver, senderWallet, receiverWallet, senderToken;

  beforeEach(async () => {
    sender = await createTestUser({ firstName: 'Sender' });
    receiver = await createTestUser({ firstName: 'Receiver' });

    senderWallet = await createTestWallet(sender.id, 1000.00);
    receiverWallet = await createTestWallet(receiver.id, 0.00);

    senderToken = generateAuthToken(sender);
  });

  it('should successfully transfer funds and update both balances', async () => {
    const res = await request(app)
      .post('/api/v1/wallets/send')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('X-Idempotency-Key', uuidv4())
      .send({
        receiverPhoneNumber: receiver.phoneNumber,
        amount: 250.00,
        description: 'Test transfer',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedSender = await Wallet.findByPk(senderWallet.id);
    const updatedReceiver = await Wallet.findByPk(receiverWallet.id);

    expect(parseFloat(updatedSender.balance)).toBe(750.00);
    expect(parseFloat(updatedReceiver.balance)).toBe(250.00);
  });

  it('should reject transfer when sender has insufficient balance', async () => {
    const res = await request(app)
      .post('/api/v1/wallets/send')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('X-Idempotency-Key', uuidv4())
      .send({
        receiverPhoneNumber: receiver.phoneNumber,
        amount: 5000.00,
        description: 'Too much',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const updatedSender = await Wallet.findByPk(senderWallet.id);
    expect(parseFloat(updatedSender.balance)).toBe(1000.00);
  });

  it('should reject transfer with missing receiver phone', async () => {
    const res = await request(app)
      .post('/api/v1/wallets/send')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('X-Idempotency-Key', uuidv4())
      .send({
        amount: 100.00,
      });

    expect([400, 422]).toContain(res.status);
  });

  it('should reject transfer with negative amount', async () => {
    const res = await request(app)
      .post('/api/v1/wallets/send')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('X-Idempotency-Key', uuidv4())
      .send({
        receiverPhoneNumber: receiver.phoneNumber,
        amount: -100.00,
      });

    expect([400, 422]).toContain(res.status);
  });

  it('should reject transfer to non-existent phone number', async () => {
    const res = await request(app)
      .post('/api/v1/wallets/send')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('X-Idempotency-Key', uuidv4())
      .send({
        receiverPhoneNumber: '+27699999999',
        amount: 50.00,
      });

    expect(res.status).toBe(404);
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/v1/wallets/send')
      .send({
        receiverPhoneNumber: receiver.phoneNumber,
        amount: 50.00,
      });

    expect(res.status).toBe(401);
  });

  it('should be idempotent — double submit returns same result without double charge', async () => {
    const idempotencyKey = uuidv4();
    const payload = {
      receiverPhoneNumber: receiver.phoneNumber,
      amount: 100.00,
      description: 'Idempotent test',
    };

    const res1 = await request(app)
      .post('/api/v1/wallets/send')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .post('/api/v1/wallets/send')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload);

    // Second request should return cached response (200), not create another debit
    expect(res2.status).toBe(200);

    const updatedSender = await Wallet.findByPk(senderWallet.id);
    // Balance should be 900 (1000 - 100), NOT 800 (double charged)
    expect(parseFloat(updatedSender.balance)).toBe(900.00);
  });

  it('should prevent negative balance during concurrent requests', async () => {
    // Sender has 1000. Fire 3 x R600 simultaneously.
    // Only 1 should succeed (600 < 1000). Others should fail (600 > 400).
    const payload = {
      receiverPhoneNumber: receiver.phoneNumber,
      amount: 600.00,
    };

    const requests = Array.from({ length: 3 }).map(() =>
      request(app)
        .post('/api/v1/wallets/send')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('X-Idempotency-Key', uuidv4())
        .send(payload)
    );

    const responses = await Promise.all(requests);

    const successResponses = responses.filter(r => r.status === 200);
    const failedResponses = responses.filter(r => r.status === 400);

    // At least 1 should succeed, the rest should fail with insufficient balance
    expect(successResponses.length).toBeGreaterThanOrEqual(1);

    const finalSender = await Wallet.findByPk(senderWallet.id);
    const finalBalance = parseFloat(finalSender.balance);

    // Balance must never go negative
    expect(finalBalance).toBeGreaterThanOrEqual(0);
  });
});

describe('Ledger Invariant', () => {
  it('total debits should equal total credits across all journal lines', async () => {
    const { debits, credits } = await assertLedgerBalanced();
    expect(debits).toBe(credits);
  });
});
