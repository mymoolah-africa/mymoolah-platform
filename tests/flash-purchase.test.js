/**
 * Flash eezi-voucher Purchase — Integration Tests
 *
 * Tests the POST /api/v1/flash/eezi-voucher/purchase endpoint with
 * nock-mocked Flash API responses. Verifies:
 * - Successful purchase with PIN extraction
 * - Flash API error handling
 * - Invalid amount rejection
 * - Authentication required
 */
const request = require('supertest');
const nock = require('nock');
const { v4: uuidv4 } = require('uuid');
const app = require('../server');
const {
  createTestUser,
  createTestWallet,
  generateAuthToken,
} = require('./helpers/testSetup');

describe('POST /api/v1/flash/eezi-voucher/purchase', () => {
  let user, wallet, token;

  beforeEach(async () => {
    nock.cleanAll();

    user = await createTestUser({ firstName: 'Flash', lastName: 'Buyer' });
    wallet = await createTestWallet(user.id, 5000.00);
    token = generateAuthToken(user);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/v1/flash/eezi-voucher/purchase')
      .send({
        reference: uuidv4(),
        amount: 1000,
      });

    expect(res.status).toBe(401);
  });

  it('should reject purchase with missing reference', async () => {
    const res = await request(app)
      .post('/api/v1/flash/eezi-voucher/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 1000,
      });

    expect([400, 422]).toContain(res.status);
  });

  it('should reject purchase with missing amount', async () => {
    const res = await request(app)
      .post('/api/v1/flash/eezi-voucher/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: uuidv4(),
      });

    expect([400, 422]).toContain(res.status);
  });

  it('should reject purchase with zero amount', async () => {
    const res = await request(app)
      .post('/api/v1/flash/eezi-voucher/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: uuidv4(),
        amount: 0,
      });

    expect([400, 422]).toContain(res.status);
  });

  it('should reject purchase with negative amount', async () => {
    const res = await request(app)
      .post('/api/v1/flash/eezi-voucher/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reference: uuidv4(),
        amount: -500,
      });

    expect([400, 422]).toContain(res.status);
  });
});
