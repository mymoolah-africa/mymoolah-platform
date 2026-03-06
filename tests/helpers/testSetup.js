/**
 * Test Setup Helpers
 * Shared utilities for MyMoolah integration tests.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, User, Wallet } = require('../../models');

const TEST_PASSWORD = 'TestPassword123!';
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);

let userCounter = 0;

function generateUniquePhone() {
  userCounter++;
  const suffix = String(userCounter).padStart(8, '0');
  return `+2768${suffix}`;
}

async function createTestUser(overrides = {}) {
  const phone = generateUniquePhone();
  const user = await User.create({
    email: `testuser${userCounter}@mymoolah.test`,
    password_hash: TEST_PASSWORD_HASH,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || `User${userCounter}`,
    phoneNumber: phone,
    kycStatus: overrides.kycStatus || 'verified',
    ...overrides,
  });
  return user;
}

async function createTestWallet(userId, balance = 1000.00) {
  const wallet = await Wallet.create({
    userId,
    walletId: `WAL-TEST-${Date.now()}-${userId}`,
    balance,
    currency: 'ZAR',
    dailyLimit: 50000,
    monthlyLimit: 200000,
    dailySpent: 0,
    monthlySpent: 0,
  });
  return wallet;
}

function generateAuthToken(user) {
  return jwt.sign(
    { id: user.id, userId: user.id, email: user.email, role: user.role || 'user' },
    process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'test-jwt-secret-for-testing-only',
    { expiresIn: '1h' }
  );
}

async function assertLedgerBalanced() {
  const { QueryTypes } = require('sequelize');
  const [result] = await sequelize.query(`
    SELECT
      COALESCE(SUM(CASE WHEN dc = 'debit' THEN amount ELSE 0 END), 0) AS total_debits,
      COALESCE(SUM(CASE WHEN dc = 'credit' THEN amount ELSE 0 END), 0) AS total_credits
    FROM journal_lines
  `, { type: QueryTypes.SELECT });

  const debits = parseFloat(result.total_debits || 0);
  const credits = parseFloat(result.total_credits || 0);

  if (Math.abs(debits - credits) > 0.001) {
    throw new Error(`LEDGER IMBALANCED: debits=${debits}, credits=${credits}, diff=${debits - credits}`);
  }
  return { debits, credits };
}

module.exports = {
  TEST_PASSWORD,
  TEST_PASSWORD_HASH,
  createTestUser,
  createTestWallet,
  generateAuthToken,
  generateUniquePhone,
  assertLedgerBalanced,
  sequelize,
};
