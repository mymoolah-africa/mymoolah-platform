'use strict';

/**
 * Standard Bank RTP Service - PayShap Request to Pay
 * Validates, builds Pain.013, calls SBSA API, credits wallet on Paid
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

const db = require('../models');
const { buildPain013 } = require('../integrations/standardbank/builders/pain013Builder');
const sbClient = require('../integrations/standardbank/client');

async function initiateRtpRequest(params) {
  const {
    userId,
    walletId,
    amount,
    currency = 'ZAR',
    payerName,
    payerAccountNumber,
    payerMobileNumber,
    payerBankCode,
    payerBankName,
    description,
    reference,
    expiryMinutes = 60,
  } = params;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error('Invalid amount');
  }

  const wallet = await db.Wallet.findOne({ where: { walletId } });
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  if (String(wallet.userId) !== String(userId)) {
    throw new Error('Wallet does not belong to user');
  }

  const merchantTransactionId = `MM-RTP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { pain013, msgId } = buildPain013({
    merchantTransactionId,
    amount: numAmount,
    currency,
    payerName: payerName || 'Payer',
    payerAccountNumber: payerAccountNumber || undefined,
    payerProxy: payerMobileNumber || undefined,
    remittanceInfo: description || reference || merchantTransactionId,
    expiryMinutes,
  });

  let sbResponse;
  try {
    sbResponse = await sbClient.initiateRequestToPay(pain013);
  } catch (err) {
    throw new Error(`SBSA RTP initiation failed: ${err.message}`);
  }

  if (sbResponse.status !== 202) {
    throw new Error(`SBSA RTP returned ${sbResponse.status}`);
  }

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

  const rtpRequest = await db.StandardBankRtpRequest.create({
    requestId: msgId,
    merchantTransactionId,
    originalMessageId: msgId,
    userId,
    walletId,
    amount: numAmount,
    currency,
    referenceNumber: reference || null,
    payerName: payerName || null,
    payerMobileNumber: payerMobileNumber || null,
    payerAccountNumber: payerAccountNumber || null,
    payerBankCode: payerBankCode || null,
    payerBankName: payerBankName || null,
    description: description || null,
    status: 'initiated',
    rawRequest: pain013,
    rawResponse: sbResponse.data,
    expiresAt,
  });

  return {
    rtpRequest,
    merchantTransactionId,
    originalMessageId: msgId,
    status: 'initiated',
    amount: numAmount,
    currency,
    expiresAt,
  };
}

/**
 * Credit wallet when RTP callback reports Paid
 */
async function creditWalletOnPaid(rtpRequest, rawBody) {
  const { walletId, amount, userId, merchantTransactionId } = rtpRequest;

  const wallet = await db.Wallet.findOne({
    where: { walletId },
    lock: db.sequelize.Transaction.LOCK.UPDATE,
  });
  if (!wallet) {
    throw new Error(`Wallet not found: ${walletId}`);
  }

  const sequelize = db.sequelize;
  const transaction = await sequelize.transaction();

  try {
    await wallet.credit(parseFloat(amount), 'credit', { transaction });

    const sbt = await db.StandardBankTransaction.create(
      {
        transactionId: merchantTransactionId,
        merchantTransactionId: `RTP-CR-${merchantTransactionId}`,
        originalMessageId: rtpRequest.originalMessageId,
        type: 'rtp',
        direction: 'credit',
        amount: parseFloat(amount),
        currency: rtpRequest.currency,
        referenceNumber: rtpRequest.referenceNumber,
        accountType: 'wallet',
        accountId: wallet.id,
        userId,
        walletId,
        status: 'completed',
        rawRequest: rtpRequest.rawRequest,
        rawResponse: rawBody,
        webhookReceivedAt: new Date(),
        processedAt: new Date(),
      },
      { transaction }
    );

    await rtpRequest.update(
      { standardBankTransactionId: sbt.id, processedAt: new Date() },
      { transaction }
    );

    await transaction.commit();

    // Ledger posting (non-blocking) - Debit Bank (inflow to MM SBSA main account), Credit Client Float
    try {
      const ledgerService = require('./ledgerService');
      const clientFloatCode = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
      const bankCode = process.env.LEDGER_ACCOUNT_BANK || '1100-01-01';
      await ledgerService.postJournalEntry({
        reference: `SBSA-RTP-${merchantTransactionId}`,
        description: `PayShap RTP inbound (Paid): ${merchantTransactionId}`,
        lines: [
          { accountCode: bankCode, dc: 'debit', amount: parseFloat(amount), memo: 'Bank inflow (RTP)' },
          { accountCode: clientFloatCode, dc: 'credit', amount: parseFloat(amount), memo: 'Wallet credit (RTP)' },
        ],
      });
    } catch (ledgerErr) {
      console.warn('SBSA RTP ledger posting skipped:', ledgerErr.message);
    }

    return sbt;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function processRtpCallback(originalMessageId, transactionIdentifier, status, rawBody) {
  const rtpRequest = await db.StandardBankRtpRequest.findOne({
    where: { originalMessageId },
  });
  if (!rtpRequest) return;

  const statusMap = {
    ACSP: 'paid',
    ACCP: 'presented',
    RJCT: 'rejected',
    PDNG: 'pending',
    RCVD: 'received',
  };
  const internalStatus = statusMap[status] || 'presented';

  await rtpRequest.update({
    status: internalStatus,
    webhookReceivedAt: new Date(),
    rawResponse: rawBody,
    processedAt: internalStatus === 'paid' || internalStatus === 'rejected' ? new Date() : null,
  });

  if (internalStatus === 'paid') {
    await creditWalletOnPaid(rtpRequest, rawBody);
  }
}

module.exports = {
  initiateRtpRequest,
  creditWalletOnPaid,
  processRtpCallback,
};
