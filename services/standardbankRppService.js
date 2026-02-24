'use strict';

/**
 * Standard Bank RPP Service - PayShap Outbound Payments
 *
 * Fee model (volume-based, applied per calendar month):
 *   User pays: SBSA tiered fee (VAT incl) + R1.00 MM markup (VAT incl)
 *   e.g. at 0-999 txns/month: R5.75 + R1.00 = R6.75 charged to user
 *
 * VAT accounting (all fees VAT inclusive at 15%):
 *   Output VAT  = VAT on total user charge (R6.75 / 1.15 × 0.15)
 *   Input VAT   = VAT on SBSA cost (R5.75 / 1.15 × 0.15) — reclaimable
 *   Net VAT payable to SARS = output VAT - input VAT (= VAT on R1.00 markup only)
 *   SBSA cost (ex-VAT) → LEDGER_ACCOUNT_PAYSHAP_SBSA_COST (cost of sale)
 *   MM markup (ex-VAT) → LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE
 *   Net VAT payable     → LEDGER_ACCOUNT_VAT_CONTROL
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

  // Get monthly RPP count to determine SBSA pricing tier
  const monthlyCount = await feeService.getMonthlyRppCount(db, walletId);
  const fee = feeService.calculateRppFee(monthlyCount);

  const totalDebit = Number((numAmount + fee.totalUserFeeVatIncl).toFixed(2));

  const paymentType = creditorProxy ? 'PBPX' : 'PBAC';
  const merchantTransactionId = `MM-RPP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Build Pain.001 before opening DB transaction (pure computation, no side effects)
  const { pain001, msgId, uetr } = buildPain001({
    merchantTransactionId,
    amount: numAmount,
    currency,
    paymentType,
    creditorAccountNumber: creditorAccountNumber || undefined,
    creditorProxy: creditorProxy || undefined,
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
      throw new Error(canDebit.reason || 'Insufficient funds');
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
        description: `PayShap Fee (incl. VAT)`,
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

    // VAT record — only the net VAT payable (output - input)
    // Output VAT is on the full user charge; input VAT (SBSA cost) is reclaimable
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
          outputVat: fee.totalOutputVat,
          inputVat: fee.sbsaVat,
          netVatPayable: fee.netVatPayable,
          sbsaFeeVatIncl: fee.sbsaFeeVatIncl,
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
      const sbsaCostCode = process.env.LEDGER_ACCOUNT_PAYSHAP_SBSA_COST || '5000-10-01';
      const feeRevenueCode = process.env.LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE;
      const vatControlCode = process.env.LEDGER_ACCOUNT_VAT_CONTROL;

      /*
       * Ledger entries for RPP:
       *
       * DR  Client Float     totalDebit           (wallet debit: principal + total fee)
       * CR  Bank             numAmount            (outbound payment to recipient)
       * CR  SBSA Cost        sbsaFeeExVat         (cost of sale: SBSA fee ex-VAT)
       * CR  Fee Revenue      mmMarkupExVat        (MM markup revenue ex-VAT)
       * CR  VAT Control      netVatPayable        (output VAT - input VAT = VAT on markup only)
       *
       * Proof: DR = CR
       *   totalDebit = numAmount + sbsaFeeVatIncl + mmMarkupVatIncl
       *              = numAmount + sbsaFeeExVat + sbsaVat + mmMarkupExVat + mmMarkupVat
       *   CR sum     = numAmount + sbsaFeeExVat + mmMarkupExVat + (totalOutputVat - sbsaVat)
       *              = numAmount + sbsaFeeExVat + mmMarkupExVat + totalOutputVat - sbsaVat
       *   totalOutputVat = sbsaVat + mmMarkupVat  ✓
       *   So CR = numAmount + sbsaFeeExVat + mmMarkupExVat + sbsaVat + mmMarkupVat - sbsaVat
       *         = numAmount + sbsaFeeExVat + mmMarkupExVat + mmMarkupVat
       *         = numAmount + sbsaFeeExVat + mmMarkupVatIncl  ✓ (= totalDebit)
       */
      // Build credits — use exact arithmetic to guarantee DR = CR
      // totalDebit = numAmount + sbsaFeeVatIncl + mmMarkupVatIncl
      //            = numAmount + sbsaFeeExVat + sbsaVat + mmMarkupExVat + mmMarkupVat
      // CR: Bank (numAmount) + SBSA Cost ex-VAT + MM Revenue ex-VAT + VAT Control (net)
      // Net VAT = totalOutputVat - sbsaVat = mmMarkupVat only
      // To avoid floating point drift, derive vatControlAmount as the balancing figure
      const creditsSoFar = Number((numAmount + fee.sbsaFeeExVat + fee.mmMarkupExVat).toFixed(2));
      const vatControlAmount = Number((totalDebit - creditsSoFar).toFixed(2));

      const lines = [
        { accountCode: clientFloatCode, dc: 'debit', amount: totalDebit, memo: 'Wallet debit (RPP principal + fee)' },
        { accountCode: bankLedgerCode, dc: 'credit', amount: numAmount, memo: 'Bank outflow (RPP payment)' },
        { accountCode: sbsaCostCode, dc: 'credit', amount: fee.sbsaFeeExVat, memo: `SBSA PayShap cost ex-VAT (tier: ${monthlyCount} txns)` },
      ];
      if (feeRevenueCode) {
        lines.push({ accountCode: feeRevenueCode, dc: 'credit', amount: fee.mmMarkupExVat, memo: 'MM PayShap markup revenue ex-VAT' });
      }
      if (vatControlCode) {
        lines.push({ accountCode: vatControlCode, dc: 'credit', amount: vatControlAmount, memo: 'Net VAT payable (output VAT - input VAT on SBSA cost)' });
      } else {
        // No VAT control account — absorb into SBSA cost to keep books balanced
        lines[2].amount = Number((fee.sbsaFeeExVat + vatControlAmount).toFixed(2));
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
};
