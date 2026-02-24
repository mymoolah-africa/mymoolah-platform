'use strict';

/**
 * Standard Bank RTP Service - PayShap Request to Pay
 *
 * Fee model (volume-based, applied per calendar month):
 *   User pays: SBSA tiered fee (VAT incl) — flat pass-through, no MM markup
 *   e.g. at 0-999 txns/month: R5.75 charged to user (same as SBSA charges MM)
 *   MM net revenue = R0 on RTP fees
 *
 * VAT accounting (all fees VAT inclusive at 15%):
 *   Output VAT  = VAT on SBSA fee collected from user
 *   Input VAT   = VAT on SBSA fee paid to SBSA (reclaimable)
 *   Net VAT payable to SARS = R0 (output = input, pure pass-through)
 *   SBSA cost (ex-VAT) → LEDGER_ACCOUNT_PAYSHAP_SBSA_COST (cost of sale)
 *   VAT Control = R0 net (output and input cancel)
 *
 * RTP is an administrative request to payer's bank; no money moves at initiation.
 * When Paid callback received: credit wallet (principal - SBSA fee).
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-24
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const { buildPain013 } = require('../integrations/standardbank/builders/pain013Builder');
const sbClient = require('../integrations/standardbank/client');
const feeService = require('./payshapFeeService');

async function initiateRtpRequest(params) {
  const {
    userId,
    walletId,
    amount,
    currency = 'ZAR',
    payerName,
    payerAccountNumber,
    payerBankCode,
    payerBankName,
    description,
    reference,
    expiryMinutes = 60,
  } = params;

  if (!payerAccountNumber) {
    throw new Error('payerAccountNumber is required for RTP');
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error('Invalid amount');
  }

  // Get monthly RTP count to determine SBSA pricing tier
  const monthlyCount = await feeService.getMonthlyRtpCount(db, walletId);
  const fee = feeService.calculateRtpFee(monthlyCount);

  const netCredit = Number((numAmount - fee.totalUserFeeVatIncl).toFixed(2));
  if (netCredit <= 0) {
    throw new Error(
      `Amount must exceed SBSA fee (R${fee.totalUserFeeVatIncl}) — minimum request R${(fee.totalUserFeeVatIncl + 0.01).toFixed(2)}`
    );
  }

  const wallet = await db.Wallet.findOne({ where: { walletId } });
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  if (String(wallet.userId) !== String(userId)) {
    throw new Error('Wallet does not belong to user');
  }

  const merchantTransactionId = `MM-RTP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // DbtrAgt: use 'bankc' in UAT (SBSA sandbox placeholder); in production use actual branch code
  const resolvedPayerBankCode = process.env.STANDARDBANK_ENVIRONMENT === 'uat'
    ? 'bankc'
    : (payerBankCode || 'bankc');

  const { pain013, msgId } = buildPain013({
    merchantTransactionId,
    amount: numAmount,
    currency,
    payerName: payerName || 'Payer',
    payerAccountNumber,
    payerBankCode: resolvedPayerBankCode,
    remittanceInfo: description || reference || merchantTransactionId,
    expiryMinutes,
  });

  console.log('[SBSA RTP] Pain.013 payload:', JSON.stringify(pain013, null, 2));

  let sbResponse;
  try {
    sbResponse = await sbClient.initiateRequestToPay(pain013);
  } catch (err) {
    if (err.sbsaBody) console.error('[SBSA RTP] Error body:', JSON.stringify(err.sbsaBody, null, 2));
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
    payerAccountNumber: payerAccountNumber || null,
    payerBankCode: payerBankCode || null,
    payerBankName: payerBankName || null,
    description: description || null,
    status: 'initiated',
    rawRequest: pain013,
    rawResponse: sbResponse.data,
    expiresAt,
    metadata: {
      feeBreakdown: fee,
      monthlyRtpCount: monthlyCount,
      pricingTier: `${monthlyCount}-txns`,
    },
  });

  return {
    rtpRequest,
    merchantTransactionId,
    originalMessageId: msgId,
    status: 'initiated',
    amount: numAmount,
    fee: fee.totalUserFeeVatIncl,
    feeBreakdown: fee,
    netCredit,
    currency,
    expiresAt,
  };
}

/**
 * Credit wallet when RTP callback reports Paid.
 * Principal received minus SBSA fee (VAT incl) = net credit to wallet.
 * Fee is a pure pass-through: MM collects and remits to SBSA, net revenue = R0.
 */
async function creditWalletOnPaid(rtpRequest, rawBody) {
  const { walletId, amount, userId, merchantTransactionId, payerName } = rtpRequest;

  const principalAmount = parseFloat(amount);

  // Recalculate fee using the monthly count at time of callback
  // (use stored metadata if available, else recalculate)
  let fee;
  if (rtpRequest.metadata?.feeBreakdown) {
    fee = rtpRequest.metadata.feeBreakdown;
  } else {
    const monthlyCount = await feeService.getMonthlyRtpCount(db, walletId);
    fee = feeService.calculateRtpFee(monthlyCount);
  }

  const netCredit = Number((principalAmount - fee.totalUserFeeVatIncl).toFixed(2));

  if (netCredit <= 0) {
    throw new Error(`RTP amount ${principalAmount} too small to cover SBSA fee ${fee.totalUserFeeVatIncl}`);
  }

  const sequelize = db.sequelize;
  const txn = await sequelize.transaction();

  const wallet = await db.Wallet.findOne({
    where: { walletId },
    lock: db.Sequelize.Transaction.LOCK.UPDATE,
    transaction: txn,
  });
  if (!wallet) {
    await txn.rollback();
    throw new Error(`Wallet not found: ${walletId}`);
  }

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
        metadata: { feeBreakdown: fee },
      },
      { transaction: txn }
    );

    await rtpRequest.update(
      { standardBankTransactionId: sbt.id, processedAt: new Date() },
      { transaction: txn }
    );

    // Record principal receipt
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
        metadata: {
          standardBankTransactionId: sbt.id,
          payshapType: 'rtp',
          principal: principalAmount,
        },
      },
      { transaction: txn }
    );

    // Record SBSA fee deduction (pass-through cost, no MM revenue)
    await db.Transaction.create(
      {
        transactionId: `RTP-FEE-${merchantTransactionId}`,
        userId,
        walletId,
        amount: -fee.totalUserFeeVatIncl,
        type: 'fee',
        status: 'completed',
        description: `SBSA PayShap Fee (incl. VAT)`,
        currency: rtpRequest.currency,
        metadata: {
          standardBankTransactionId: sbt.id,
          payshapType: 'rtp',
          sbsaFeeVatIncl: fee.sbsaFeeVatIncl,
          sbsaFeeExVat: fee.sbsaFeeExVat,
          sbsaVat: fee.sbsaVat,
          netVatPayable: fee.netVatPayable,
          mmNetRevenue: 0,
        },
      },
      { transaction: txn }
    );

    // VAT record — net VAT payable = R0 (pure pass-through, output = input)
    const now = new Date();
    const taxPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await db.TaxTransaction.create(
      {
        taxTransactionId: `TAX-${uuidv4()}`,
        originalTransactionId: `RTP-FEE-${merchantTransactionId}`,
        taxCode: 'VAT_15',
        taxName: 'VAT 15%',
        taxType: 'vat',
        baseAmount: fee.sbsaFeeExVat,
        taxAmount: 0,
        totalAmount: fee.sbsaFeeVatIncl,
        taxRate: 0.15,
        calculationMethod: 'inclusive',
        businessContext: 'wallet_user',
        transactionType: 'payshap_rtp',
        entityId: String(userId),
        entityType: 'customer',
        taxPeriod,
        taxYear: now.getFullYear(),
        status: 'calculated',
        vat_direction: 'output',
        metadata: {
          merchantTransactionId,
          userId,
          outputVat: fee.sbsaVat,
          inputVat: fee.sbsaVat,
          netVatPayable: 0,
          note: 'RTP is pure pass-through: output VAT = input VAT, net = R0',
        },
      },
      { transaction: txn }
    );

    await txn.commit();

    // Post ledger entry outside transaction (non-blocking)
    try {
      const ledgerService = require('./ledgerService');
      const clientFloatCode = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
      const bankLedgerCode = process.env.LEDGER_ACCOUNT_BANK || '1100-01-01';
      const sbsaCostCode = process.env.LEDGER_ACCOUNT_PAYSHAP_SBSA_COST || '5000-10-01';

      /*
       * Ledger entries for RTP (on Paid):
       *
       * DR  Bank             principalAmount      (inflow from payer's bank)
       * CR  Client Float     netCredit            (wallet credit: principal - SBSA fee)
       * CR  SBSA Cost        sbsaFeeExVat         (cost of sale: SBSA fee ex-VAT)
       * CR  VAT Control      R0                   (output = input, net zero — omitted)
       *
       * Note: VAT on SBSA fee is both output (collected) and input (paid to SBSA).
       * Net VAT impact = R0. No VAT Control entry needed.
       *
       * Proof: DR = CR
       *   principalAmount = netCredit + sbsaFeeVatIncl
       *                   = netCredit + sbsaFeeExVat + sbsaVat
       *   CR = netCredit + sbsaFeeExVat  (+ R0 VAT)
       *   Missing: sbsaVat — this is the input VAT reclaimable from SARS
       *   In practice: DR Bank = CR Float + CR SBSA Cost + CR VAT Input (reclaimable)
       *   We record the VAT as a separate input VAT entry if vatControlCode is set.
       */
      // Derive VAT as balancing figure to guarantee DR = CR regardless of rounding
      // DR Bank = CR Float + CR SBSA Cost ex-VAT + CR VAT Control (sbsaVat)
      const creditsSoFar = Number((netCredit + fee.sbsaFeeExVat).toFixed(2));
      const vatBalancing = Number((principalAmount - creditsSoFar).toFixed(2));

      const vatControlCode = process.env.LEDGER_ACCOUNT_VAT_CONTROL;
      const lines = [
        { accountCode: bankLedgerCode, dc: 'debit', amount: principalAmount, memo: 'Bank inflow (RTP paid)' },
        { accountCode: clientFloatCode, dc: 'credit', amount: netCredit, memo: 'Wallet credit (RTP principal - SBSA fee)' },
        { accountCode: sbsaCostCode, dc: 'credit', amount: fee.sbsaFeeExVat, memo: 'SBSA PayShap cost ex-VAT (pass-through)' },
      ];

      if (vatControlCode && vatBalancing > 0) {
        lines.push({
          accountCode: vatControlCode,
          dc: 'credit',
          amount: vatBalancing,
          memo: 'VAT on SBSA cost (input VAT reclaimable — net zero for RTP pass-through)',
        });
      } else if (vatBalancing > 0) {
        // Absorb into SBSA cost to keep books balanced
        lines[2].amount = Number((fee.sbsaFeeExVat + vatBalancing).toFixed(2));
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
    try { await txn.rollback(); } catch (_) { /* already rolled back */ }
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
