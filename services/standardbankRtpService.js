'use strict';

/**
 * Standard Bank RTP Service - PayShap Request to Pay
 * RTP is an administrative request to payer's bank; no money moves at initiation.
 * When Paid: credits wallet (principal - fee); fee R4.00 VAT incl deducted from receipt.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const { buildPain013 } = require('../integrations/standardbank/builders/pain013Builder');
const sbClient = require('../integrations/standardbank/client');

const VAT_RATE = Number(process.env.VAT_RATE || 0.15);
const FEE_MM_ZAR = Number(process.env.PAYSHAP_FEE_MM_ZAR || 4);

function getFeeBreakdown(feeAmount) {
  const vatAmount = Number(((feeAmount / (1 + VAT_RATE)) * VAT_RATE).toFixed(2));
  const netRevenue = Number((feeAmount - vatAmount).toFixed(2));
  return { feeAmount, vatAmount, netRevenue };
}

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
  const feeBreakdown = getFeeBreakdown(FEE_MM_ZAR);
  const netCredit = Number((numAmount - feeBreakdown.feeAmount).toFixed(2));
  if (netCredit <= 0) {
    throw new Error(`Amount must exceed fee (R${feeBreakdown.feeAmount}) - minimum request R${(feeBreakdown.feeAmount + 0.01).toFixed(2)}`);
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
 * Principal received minus MM fee (R4 VAT incl) = net credit to wallet
 */
async function creditWalletOnPaid(rtpRequest, rawBody) {
  const { walletId, amount, userId, merchantTransactionId, payerName } = rtpRequest;

  const principalAmount = parseFloat(amount);
  const feeBreakdown = getFeeBreakdown(FEE_MM_ZAR);
  const netCredit = Number((principalAmount - feeBreakdown.feeAmount).toFixed(2));

  if (netCredit <= 0) {
    throw new Error(`RTP amount ${principalAmount} too small to cover fee ${feeBreakdown.feeAmount}`);
  }

  const wallet = await db.Wallet.findOne({
    where: { walletId },
    lock: db.sequelize.Transaction.LOCK.UPDATE,
  });
  if (!wallet) {
    throw new Error(`Wallet not found: ${walletId}`);
  }

  const sequelize = db.sequelize;
  const txn = await sequelize.transaction();

  try {
    await wallet.credit(netCredit, 'credit', { transaction: txn });

    const sbt = await db.StandardBankTransaction.create(
      {
        transactionId: merchantTransactionId,
        merchantTransactionId: `RTP-CR-${merchantTransactionId}`,
        originalMessageId: rtpRequest.originalMessageId,
        type: 'rtp',
        direction: 'credit',
        amount: principalAmount,
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
      { transaction: txn }
    );

    await rtpRequest.update(
      { standardBankTransactionId: sbt.id, processedAt: new Date() },
      { transaction: txn }
    );

    await db.Transaction.create(
      {
        transactionId: `RTP-${merchantTransactionId}`,
        userId,
        walletId,
        amount: principalAmount,
        type: 'receive',
        status: 'completed',
        description: `Request to Pay from ${payerName || 'payer'}`,
        currency: rtpRequest.currency,
        metadata: { standardBankTransactionId: sbt.id, payshapType: 'rtp', principal: principalAmount },
      },
      { transaction: txn }
    );

    await db.Transaction.create(
      {
        transactionId: `RTP-FEE-${merchantTransactionId}`,
        userId,
        walletId,
        amount: -feeBreakdown.feeAmount,
        type: 'fee',
        status: 'completed',
        description: 'Transaction Fee',
        currency: rtpRequest.currency,
        metadata: { standardBankTransactionId: sbt.id, payshapType: 'rtp', feeAmount: feeBreakdown.feeAmount, feeVat: feeBreakdown.vatAmount },
      },
      { transaction: txn }
    );

    const now = new Date();
    const taxPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await db.TaxTransaction.create({
      taxTransactionId: `TAX-${uuidv4()}`,
      originalTransactionId: `RTP-FEE-${merchantTransactionId}`,
      taxCode: 'VAT_15',
      taxName: 'VAT 15%',
      taxType: 'vat',
      baseAmount: feeBreakdown.netRevenue,
      taxAmount: feeBreakdown.vatAmount,
      totalAmount: feeBreakdown.feeAmount,
      taxRate: VAT_RATE,
      calculationMethod: 'inclusive',
      businessContext: 'wallet_user',
      transactionType: 'payshap_rtp',
      entityId: String(userId),
      entityType: 'customer',
      taxPeriod,
      taxYear: now.getFullYear(),
      status: 'calculated',
      vat_direction: 'output',
      metadata: { merchantTransactionId, userId },
    }, { transaction: txn });

    await txn.commit();

    const ledgerService = require('./ledgerService');
    const clientFloatCode = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
    const bankCode = process.env.LEDGER_ACCOUNT_BANK || '1100-01-01';
    const feeRevenueCode = process.env.LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE;
    const vatControlCode = process.env.LEDGER_ACCOUNT_VAT_CONTROL;

    try {
      const lines = [
        { accountCode: bankCode, dc: 'debit', amount: principalAmount, memo: 'Bank inflow (RTP)' },
        { accountCode: clientFloatCode, dc: 'credit', amount: netCredit, memo: 'Wallet credit (RTP principal - fee)' },
      ];
      if (feeRevenueCode && vatControlCode) {
        lines.push({ accountCode: feeRevenueCode, dc: 'credit', amount: feeBreakdown.netRevenue, memo: 'PayShap fee revenue (net of VAT)' });
        lines.push({ accountCode: vatControlCode, dc: 'credit', amount: feeBreakdown.vatAmount, memo: 'VAT payable (PayShap fee)' });
      }
      await ledgerService.postJournalEntry({
        reference: `SBSA-RTP-${merchantTransactionId}`,
        description: `PayShap RTP inbound (Paid): ${merchantTransactionId}`,
        lines,
      });
    } catch (ledgerErr) {
      console.warn('SBSA RTP ledger posting skipped:', ledgerErr.message);
    }

    return sbt;
  } catch (err) {
    await txn.rollback();
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
