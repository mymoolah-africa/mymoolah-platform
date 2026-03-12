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

const BANK_BRANCH_CODES = {
  'Standard Bank': '051001', 'Standard Bank of SA': '051001',
  'ABSA Bank': '632005', 'Absa Bank Limited': '632005',
  'Capitec Bank': '470010', 'Capitec Bank Limited': '470010',
  'First National Bank (FNB)': '250655', 'First National Bank': '250655', 'FNB': '250655',
  'Nedbank': '198765', 'Nedbank Limited': '198765',
  'African Bank': '430000', 'African Bank Limited': '430000',
  'Discovery Bank': '679000', 'Discovery Bank Limited': '679000',
  'Investec Bank': '580105', 'Investec Bank Limited': '580105',
  'TymeBank': '678910', 'Tyme Bank Limited': '678910',
  'HBZ Bank': '570100', 'HBZ Bank Limited': '570100',
  'OM Bank': '352000', 'OM Bank Limited': '352000',
  'Al Baraka Bank': '800000',
  'Bidvest Bank': '462005',
  'Sasfin Bank': '683000',
  'Postbank': '460005',
  'eNL Mutual Bank': '353000',
};

function getBankCodeFromName(bankName) {
  return BANK_BRANCH_CODES[bankName] || '';
}

async function initiateRtpRequest(params) {
  const {
    userId,
    walletId,
    amount,
    currency = 'ZAR',
    payerName,
    payerMobileNumber,
    payerAccountNumber,
    payerBankCode,
    payerProxyDomain,
    payerBankName,
    description,
    reference,
    expiryMinutes = 60,
    creditorName: creditorNameOverride,
  } = params;

  if (!payerMobileNumber && !payerAccountNumber) {
    throw new Error('Either payerMobileNumber (proxy) or payerAccountNumber (PBAC) is required');
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
  // Business rule: RTP minimum R10 (covers SBSA DuePyblAmt requirement + buffer)
  const MIN_RTP_REQUEST_ZAR = 10.00;
  if (numAmount < MIN_RTP_REQUEST_ZAR) {
    throw new Error(`Minimum bank request amount is R${MIN_RTP_REQUEST_ZAR.toFixed(2)}`);
  }

  const wallet = await db.Wallet.findOne({ where: { walletId } });
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  if (String(wallet.userId) !== String(userId)) {
    throw new Error('Wallet does not belong to user');
  }

  const merchantTransactionId = `MM-RTP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // DbtrAgt differs by mode:
  //   Proxy: proxy domain (e.g. 'discoverybank') — proxy directory lookup (preferred)
  //   PBAC: branch code (e.g. '470010') — direct account routing, no proxy lookup
  //   UAT: 'bankc' (SBSA sandbox placeholder)
  const isPbacMode = !payerMobileNumber && Boolean(payerAccountNumber);
  const resolvedPayerBankCode = process.env.STANDARDBANK_ENVIRONMENT === 'uat'
    ? 'bankc'
    : isPbacMode
      ? (payerBankCode || payerProxyDomain || 'bankc')
      : (payerProxyDomain || payerBankCode || 'bankc');

  const { pain013, msgId } = buildPain013({
    merchantTransactionId,
    amount: numAmount,
    currency,
    payerName: payerName || 'Payer',
    payerMobileNumber: payerMobileNumber || undefined,
    payerAccountNumber: payerAccountNumber || undefined,
    payerBankCode: resolvedPayerBankCode,
    netAmount: netCredit,
    remittanceInfo: description || reference || merchantTransactionId,
    expiryMinutes,
    creditorName: creditorNameOverride,
  });

  const dbtrAcctId = pain013?.PmtInf?.[0]?.DbtrAcct?.Id?.Item?.Id;
  const dbtrAgtId = pain013?.PmtInf?.[0]?.DbtrAgt?.FinInstnId?.Othr?.Id;
  const hasProxy = Boolean(pain013?.PmtInf?.[0]?.DbtrAcct?.Prxy);
  console.log('[RTP] mode=%s DbtrAcct.Id.Item.Id=%s DbtrAgt=%s hasProxy=%s msgId=%s',
    isPbacMode ? 'PBAC' : 'PROXY', dbtrAcctId, dbtrAgtId, hasProxy, msgId);

  let sbResponse;
  try {
    sbResponse = await sbClient.initiateRequestToPay(pain013);
  } catch (err) {
    const wrapped = new Error(`SBSA RTP initiation failed: ${err.message}`);
    wrapped.sbsaStatus = err.sbsaStatus;
    wrapped.sbsaBody = err.sbsaBody;
    wrapped.sbsaPayloadSent = {
      mode: isPbacMode ? 'PBAC' : 'PROXY',
      dbtrAcctItemId: dbtrAcctId,
      dbtrAgtId,
      hasProxy,
    };
    throw wrapped;
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

/**
 * Extract system rejection codes from SBSA callback raw body.
 * Searches all known nesting patterns: top-level, cstmrPmtReqStsRpt, orgnlGrpInfAndSts.
 * Returns { isSystemReject, codes[] }.
 */
function extractRejectionCodes(rawBody) {
  const systemCodes = ['EBONF', 'EERRR', 'EPDNF', 'EPRBA', 'NARR'];
  const found = [];
  try {
    const rb = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    const sources = [
      rb?.orgnlPmtInfAndSts,
      rb?.OrgnlPmtInfAndSts,
      rb?.cstmrPmtReqStsRpt?.orgnlPmtReqInfAndSts,
      rb?.cstmrPmtReqStsRpt?.orgnlPmtInfAndSts,
    ].filter(Boolean);

    const grpSources = [
      rb?.orgnlGrpInfAndSts?.stsRsnInf,
      rb?.cstmrPmtReqStsRpt?.orgnlGrpInfAndSts?.stsRsnInf,
    ].filter(Boolean);

    for (const arr of sources) {
      const infList = Array.isArray(arr) ? arr : [arr];
      for (const inf of infList) {
        const stsArr = inf?.stsRsnInf || inf?.StsRsnInf || [];
        const stsList = Array.isArray(stsArr) ? stsArr : [stsArr];
        for (const s of stsList) {
          const code = s?.rsn?.prtry || s?.Rsn?.Prtry || '';
          if (code && systemCodes.includes(code) && !found.includes(code)) found.push(code);
        }
      }
    }

    for (const stsArr of grpSources) {
      const stsList = Array.isArray(stsArr) ? stsArr : [stsArr];
      for (const s of stsList) {
        const code = s?.rsn?.prtry || s?.Rsn?.Prtry || '';
        if (code && systemCodes.includes(code) && !found.includes(code)) found.push(code);
      }
    }

    if (found.length === 0 && rb && typeof rb === 'object') {
      try {
        const bodyStr = typeof JSON.stringify(rb) === 'string' ? JSON.stringify(rb) : '';
        if (bodyStr && bodyStr.length <= 500000) {
          for (const code of systemCodes) {
            if (bodyStr.includes(code) && !found.includes(code)) found.push(code);
          }
        }
      } catch (_) { /* stringify can throw on circular refs */ }
    }
  } catch (_) { /* parse failure */ }
  return { isSystemReject: found.length > 0, codes: found };
}

/**
 * Retry a failed proxy-based RTP as PBAC (account-only).
 * Builds a new Pain.013 using the payer's bank account number directly,
 * sends to SBSA, and creates a linked retry record.
 */
async function retryRtpAsPbac(originalRtp) {
  const { userId, walletId, payerAccountNumber, payerBankCode, payerBankName, payerName } = originalRtp;
  const amount = parseFloat(originalRtp.amount);

  if (!payerAccountNumber) {
    console.warn('[RTP-RETRY-PBAC] Cannot retry — no payerAccountNumber on record');
    return null;
  }

  // For PBAC, DbtrAgt must be the branch code (e.g. '470010'), NOT the proxy domain ('capitec').
  // The original RTP used proxy domain for DbtrAgt; for PBAC retry we need the branch code.
  let resolvedBankCode;
  if (process.env.STANDARDBANK_ENVIRONMENT === 'uat') {
    resolvedBankCode = 'bankc';
  } else {
    const branchCodeFromName = payerBankName ? getBankCodeFromName(payerBankName) : '';
    const looksLikeBranchCode = payerBankCode && /^\d{4,6}$/.test(payerBankCode);
    resolvedBankCode = looksLikeBranchCode
      ? payerBankCode
      : (branchCodeFromName || payerBankCode || 'bankc');
  }

  const retryMerchantTxId = `${originalRtp.merchantTransactionId}-PBAC`;

  const fee = originalRtp.metadata?.feeBreakdown || feeService.calculateRtpFee(0);
  const netCredit = Number((amount - fee.totalUserFeeVatIncl).toFixed(2));

  const { pain013, msgId } = buildPain013({
    merchantTransactionId: retryMerchantTxId,
    amount,
    currency: originalRtp.currency || 'ZAR',
    payerName: payerName || 'Payer',
    payerMobileNumber: undefined,
    payerAccountNumber,
    payerBankCode: resolvedBankCode,
    netAmount: netCredit,
    remittanceInfo: originalRtp.description || originalRtp.referenceNumber || retryMerchantTxId,
    expiryMinutes: 60,
  });

  console.log('[RTP-RETRY-PBAC] Retrying orgnlMsgId=%s as PBAC → DbtrAcct=%s DbtrAgt=%s bank=%s newMsgId=%s',
    originalRtp.originalMessageId, payerAccountNumber, resolvedBankCode, payerBankName || 'unknown', msgId);

  let sbResponse;
  try {
    sbResponse = await sbClient.initiateRequestToPay(pain013);
  } catch (err) {
    console.error('[RTP-RETRY-PBAC] SBSA call failed: %s', err.message);
    return null;
  }

  if (sbResponse.status !== 202) {
    console.error('[RTP-RETRY-PBAC] SBSA returned %s', sbResponse.status);
    return null;
  }

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 60);

  const retryRtp = await db.StandardBankRtpRequest.create({
    requestId: msgId,
    merchantTransactionId: retryMerchantTxId,
    originalMessageId: msgId,
    userId,
    walletId,
    amount,
    currency: originalRtp.currency || 'ZAR',
    referenceNumber: originalRtp.referenceNumber,
    payerName,
    payerMobileNumber: originalRtp.payerMobileNumber,
    payerAccountNumber,
    payerBankCode: payerBankCode || null,
    payerBankName: payerBankName || null,
    description: originalRtp.description,
    status: 'initiated',
    rawRequest: pain013,
    rawResponse: sbResponse.data,
    expiresAt,
    metadata: {
      ...(originalRtp.metadata || {}),
      retryOf: originalRtp.originalMessageId,
      retryMode: 'PBAC',
      retryAttempt: 1,
      originalProxyMsgId: originalRtp.originalMessageId,
    },
  });

  console.log('[RTP-RETRY-PBAC] Retry record created: newMsgId=%s retryOf=%s',
    msgId, originalRtp.originalMessageId);
  return retryRtp;
}

async function processRtpCallback(originalMessageId, transactionIdentifier, status, rawBody) {
  const rtpRequest = await db.StandardBankRtpRequest.findOne({
    where: { originalMessageId },
  });
  if (!rtpRequest) {
    console.warn('[RTP-CB] No RTP request found for orgnlMsgId=%s status=%s', originalMessageId, status);
    return;
  }
  console.log('[RTP-CB] orgnlMsgId=%s status=%s payer=%s amount=%s',
    originalMessageId, status, rtpRequest.payerMobileNumber, rtpRequest.amount);

  const statusMap = {
    ACSP: 'paid',
    ACWC: 'paid',
    ACCC: 'paid',
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

  // ── Paid ──────────────────────────────────────────────────────────────
  if (internalStatus === 'paid') {
    await creditWalletOnPaid(rtpRequest, rawBody);
    console.log('[RTP-CB] Wallet credited for orgnlMsgId=%s payer=%s', originalMessageId, rtpRequest.payerMobileNumber);
    try {
      const notificationService = require('./notificationService');
      const amount = parseFloat(rtpRequest.amount);
      const payerName = rtpRequest.payerName || 'Payer';
      await notificationService.createNotification(
        rtpRequest.userId,
        'txn_wallet_credit',
        'Payment Received',
        `${payerName} paid your Request to Pay of R ${amount.toFixed(2)}. Your wallet has been credited.`,
        {
          payload: {
            rtpRequestId: rtpRequest.id,
            merchantTransactionId: rtpRequest.merchantTransactionId,
            amount,
            currency: rtpRequest.currency || 'ZAR',
            payerName,
            subtype: 'payshap_rtp_paid',
            reason: 'balance_refresh',
          },
          severity: 'info',
          category: 'transaction',
        }
      );
    } catch (notifErr) {
      console.warn('Non-fatal: failed to send RTP paid notification:', notifErr.message);
    }
    return;
  }

  // ── Rejection / decline / expiry / cancel ─────────────────────────────
  if (!['rejected', 'expired', 'cancelled', 'declined'].includes(internalStatus)) return;

  const { isSystemReject, codes } = extractRejectionCodes(rawBody);
  const alreadyRetried = Boolean(rtpRequest.metadata?.retryMode);
  const isRetryTarget = Boolean(rtpRequest.metadata?.retryOf);

  console.log('[RTP-CB-REJECT] orgnlMsgId=%s status=%s isSystemReject=%s codes=[%s] hasMobile=%s hasAccount=%s isRetryTarget=%s alreadyRetried=%s',
    originalMessageId, internalStatus, isSystemReject, codes.join(','),
    Boolean(rtpRequest.payerMobileNumber), Boolean(rtpRequest.payerAccountNumber),
    isRetryTarget, alreadyRetried);

  const canRetryPbac = isSystemReject
    && rtpRequest.payerMobileNumber
    && rtpRequest.payerAccountNumber
    && !isRetryTarget
    && !alreadyRetried;

  if (canRetryPbac) {
    console.log('[RTP-CB] Proxy rejected (%s) — attempting PBAC fallback for orgnlMsgId=%s acct=%s bank=%s',
      codes.join(','), originalMessageId, rtpRequest.payerAccountNumber, rtpRequest.payerBankName || 'unknown');

    await rtpRequest.update({
      status: 'retry_pbac',
      metadata: { ...(rtpRequest.metadata || {}), proxyRejectCodes: codes, retryMode: 'PBAC_PENDING' },
    });

    // Run PBAC retry in background to avoid blocking callback response (SBSA expects quick 200).
    // Timeout 25s prevents indefinite hang; on failure we update record and notify user.
    // Reload by id to avoid stale Sequelize instance across async boundary.
    const PBAC_RETRY_TIMEOUT_MS = 25000;
    const rtpId = rtpRequest.id;

    const runRetryWithTimeout = async () => {
      let originalRtp;
      try {
        originalRtp = await db.StandardBankRtpRequest.findByPk(rtpId);
      } catch (e) {
        console.error('[RTP-CB] Failed to reload RTP for PBAC retry: %s', e.message);
        return;
      }
      if (!originalRtp) {
        console.warn('[RTP-CB] RTP %s not found for PBAC retry', rtpId);
        return;
      }
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PBAC retry timed out after 25s')), PBAC_RETRY_TIMEOUT_MS));
      try {
        const retryResult = await Promise.race([
          retryRtpAsPbac(originalRtp),
          timeoutPromise,
        ]);
        if (retryResult) {
          const r = await db.StandardBankRtpRequest.findByPk(rtpId);
          if (r) {
            await r.update({
              metadata: {
                ...(r.metadata || {}),
                retryMode: 'PBAC_SENT',
                retryMsgId: retryResult.originalMessageId,
                retryAt: new Date().toISOString(),
              },
            });
          }
          return;
        }
      } catch (retryErr) {
        console.error('[RTP-CB] PBAC fallback failed: %s', retryErr.message);
      }
      const r = await db.StandardBankRtpRequest.findByPk(rtpId);
      if (r) {
        await r.update({
          status: 'rejected',
          metadata: { ...(r.metadata || {}), retryMode: 'PBAC_FAILED' },
        });
        try {
          const notificationService = require('./notificationService');
          const amount = parseFloat(r.amount);
          const payerName = r.payerName || 'Payer';
          await notificationService.createNotification(
            r.userId,
            'txn_wallet_credit',
            'Payment Request Could Not Be Delivered',
            `Your PayShap request for R ${amount.toFixed(2)} could not be delivered to ${payerName}. The payer may not have PayShap enabled.`,
            {
              payload: {
                rtpRequestId: r.id,
                merchantTransactionId: r.merchantTransactionId,
                amount,
                currency: r.currency || 'ZAR',
                payerName,
                subtype: 'payshap_rtp_rejected',
              },
              severity: 'info',
              category: 'transaction',
            }
          );
        } catch (notifErr) {
          console.warn('Non-fatal: failed to send PBAC-failure notification:', notifErr.message);
        }
      }
    };

    setImmediate(() => {
      runRetryWithTimeout().catch((err) =>
        console.error('[RTP-CB] Background PBAC retry error: %s', err.message));
    });
    return;
  }

  // Send notification to user (only reaches here if no retry or retry failed)
  try {
    const notificationService = require('./notificationService');
    const amount = parseFloat(rtpRequest.amount);
    const payerName = rtpRequest.payerName || 'Payer';

    const isFinalSystemReject = isSystemReject || isRetryTarget;

    const titleMap = {
      rejected: isFinalSystemReject ? 'Payment Request Could Not Be Delivered' : 'Payment Request Declined',
      declined: isFinalSystemReject ? 'Payment Request Could Not Be Delivered' : 'Payment Request Declined',
      expired: 'Payment Request Expired',
      cancelled: 'Payment Request Cancelled',
    };
    const msgMap = {
      rejected: isFinalSystemReject
        ? `Your PayShap request for R ${amount.toFixed(2)} could not be delivered to ${payerName}. The payer may not have PayShap enabled.`
        : `${payerName} declined your PayShap request for R ${amount.toFixed(2)}`,
      declined: isFinalSystemReject
        ? `Your PayShap request for R ${amount.toFixed(2)} could not be delivered to ${payerName}. The payer may not have PayShap enabled.`
        : `${payerName} declined your PayShap request for R ${amount.toFixed(2)}`,
      expired: `Your PayShap request for R ${amount.toFixed(2)} to ${payerName} has expired`,
      cancelled: `Your PayShap request for R ${amount.toFixed(2)} to ${payerName} was cancelled`,
    };

    await notificationService.createNotification(
      rtpRequest.userId,
      'txn_wallet_credit',
      titleMap[internalStatus],
      msgMap[internalStatus],
      {
        payload: {
          rtpRequestId: rtpRequest.id,
          merchantTransactionId: rtpRequest.merchantTransactionId,
          amount,
          currency: rtpRequest.currency || 'ZAR',
          payerName,
          payerMobileNumber: rtpRequest.payerMobileNumber,
          subtype: `payshap_rtp_${internalStatus}`,
        },
        severity: 'info',
        category: 'transaction',
      }
    );
  } catch (notifErr) {
    console.warn('Non-fatal: failed to send RTP status notification:', notifErr.message);
  }
}

module.exports = {
  initiateRtpRequest,
  creditWalletOnPaid,
  processRtpCallback,
  retryRtpAsPbac,
};
