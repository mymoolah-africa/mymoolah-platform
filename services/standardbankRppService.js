'use strict';

/**
 * Standard Bank RPP Service - PayShap Outbound Payments
 *
 * Fee model (volume-based, applied per calendar month):
 *   User pays: SBSA tiered fee (VAT incl) + R1.00 MM markup (VAT incl)
 *   e.g. at 0-999 txns/month: R5.75 + R1.00 = R6.75 charged to user
 *
 * VAT accounting (all fees VAT inclusive at 15%):
 *   SBSA fee is a throughput/pass-through amount collected from the user and payable to SBSA.
 *   MMTP VAT control only records VAT on MMTP's own R1.00 markup.
 *   SBSA fee (VAT incl) → LEDGER_ACCOUNT_PAYSHAP_SBSA_CLEARING / supplier clearing
 *   MM markup (ex-VAT)  → LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE
 *   MM markup VAT       → LEDGER_ACCOUNT_VAT_CONTROL
 *
 * ACID ordering: lock wallet → validate balance → call SBSA → debit + record → commit
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-24
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const { buildPain001 } = require('../integrations/standardbank/builders/pain001Builder');
const sbClient = require('../integrations/standardbank/client');
const feeService = require('./payshapFeeService');

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function formatRand(value) {
  return `R${roundMoney(value).toFixed(2)}`;
}

function createInsufficientBalanceError({ wallet, requestedAmount, fee, totalDebit }) {
  const availableBalance = roundMoney(wallet.balance);
  const instantPaymentFee = roundMoney(fee.sbsaFeeVatIncl);
  const totalUserFee = roundMoney(fee.totalUserFeeVatIncl);
  const maximumPaymentAmount = roundMoney(Math.max(availableBalance - totalUserFee, 0));
  const message = totalUserFee > instantPaymentFee
    ? `Insufficient balance. Instant Payment bank fee is ${formatRand(instantPaymentFee)} and total fee is ${formatRand(totalUserFee)}. You can send up to ${formatRand(maximumPaymentAmount)} with your current balance.`
    : `Insufficient balance. Instant Payment fee is ${formatRand(instantPaymentFee)}. You can send up to ${formatRand(maximumPaymentAmount)} with your current balance.`;

  const err = new Error(message);
  err.statusCode = 400;
  err.code = 'INSUFFICIENT_BALANCE';
  err.details = {
    availableBalance,
    requestedAmount: roundMoney(requestedAmount),
    instantPaymentFee,
    totalUserFee,
    totalDebit: roundMoney(totalDebit),
    maximumPaymentAmount,
    currency: 'ZAR',
  };
  return err;
}

function buildRppLedgerLines({
  numAmount,
  totalDebit,
  fee,
  monthlyCount,
  clientFloatCode,
  bankLedgerCode,
  sbsaClearingCode,
  feeRevenueCode,
  vatControlCode,
}) {
  const lines = [
    { accountCode: clientFloatCode, dc: 'debit', amount: totalDebit, memo: 'Wallet debit (RPP principal + fees)' },
    { accountCode: bankLedgerCode, dc: 'credit', amount: numAmount, memo: 'Bank outflow (RPP principal to beneficiary)' },
    { accountCode: sbsaClearingCode, dc: 'credit', amount: fee.sbsaFeeVatIncl, memo: `SBSA PayShap fee payable (pass-through, tier: ${monthlyCount} txns)` },
  ];

  if (feeRevenueCode && fee.mmMarkupExVat > 0) {
    lines.push({ accountCode: feeRevenueCode, dc: 'credit', amount: fee.mmMarkupExVat, memo: 'MM PayShap markup revenue ex-VAT' });
  }

  if (vatControlCode && fee.mmMarkupVat > 0) {
    lines.push({ accountCode: vatControlCode, dc: 'credit', amount: fee.mmMarkupVat, memo: 'VAT payable on MM PayShap markup' });
  } else if (fee.mmMarkupVat > 0 && feeRevenueCode) {
    // No VAT control account configured: keep the entry balanced without losing the user fee.
    const revenueLine = lines.find(line => line.accountCode === feeRevenueCode && line.memo === 'MM PayShap markup revenue ex-VAT');
    if (revenueLine) {
      revenueLine.amount = Number((revenueLine.amount + fee.mmMarkupVat).toFixed(2));
      revenueLine.memo = 'MM PayShap markup revenue VAT-inclusive fallback';
    }
  }

  const creditTotal = lines
    .filter(line => line.dc === 'credit')
    .reduce((sum, line) => sum + Number(line.amount), 0);
  const balancingDelta = Number((totalDebit - creditTotal).toFixed(2));
  if (Math.abs(balancingDelta) >= 0.01) {
    lines[2].amount = Number((lines[2].amount + balancingDelta).toFixed(2));
  }

  return lines;
}

async function initiateRppPayment(params) {
  const {
    userId,
    walletId,
    amount,
    currency = 'ZAR',
    creditorAccountNumber,
    creditorBankBranchCode,
    creditorName,
    bankCode,
    bankName,
    description,
    reference,
  } = params;

  if (!creditorAccountNumber) {
    throw new Error('creditorAccountNumber is required for RPP');
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error('Invalid amount');
  }

  // Get monthly RPP count to determine SBSA pricing tier
  const monthlyCount = await feeService.getMonthlyRppCount(db, walletId);
  const fee = feeService.calculateRppFee(monthlyCount);

  const totalDebit = Number((numAmount + fee.totalUserFeeVatIncl).toFixed(2));

  const merchantTransactionId = `MM-RPP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Build Pain.001 before opening DB transaction (pure computation, no side effects)
  const { pain001, msgId, uetr } = buildPain001({
    merchantTransactionId,
    amount: numAmount,
    currency,
    creditorAccountNumber,
    creditorBankBranchCode: creditorBankBranchCode || undefined,
    creditorName: creditorName || 'Beneficiary',
    remittanceInfo: description || reference || merchantTransactionId,
    statementNarrative: description || reference,
  });

  const sequelize = db.sequelize;
  const txn = await sequelize.transaction();

  try {
    // Lock wallet row for update within transaction
    const wallet = await db.Wallet.findOne({
      where: { walletId },
      lock: db.Sequelize.Transaction.LOCK.UPDATE,
      transaction: txn,
    });
    if (!wallet) {
      await txn.rollback();
      throw new Error('Wallet not found');
    }
    if (String(wallet.userId) !== String(userId)) {
      await txn.rollback();
      throw new Error('Wallet does not belong to user');
    }

    const canDebit = wallet.canDebit(totalDebit);
    if (!canDebit.allowed) {
      await txn.rollback();
      if ((canDebit.reason || '').toLowerCase().includes('insufficient balance')) {
        throw createInsufficientBalanceError({
          wallet,
          requestedAmount: numAmount,
          fee,
          totalDebit,
        });
      }
      const err = new Error(canDebit.reason || 'Insufficient funds');
      err.statusCode = 400;
      err.code = 'WALLET_DEBIT_NOT_ALLOWED';
      throw err;
    }

    // Call SBSA API while holding the lock (prevents double-spend)
    let sbResponse;
    try {
      sbResponse = await sbClient.initiatePayment(pain001);
    } catch (sbErr) {
      await txn.rollback();
      throw new Error(`SBSA RPP initiation failed: ${sbErr.message}`);
    }

    if (sbResponse.status !== 202) {
      await txn.rollback();
      throw new Error(`SBSA RPP returned unexpected status ${sbResponse.status}`);
    }

    // Debit wallet (principal + total fee)
    await wallet.debit(totalDebit, 'debit', { transaction: txn });
    try {
      const { releaseRestrictedFunds } = require('./restrictedFundsService');
      await releaseRestrictedFunds(wallet, totalDebit, merchantTransactionId, { transaction: txn });
    } catch (releaseErr) {
      console.error('[restrictedFunds] Release failed:', releaseErr.message);
    }

    // Record SBSA transaction
    const sbt = await db.StandardBankTransaction.create(
      {
        transactionId: uetr,
        merchantTransactionId,
        originalMessageId: msgId,
        type: 'rpp',
        direction: 'debit',
        amount: numAmount,
        currency,
        referenceNumber: creditorAccountNumber,
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
        metadata: {
          feeBreakdown: fee,
          monthlyRppCount: monthlyCount,
          pricingTier: `${monthlyCount}-txns`,
        },
      },
      { transaction: txn }
    );

    // Record principal transaction
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
        metadata: {
          standardBankTransactionId: sbt.id,
          payshapType: 'rpp',
          principal: numAmount,
        },
      },
      { transaction: txn }
    );

    // Record fee transaction (total user fee = SBSA fee + MM markup, VAT incl)
    await db.Transaction.create(
      {
        transactionId: `RPP-FEE-${merchantTransactionId}`,
        userId,
        walletId,
        amount: -fee.totalUserFeeVatIncl,
        type: 'fee',
        status: 'completed',
        description: `PayShap Fee`,
        currency,
        metadata: {
          standardBankTransactionId: sbt.id,
          payshapType: 'rpp',
          sbsaFeeVatIncl: fee.sbsaFeeVatIncl,
          sbsaFeeExVat: fee.sbsaFeeExVat,
          sbsaVat: fee.sbsaVat,
          mmMarkupVatIncl: fee.mmMarkupVatIncl,
          mmMarkupExVat: fee.mmMarkupExVat,
          mmMarkupVat: fee.mmMarkupVat,
          totalUserFeeVatIncl: fee.totalUserFeeVatIncl,
          totalOutputVat: fee.totalOutputVat,
          netVatPayable: fee.netVatPayable,
        },
      },
      { transaction: txn }
    );

    // VAT record — only MMTP markup VAT. SBSA fee VAT is pass-through and informational.
    const now = new Date();
    const taxPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await db.TaxTransaction.create(
      {
        taxTransactionId: `TAX-${uuidv4()}`,
        originalTransactionId: `RPP-FEE-${merchantTransactionId}`,
        taxCode: 'VAT_15',
        taxName: 'VAT 15%',
        taxType: 'vat',
        baseAmount: fee.mmMarkupExVat,
        taxAmount: fee.netVatPayable,
        totalAmount: fee.mmMarkupVatIncl,
        taxRate: 0.15,
        calculationMethod: 'inclusive',
        businessContext: 'wallet_user',
        transactionType: 'payshap_rpp',
        entityId: String(userId),
        entityType: 'customer',
        taxPeriod,
        taxYear: now.getFullYear(),
        status: 'calculated',
        vat_direction: 'output',
        metadata: {
          merchantTransactionId,
          userId,
          outputVat: fee.mmMarkupVat,
          inputVat: 0,
          netVatPayable: fee.netVatPayable,
          sbsaFeeVatIncl: fee.sbsaFeeVatIncl,
          sbsaVatPassThrough: fee.sbsaVat,
          mmMarkupVatIncl: fee.mmMarkupVatIncl,
        },
      },
      { transaction: txn }
    );

    await txn.commit();

    // Post ledger entry outside transaction (non-blocking, warn on failure)
    try {
      const ledgerService = require('./ledgerService');
      const clientFloatCode = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
      const bankLedgerCode = process.env.LEDGER_ACCOUNT_BANK || '1100-01-01';
      const sbsaClearingCode = process.env.LEDGER_ACCOUNT_PAYSHAP_SBSA_CLEARING || process.env.LEDGER_ACCOUNT_SUPPLIER_CLEARING || '2200-02-01';
      const feeRevenueCode = process.env.LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE || '4000-20-01';
      const vatControlCode = process.env.LEDGER_ACCOUNT_VAT_CONTROL || '2300-10-01';

      /*
       * Ledger entries for RPP:
       *
       * DR  Client Float     totalDebit           (wallet debit: principal + total fee)
       * CR  Bank             numAmount            (outbound payment to recipient)
       * CR  SBSA Clearing    sbsaFeeVatIncl       (SBSA fee pass-through payable)
       * CR  Fee Revenue      mmMarkupExVat        (MM markup revenue ex-VAT)
       * CR  VAT Control      mmMarkupVat          (VAT on MM markup only)
       *
       * Proof: DR = CR
       *   totalDebit = numAmount + sbsaFeeVatIncl + mmMarkupVatIncl
       *   CR sum     = numAmount + sbsaFeeVatIncl + mmMarkupExVat + mmMarkupVat
       *              = numAmount + sbsaFeeVatIncl + mmMarkupVatIncl
       */
      const lines = buildRppLedgerLines({
        numAmount,
        totalDebit,
        fee,
        monthlyCount,
        clientFloatCode,
        bankLedgerCode,
        sbsaClearingCode,
        feeRevenueCode,
        vatControlCode,
      });

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
      fee: fee.totalUserFeeVatIncl,
      feeBreakdown: fee,
      totalDebit,
      currency,
    };
  } catch (err) {
    try { await txn.rollback(); } catch (_) { /* already rolled back */ }
    throw err;
  }
}

module.exports = {
  initiateRppPayment,
  createInsufficientBalanceError,
  buildRppLedgerLines,
};
