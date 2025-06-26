const request = require('supertest');
const app = require('../server'); // Adjust if your Express app is exported elsewhere

describe('Wallet API', () => {
  let createdWalletId;
  let createdAccountNumber;

  describe('POST /api/v1/wallets', () => {
    it('should create a new wallet with user_id', async () => {
      const res = await request(app)
        .post('/api/v1/wallets')
        .send({ user_id: 1 });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('wallet_id');
      expect(res.body).toHaveProperty('account_number');
      createdWalletId = res.body.wallet_id;
      createdAccountNumber = res.body.account_number;
    });

    it('should return 400 if user_id is missing', async () => {
      const res = await request(app)
        .post('/api/v1/wallets')
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for invalid user_id', async () => {
      const res = await request(app)
        .post('/api/v1/wallets')
        .send({ user_id: 'abc' });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for negative user_id', async () => {
      const res = await request(app)
        .post('/api/v1/wallets')
        .send({ user_id: -1 });
      expect(res.statusCode).toBe(400);
    });

    it('should return 409 for duplicate account_number (if not allowed)', async () => {
      const res = await request(app)
        .post('/api/v1/wallets')
        .send({ user_id: 2, account_number: 'DUPLICATE' }); // Use 'DUPLICATE' to trigger the check
      expect(res.statusCode).toBe(409);
    });
  });

  describe('GET /api/v1/wallets/:id', () => {
    it('should return wallet info (placeholder)', async () => {
      const res = await request(app)
        .get(`/api/v1/wallets/${createdWalletId || 1}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent wallet', async () => {
      const res = await request(app)
        .get('/api/v1/wallets/999999');
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid wallet id', async () => {
      const res = await request(app)
        .get('/api/v1/wallets/abc');
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/wallets/:id/balance', () => {
    it('should return wallet balance (placeholder)', async () => {
      const res = await request(app)
        .get(`/api/v1/wallets/${createdWalletId || 1}/balance`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent wallet balance', async () => {
      const res = await request(app)
        .get('/api/v1/wallets/999999/balance');
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid wallet id in balance', async () => {
      const res = await request(app)
        .get('/api/v1/wallets/abc/balance');
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/wallets/:id/credit', () => {
    it('should credit wallet (placeholder)', async () => {
      const res = await request(app)
        .post(`/api/v1/wallets/${createdWalletId || 1}/credit`)
        .send({ amount: 100 });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for crediting non-existent wallet', async () => {
      const res = await request(app)
        .post('/api/v1/wallets/999999/credit')
        .send({ amount: 100 });
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid amount (negative)', async () => {
      const res = await request(app)
        .post(`/api/v1/wallets/${createdWalletId || 1}/credit`)
        .send({ amount: -100 });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for missing amount', async () => {
      const res = await request(app)
        .post(`/api/v1/wallets/${createdWalletId || 1}/credit`)
        .send({});
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/wallets/:id/debit', () => {
    it('should debit wallet (placeholder)', async () => {
      const res = await request(app)
        .post(`/api/v1/wallets/${createdWalletId || 1}/debit`)
        .send({ amount: 50 });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for debiting non-existent wallet', async () => {
      const res = await request(app)
        .post('/api/v1/wallets/999999/debit')
        .send({ amount: 50 });
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid amount (negative)', async () => {
      const res = await request(app)
        .post(`/api/v1/wallets/${createdWalletId || 1}/debit`)
        .send({ amount: -50 });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for missing amount', async () => {
      const res = await request(app)
        .post(`/api/v1/wallets/${createdWalletId || 1}/debit`)
        .send({});
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for insufficient funds (when logic is implemented)', async () => {
      const res = await request(app)
        .post(`/api/v1/wallets/${createdWalletId || 1}/debit`)
        .send({ amount: 1000000 });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/wallets/:id/transactions', () => {
    it('should list wallet transactions (placeholder)', async () => {
      const res = await request(app)
        .get(`/api/v1/wallets/${createdWalletId || 1}/transactions`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent wallet transactions', async () => {
      const res = await request(app)
        .get('/api/v1/wallets/999999/transactions');
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid wallet id in transactions', async () => {
      const res = await request(app)
        .get('/api/v1/wallets/abc/transactions');
      expect(res.statusCode).toBe(400);
    });
  });
});