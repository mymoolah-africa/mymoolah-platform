'use strict';

/**
 * Standard Bank RPP Service - PayShap Outbound Payments
 * Validates, debits wallet (principal + fee), builds Pain.001, calls SBSA API
 * Fee: R4.00 VAT incl charged to user; principal only sent to recipient
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const { buildPain001 } = require('../integrations/standardbank/builders/pain001Builder');
const sbClient = require('../integrations/standardbank/client');

const VAT_RATE = Number(process.env.VAT_RATE || 0.15);
const FEE_MM_ZAR = Number(process.env.PAYSHAP_FEE_MM_ZAR || 4);

function getFeeBreakdown(feeAmount) {
  const vatAmount = Number(((feeAmount / (1 + VAT_RATE)) * VAT_RATE).toFixed(2));
  const netRevenue = Number((feeAmount - vatAmount).toFixed(2));
  return { feeAmount, vatAmount, netRevenue };
}

async function initiateRppPayment(params) {
  const {
    userId,
    walletId,
    amount,
    currency = 'ZAR',
    creditorAccountNumber,
    creditorProxy,
    creditorName,
    bankCode,
    bankName,
    description,
    reference,
  } = params;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error('Invalid amount');
  }

  const feeBreakdown = getFeeBreakdown(FEE_MM_ZAR);
  const totalDebit = Number((numAmount + feeBreakdown.feeAmount).toFixed(2));

  const wallet = await db.Wallet.findOne({
    where: { walletId },
    lock: db.sequelize.Transaction.LOCK.UPDATE,
  });
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const canDebit = wallet.canDebit(totalDebit);
  if (!canDebit.allowed) {
    throw new Error(canDebit.reason || 'Cannot debit wallet');
  }

  const paymentType = creditorProxy ? 'PBPX' : 'PBAC';
  const merchantTransactionId = `MM-RPP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { pain001, msgId, uetr } = buildPain001({
    merchantTransactionId,
    amount: numAmount,
    currency,
    paymentType,
    creditorAccountNumber: creditorAccountNumber || undefined,
    creditorProxy: creditorProxy || undefined,
    creditorName: creditorName || 'Beneficiary',
    remittanceInfo: description || reference || merchantTransactionId,
  });

  let sbResponse;
  try {
    sbResponse = await sbClient.initiatePayment(pain001);
  } catch (err) {
    throw new Error(`SBSA RPP initiation failed: ${err.message}`);
  }

  if (sbResponse.status !== 202) {
    throw new Error(`SBSA RPP returned ${sbResponse.status}`);
  }

  const sequelize = db.sequelize;
  const txn = await sequelize.transaction();

  try {
    await wallet.debit(totalDebit, 'debit', { transaction: txn });

    const sbt = await db.StandardBankTransaction.create(
      {
        transactionId: uetr,
        merchantTransactionId,
        originalMessageId: msgId,
        type: 'rpp',
        direction: 'debit',
        amount: numAmount,
        currency,
        referenceNumber: creditorProxy || creditorAccountNumber,
        accountType: 'wallet',
        accountId: wallet.id,
        userId,
        walletId,
        status: 'initiated',
        bankAccountNumber: creditorAccountNumber || null,
        bankCode: bankCode || null,
        bankName: bankName || null,
        description: description || null,
        rawRequest: pain001,
        rawResponse: sbResponse.data,
      },
      { transaction: txn }
    );

    await db.Transaction.create(
      {
        transactionId: `RPP-${merchantTransactionId}`,
        userId,
        walletId,
        amount: -numAmount,
        type: 'payment',
        status: 'completed',
        description: description || `PayShap to ${creditorName || 'beneficiary'}`,
        currency,
        metadata: { standardBankTransactionId: sbt.id, payshapType: 'rpp', principal: numAmount },
      },
      { transaction: txn }
    );

    await db.Transaction.create(
      {
        transactionId: `RPP-FEE-${merchantTransactionId}`,
        userId,
        walletId,
        amount: -feeBreakdown.feeAmount,
        type: 'fee',
        status: 'completed',
        description: 'Transaction Fee',
        currency,
        metadata: { standardBankTransactionId: sbt.id, payshapType: 'rpp', feeAmount: feeBreakdown.feeAmount, feeVat: feeBreakdown.vatAmount },
      },
      { transaction: txn }
    );

    const now = new Date();
    const taxPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await db.TaxTransaction.create({
      taxTransactionId: `TAX-${uuidv4()}`,
      originalTransactionId: `RPP-FEE-${merchantTransactionId}`,
      taxCode: 'VAT_15',
      taxName: 'VAT 15%',
      taxType: 'vat',
      baseAmount: feeBreakdown.netRevenue,
      taxAmount: feeBreakdown.vatAmount,
      totalAmount: feeBreakdown.feeAmount,
      taxRate: VAT_RATE,
      calculationMethod: 'inclusive',
      businessContext: 'wallet_user',
      transactionType: 'payshap_rpp',
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
        { accountCode: clientFloatCode, dc: 'debit', amount: totalDebit, memo: 'Wallet debit (RPP principal + fee)' },
        { accountCode: bankCode, dc: 'credit', amount: numAmount, memo: 'Bank outflow (RPP)' },
      ];
      if (feeRevenueCode && vatControlCode) {
        lines.push({ accountCode: feeRevenueCode, dc: 'credit', amount: feeBreakdown.netRevenue, memo: 'PayShap fee revenue (net of VAT)' });
        lines.push({ accountCode: vatControlCode, dc: 'credit', amount: feeBreakdown.vatAmount, memo: 'VAT payable (PayShap fee)' });
      }
      await ledgerService.postJournalEntry({
        reference: `SBSA-RPP-${merchantTransactionId}`,
        description: `PayShap RPP outbound: ${merchantTransactionId}`,
        lines,
      });
    } catch (ledgerErr) {
      console.warn('SBSA RPP ledger posting skipped:', ledgerErr.message);
    }

    return {
      standardBankTransaction: sbt,
      merchantTransactionId,
      originalMessageId: msgId,
      status: 'initiated',
      amount: numAmount,
      fee: feeBreakdown.feeAmount,
      totalDebit,
      currency,
    };
  } catch (err) {
    await txn.rollback();
    throw err;
  }
}

module.exports = {
  initiateRppPayment,
};
