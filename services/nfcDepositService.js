'use strict';

/**
 * NFC Deposit Service
 * Handles tap-to-deposit flow with Halo Dot. paymentReference = MSISDN for Standard Bank T-PPP.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-10
 */

const { toLocal, isValidE164 } = require('../utils/msisdn');
const haloDotClient = require('./haloDotClient');
const ledgerService = require('./ledgerService');
const { NfcDepositIntent, NfcCallbackLog, Wallet, Transaction, User } = require('../models');
const { Op } = require('sequelize');

const MIN_AMOUNT = Number(process.env.NFC_DEPOSIT_MIN_AMOUNT) || 1;
const MAX_AMOUNT = Number(process.env.NFC_DEPOSIT_MAX_AMOUNT) || 5000;
const MAX_PER_HOUR = Number(process.env.NFC_DEPOSIT_MAX_PER_HOUR) || 10;
const NFC_FLOAT_CODE = process.env.LEDGER_ACCOUNT_NFC_FLOAT || '1200-10-10';
const WALLET_CLEARING_CODE = '1100-01-01';

function isEnabled() {
  return process.env.NFC_DEPOSIT_ENABLED === 'true';
}

/**
 * Create deposit intent. paymentReference = MSISDN (Standard Bank T-PPP allocation).
 */
async function createDepositIntent(userId, amount, currencyCode = 'ZAR') {
  if (!isEnabled()) {
    throw Object.assign(new Error('NFC deposit is not enabled'), { code: 'NFC_DISABLED' });
  }
  if (!haloDotClient.isConfigured()) {
    throw Object.assign(new Error('Halo Dot is not configured'), { code: 'HALO_NOT_CONFIGURED' });
  }

  const user = await User.findByPk(userId, { attributes: ['id', 'phoneNumber'] });
  if (!user || !user.phoneNumber) {
    throw Object.assign(new Error('User MSISDN not found. Phone number required for NFC deposit.'), {
      code: 'MSISDN_NOT_FOUND',
    });
  }
  if (!isValidE164(user.phoneNumber)) {
    throw Object.assign(new Error('Invalid MSISDN format. Expected South African mobile (0XXXXXXXXX or +27XXXXXXXXX).'), {
      code: 'INVALID_MSISDN',
    });
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum < MIN_AMOUNT || amountNum > MAX_AMOUNT) {
    throw Object.assign(
      new Error(`Amount must be between R${MIN_AMOUNT} and R${MAX_AMOUNT}`),
      { code: 'INVALID_AMOUNT' }
    );
  }

  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet || wallet.status !== 'active') {
    throw Object.assign(new Error('Active wallet required'), { code: 'WALLET_NOT_FOUND' });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await NfcDepositIntent.count({
    where: { userId, createdAt: { [Op.gte]: oneHourAgo } },
  });
  if (recentCount >= MAX_PER_HOUR) {
    throw Object.assign(
      new Error(`Maximum ${MAX_PER_HOUR} NFC deposits per hour. Try again later.`),
      { code: 'RATE_LIMIT_EXCEEDED' }
    );
  }

  const msisdn = toLocal(user.phoneNumber);
  const shortId = Math.random().toString(36).slice(2, 10);
  const paymentReference = `${msisdn}-NFC-${shortId}`;
  const msisdnForBank = msisdn;

  const timestamp = new Date().toISOString();
  const { consumerTransactionId, jwt } = await haloDotClient.createIntentTransaction({
    merchantId: haloDotClient.merchantId,
    paymentReference: msisdnForBank,
    amount: amountNum,
    timestamp,
    currencyCode,
  });

  const intent = await NfcDepositIntent.create({
    userId,
    walletId: wallet.walletId,
    amount: amountNum,
    currencyCode,
    paymentReference,
    consumerTransactionId,
    status: 'pending',
    haloEnv: process.env.HALO_DOT_ENV || 'qa',
  });

  return {
    intent,
    consumerTransactionId,
    jwt,
    paymentReference,
    amount: amountNum,
    currencyCode,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    deepLink: null,
  };
}

/**
 * Confirm deposit (called by app after Halo returns success). Credits wallet.
 */
async function confirmDeposit(userId, paymentReference, result) {
  if (!isEnabled()) {
    throw Object.assign(new Error('NFC deposit is not enabled'), { code: 'NFC_DISABLED' });
  }

  const intent = await NfcDepositIntent.findOne({
    where: { paymentReference, userId },
    include: [{ model: Wallet, as: 'Wallet' }],
  });

  if (!intent) {
    throw Object.assign(new Error('Deposit intent not found'), { code: 'INTENT_NOT_FOUND' });
  }
  if (intent.status === 'completed') {
    await NfcCallbackLog.create({
      paymentReference,
      status: 'duplicate',
      walletCredited: true,
    });
    return { alreadyProcessed: true, amount: Number(intent.amount) };
  }
  if (intent.status === 'failed' || intent.status === 'expired') {
    throw Object.assign(new Error('Deposit intent is no longer valid'), { code: 'INTENT_EXPIRED' });
  }

  if (result !== 'success') {
    await intent.update({ status: 'failed' });
    await NfcCallbackLog.create({
      paymentReference,
      status: 'failed',
      rawPayload: { result },
      walletCredited: false,
    });
    throw Object.assign(new Error('Payment was not successful'), { code: 'PAYMENT_FAILED' });
  }

  const amount = Number(intent.amount);
  const wallet = await Wallet.findOne({ where: { walletId: intent.walletId } });
  if (!wallet) {
    throw Object.assign(new Error('Wallet not found'), { code: 'WALLET_NOT_FOUND' });
  }

  const dbTransaction = await require('../models').sequelize.transaction();
  try {
    await wallet.credit(amount, 'credit', { transaction: dbTransaction });

    const transactionId = `NFC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await Transaction.create(
      {
        transactionId,
        userId: intent.userId,
        walletId: wallet.walletId,
        amount,
        type: 'nfc_deposit',
        status: 'completed',
        description: 'NFC tap-to-deposit',
        currency: intent.currencyCode,
        metadata: {
          paymentReference,
          consumerTransactionId: intent.consumerTransactionId,
          source: 'halo_dot',
        },
      },
      { transaction: dbTransaction }
    );

    await ledgerService.postJournalEntry({
      reference: transactionId,
      description: `NFC deposit: ${paymentReference}`,
      lines: [
        { accountCode: NFC_FLOAT_CODE, dc: 'debit', amount, memo: 'NFC acquiring float (settlement T+1)' },
        { accountCode: WALLET_CLEARING_CODE, dc: 'credit', amount, memo: 'User wallet credit' },
      ],
    });

    await intent.update(
      { status: 'completed', completedAt: new Date() },
      { transaction: dbTransaction }
    );

    await NfcCallbackLog.create(
      {
        paymentReference,
        status: 'success',
        walletCredited: true,
      },
      { transaction: dbTransaction }
    );

    await dbTransaction.commit();

    return {
      success: true,
      amount,
      transactionId,
      walletId: wallet.walletId,
    };
  } catch (err) {
    await dbTransaction.rollback();
    await NfcCallbackLog.create({
      paymentReference,
      status: 'error',
      rawPayload: { error: err.message },
      walletCredited: false,
    });
    throw err;
  }
}

/**
 * Get user's NFC deposit history.
 */
async function getDepositHistory(userId, { limit = 20, offset = 0 } = {}) {
  const { count, rows } = await NfcDepositIntent.findAndCountAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: Math.min(limit, 100),
    offset,
  });

  return {
    total: count,
    items: rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      currencyCode: r.currencyCode,
      status: r.status,
      paymentReference: r.paymentReference,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    })),
  };
}

module.exports = {
  isEnabled,
  createDepositIntent,
  confirmDeposit,
  getDepositHistory,
};
