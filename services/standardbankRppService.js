'use strict';

/**
 * Standard Bank RPP Service - PayShap Outbound Payments
 * Validates, debits wallet, builds Pain.001, calls SBSA API
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

const db = require('../models');
const { buildPain001 } = require('../integrations/standardbank/builders/pain001Builder');
const sbClient = require('../integrations/standardbank/client');

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

  const wallet = await db.Wallet.findOne({
    where: { walletId },
    lock: db.sequelize.Transaction.LOCK.UPDATE,
  });
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const canDebit = wallet.canDebit(numAmount);
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

  const paymentInfo = pain001.cstmrCdtTrfInitn.pmtInf;
  const txInf = paymentInfo.cdtTrfTxInf[0];

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
  const transaction = await sequelize.transaction();

  try {
    await wallet.debit(numAmount, 'debit', { transaction });

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
      { transaction }
    );

    await transaction.commit();

    // Ledger posting (non-blocking) - Debit Client Float, Credit Bank (outflow from MM SBSA main account)
    try {
      const ledgerService = require('./ledgerService');
      const clientFloatCode = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
      const bankCode = process.env.LEDGER_ACCOUNT_BANK || '1100-01-01';
      await ledgerService.postJournalEntry({
        reference: `SBSA-RPP-${merchantTransactionId}`,
        description: `PayShap RPP outbound: ${merchantTransactionId}`,
        lines: [
          { accountCode: clientFloatCode, dc: 'debit', amount: numAmount, memo: 'Wallet debit (RPP)' },
          { accountCode: bankCode, dc: 'credit', amount: numAmount, memo: 'Bank outflow (RPP)' },
        ],
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
      currency,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = {
  initiateRppPayment,
};
