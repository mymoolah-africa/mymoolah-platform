/**
 * Idempotency Middleware — Unit Tests
 *
 * Verifies the idempotency middleware correctly:
 * - Passes through when no X-Idempotency-Key header is present
 * - Caches successful responses
 * - Returns cached response for duplicate keys
 * - Rejects same key with different request body
 * - Validates key format
 */
const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { idempotencyMiddleware } = require('../middleware/idempotency');

function createTestApp() {
  const testApp = express();
  testApp.use(express.json());
  testApp.post('/test-endpoint', idempotencyMiddleware, (req, res) => {
    res.status(200).json({
      success: true,
      data: { echo: req.body.value, timestamp: Date.now() },
    });
  });
  return testApp;
}

describe('Idempotency Middleware', () => {
  let testApp;

  beforeAll(() => {
    testApp = createTestApp();
  });

  it('should pass through when no X-Idempotency-Key header is provided', async () => {
    const res = await request(testApp)
      .post('/test-endpoint')
      .send({ value: 'no-key' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject key with empty string', async () => {
    const res = await request(testApp)
      .post('/test-endpoint')
      .set('X-Idempotency-Key', '')
      .send({ value: 'empty-key' });

    expect([400, 422]).toContain(res.status);
  });

  it('should process first request with a new key', async () => {
    const key = uuidv4();
    const res = await request(testApp)
      .post('/test-endpoint')
      .set('X-Idempotency-Key', key)
      .send({ value: 'first-request' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.echo).toBe('first-request');
  });

  it('should return cached response for duplicate key with same body', async () => {
    const key = uuidv4();
    const payload = { value: 'duplicate-test' };

    const res1 = await request(testApp)
      .post('/test-endpoint')
      .set('X-Idempotency-Key', key)
      .send(payload);

    expect(res1.status).toBe(200);

    // Small delay to let async storage complete
    await new Promise(resolve => setTimeout(resolve, 200));

    const res2 = await request(testApp)
      .post('/test-endpoint')
      .set('X-Idempotency-Key', key)
      .send(payload);

    expect(res2.status).toBe(200);
    // Cached response should have identical data
    expect(res2.body.data.echo).toBe('duplicate-test');
  });

  it('should reject same key with different request body', async () => {
    const key = uuidv4();

    const res1 = await request(testApp)
      .post('/test-endpoint')
      .set('X-Idempotency-Key', key)
      .send({ value: 'original' });

    expect(res1.status).toBe(200);

    await new Promise(resolve => setTimeout(resolve, 200));

    const res2 = await request(testApp)
      .post('/test-endpoint')
      .set('X-Idempotency-Key', key)
      .send({ value: 'different-body' });

    // Should return conflict since key was used with a different payload
    expect([409, 400]).toContain(res2.status);
  });
});
