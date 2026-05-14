'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../../models');
const ledgerService = require('../ledgerService');
const { OttClient, redact } = require('./ottClient');
const { getPayoutFeePolicy } = require('./ottCommercialTermsService');
const { isApprovedCashPayoutProvider } = require('./ottAuthorizedProviderPolicy');
const { encrypt, decrypt, checkConfiguration } = require('../../utils/fieldEncryption');

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function isEnabled() {
  return String(process.env.OTT_PAYOUT_ENABLED || '').toLowerCase() === 'true';
}

function requireEnabled() {
  if (!isEnabled()) {
    const err = new Error('OTT Payout is not enabled');
    err.statusCode = 403;
    err.code = 'OTT_PAYOUT_DISABLED';
    throw err;
  }
}

function requireApprovedCashPayoutProvider(providerCode) {
  const normalized = String(providerCode || '').trim();
  if (!isApprovedCashPayoutProvider({ providerCode: normalized })) {
    const err = new Error('This cash provider is not available for MyMoolah yet');
    err.statusCode = 400;
    err.code = 'OTT_PAYOUT_PROVIDER_NOT_APPROVED';
    throw err;
  }
  return normalized;
}

function sanitizeText(value, max = 80) {
  return String(value || '')
    .replace(/[^\w\s\-.,/()+]/g, '')
    .trim()
    .slice(0, max);
}

function normalizeIdType(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (['RSAID', 'SA_ID', 'SAID', 'NATIONAL_ID'].includes(raw)) return 'RSAID';
  if (['PASSPT', 'PASSPORT'].includes(raw)) return 'PASSPT';
  return raw;
}

function last4(value) {
  return String(value || '').replace(/\D/g, '').slice(-4) || null;
}

function maskName(firstName, surname) {
  const raw = `${firstName || ''} ${surname || ''}`.trim();
  if (!raw) return null;
  return raw
    .split(/\s+/)
    .map((part) => `${part.slice(0, 1)}***`)
    .join(' ');
}

function normalizeProviderStatus(status) {
  const raw = String(status || '').trim();
  const normalized = raw.toLowerCase();
  const numericStatus = Number(raw);
  if (raw !== '' && Number.isFinite(numericStatus)) {
    if (numericStatus === 100) return 'completed';
    if (numericStatus === 98 || numericStatus === 99) return 'processing';
    if (numericStatus <= 97) return 'failed';
  }
  if (['completed', 'success', 'successful', 'paid', 'processed', 'payment successful'].includes(normalized)) return 'completed';
  if (['failed', 'declined', 'rejected', 'error', 'failed at provider'].includes(normalized)) return 'failed';
  if (['reversed', 'refunded'].includes(normalized)) return 'reversed';
  if (['cancelled', 'canceled', 'expired'].includes(normalized)) return 'cancelled';
  if (['accepted', 'processing', 'pending', 'submitted', 'pending transaction'].includes(normalized)) return 'processing';
  return 'processing';
}

function extractProviderRefs(data = {}) {
  return {
    ottPaymentReference: data.paymentReference || data.payment_reference || data.ottPaymentReference || data.transactionId || null,
    providerTransactionReference: data.providerTransactionReference || data.provider_reference || data.providerRef || null,
    status: normalizeProviderStatus(data.status || data.Status || data.transactionStatus || data.responseStatus),
  };
}

const CASHOUT_CREDENTIAL_FIELDS = new Map([
  ['pin', 'PIN'],
  ['pinnumber', 'PIN'],
  ['voucherpin', 'PIN'],
  ['voucher_pin', 'PIN'],
  ['cashpin', 'Cash PIN'],
  ['cash_pin', 'Cash PIN'],
  ['code', 'Code'],
  ['vouchercode', 'Voucher Code'],
  ['voucher_code', 'Voucher Code'],
  ['voucherid', 'Voucher Code'],
  ['voucher_id', 'Voucher Code'],
  ['token', 'Token'],
  ['serialnumber', 'Serial Number'],
  ['serial_number', 'Serial Number'],
  ['withdrawalcode', 'Withdrawal Code'],
  ['withdrawal_code', 'Withdrawal Code'],
  ['cashsendcode', 'CashSend Code'],
  ['cash_send_code', 'CashSend Code'],
]);

function normalizeCredentialKey(key) {
  return String(key || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function maskCashoutCredential(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const visibleTail = raw.replace(/\s+/g, '').slice(-4);
  return visibleTail ? `****${visibleTail}` : '****';
}

function extractCashoutCredential(data = {}) {
  const stack = [data];
  const visited = new Set();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((item) => stack.push(item));
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      const normalizedKey = normalizeCredentialKey(key);
      const label = CASHOUT_CREDENTIAL_FIELDS.get(normalizedKey);
      if (label && typeof value === 'string' && value.trim()) {
        const rawValue = value.trim();
        const credential = {
          label,
          maskedCode: maskCashoutCredential(rawValue),
          sourceField: key,
        };
        if (checkConfiguration().encryptionKey) {
          credential.encryptedValue = encrypt(rawValue);
        }
        return credential;
      }
      if (value && typeof value === 'object') stack.push(value);
    }
  }

  return null;
}

function toSafeCashoutCredential(credential = {}) {
  if (!credential || typeof credential !== 'object') return null;
  const maskedCode = credential.maskedCode || maskCashoutCredential(credential.value);
  if (!maskedCode) return null;
  const decryptedValue = credential.encryptedValue ? decrypt(credential.encryptedValue) : credential.value;
  return {
    label: credential.label || 'Cash PIN',
    maskedCode,
    value: decryptedValue && !String(decryptedValue).startsWith('enc:v1:') ? decryptedValue : undefined,
  };
}

async function updatePayoutTransactionCredential(payment, credential) {
  if (!credential) return;
  await db.Transaction.update({
    metadata: {
      ottPayoutId: payment.payoutId,
      providerCode: payment.providerCode,
      cashoutCredential: credential,
    },
  }, {
    where: {
      reference: payment.uniqueReferenceId,
      type: 'withdraw',
    },
  });
}

function isUnknownProviderOutcome(error = {}) {
  const message = String(error.message || '').toLowerCase();
  const hasProviderResponse = error.responseData && Object.keys(error.responseData).length > 0;
  return !hasProviderResponse && (
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('socket hang up') ||
    message.includes('network') ||
    Number(error.statusCode || 0) >= 500
  );
}

function buildPayoutPayload({ payment, request }) {
  return {
    yourUniqueReference: payment.uniqueReferenceId,
    amount: roundMoney(payment.amount).toFixed(2),
    provider: {
      providerCode: String(request.providerCode || ''),
      providerName: sanitizeText(request.providerName, 80),
    },
    recipient: {
      account_name: sanitizeText(request.accountName || `${request.firstName || ''} ${request.surname || ''}`.trim(), 120),
      account_number: sanitizeText(request.accountNumber, 40),
      bank_id: sanitizeText(request.bankId || '0', 16),
      branch_name: sanitizeText(request.branchName, 80),
      branch_code: sanitizeText(request.branchCode, 16),
      country_of_issue: sanitizeText(request.countryOfIssue || 'ZA', 3),
      date_of_birth: sanitizeText(request.dateOfBirth, 20),
      email: sanitizeText(request.email, 120),
      firstname: sanitizeText(request.firstName || request.firstname, 80),
      id_number: sanitizeText(request.idNumber || request.id_number, 40),
      id_type: normalizeIdType(request.idType || request.id_type),
      middle_name: sanitizeText(request.middleName, 80),
      mobile: sanitizeText(request.mobile, 32),
      nationality: sanitizeText(request.nationality || 'ZA', 3),
      surname: sanitizeText(request.surname, 80),
      swift_code: sanitizeText(request.swiftCode, 16),
      title: sanitizeText(request.title, 20),
    },
    optionalData: {
      mmtpPayoutId: payment.payoutId,
      reference: sanitizeText(payment.reference, 80),
    },
  };
}

function validateOfficialPayoutRequest({ recipient = {} }) {
  const requiredFields = [
    ['recipient.firstName', recipient.firstName || recipient.firstname],
    ['recipient.surname', recipient.surname],
    ['recipient.mobile', recipient.mobile],
    ['recipient.idType', recipient.idType || recipient.id_type],
    ['recipient.idNumber', recipient.idNumber || recipient.id_number],
  ];
  const missing = requiredFields
    .filter(([, value]) => !String(value || '').trim())
    .map(([field]) => field);
  if (missing.length > 0) {
    const err = new Error(`OTT payout recipient details missing: ${missing.join(', ')}`);
    err.statusCode = 400;
    err.code = 'OTT_RECIPIENT_DETAILS_REQUIRED';
    err.details = missing;
    throw err;
  }
  const idType = normalizeIdType(recipient.idType || recipient.id_type);
  if (!['RSAID', 'PASSPT'].includes(idType)) {
    const err = new Error('OTT payout recipient idType must be RSAID or PASSPT');
    err.statusCode = 400;
    err.code = 'OTT_RECIPIENT_ID_TYPE_INVALID';
    throw err;
  }
}

function buildOttPayoutLedgerLines({
  amount,
  providerFeeAmount,
  mmtpFeeAmount,
  clientFloatCode = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01',
  ottFloatCode = process.env.LEDGER_ACCOUNT_OTT_FLOAT || '1200-10-08',
  feeRevenueCode = process.env.LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE || '4000-20-01',
  vatControlCode = process.env.LEDGER_ACCOUNT_VAT_CONTROL || '2300-10-01',
  vatRate = Number(process.env.VAT_RATE || 0.15),
} = {}) {
  const principal = roundMoney(amount);
  const providerFee = roundMoney(providerFeeAmount);
  const mmtpFee = roundMoney(mmtpFeeAmount);
  const totalDebit = roundMoney(principal + providerFee + mmtpFee);
  const lines = [
    { accountCode: clientFloatCode, dc: 'debit', amount: totalDebit, memo: 'OTT payout wallet debit' },
    { accountCode: ottFloatCode, dc: 'credit', amount: roundMoney(principal + providerFee), memo: 'OTT payout principal and provider pass-through fee' },
  ];

  if (mmtpFee > 0) {
    const feeExVat = roundMoney(mmtpFee / (1 + vatRate));
    const vatAmount = roundMoney(mmtpFee - feeExVat);
    lines.push({ accountCode: feeRevenueCode, dc: 'credit', amount: feeExVat, memo: 'OTT payout MMTP fee revenue ex-VAT' });
    if (vatAmount > 0) {
      lines.push({ accountCode: vatControlCode, dc: 'credit', amount: vatAmount, memo: 'OTT payout MMTP fee output VAT' });
    }
  }

  return lines;
}

function reverseLedgerLines(lines) {
  return lines.map((line) => ({
    ...line,
    dc: line.dc === 'debit' ? 'credit' : 'debit',
    memo: `REVERSAL: ${line.memo || ''}`.trim(),
  }));
}

async function syncOttSupplierFloatBalance({ context = 'ott_payout_ledger_sync' } = {}) {
  if (!db.SupplierFloat) return null;

  const ottFloatCode = process.env.LEDGER_ACCOUNT_OTT_FLOAT || '1200-10-08';
  const ledgerBalance = await ledgerService.getAccountBalanceByCode(ottFloatCode);
  if (ledgerBalance === null) return null;

  let supplierFloat = await db.SupplierFloat.findOne({
    where: {
      supplierId: 'OTT',
      ledgerAccountCode: ottFloatCode,
      status: 'active',
      isActive: true,
    },
  });

  if (!supplierFloat) {
    supplierFloat = await db.SupplierFloat.findOne({
      where: {
        ledgerAccountCode: ottFloatCode,
        status: 'active',
        isActive: true,
      },
    });
  }

  if (!supplierFloat) return null;

  await supplierFloat.update({
    currentBalance: roundMoney(ledgerBalance).toFixed(2),
    metadata: {
      ...(supplierFloat.metadata || {}),
      lastLedgerSyncAt: new Date().toISOString(),
      lastLedgerSyncSource: context,
    },
  });

  return supplierFloat;
}

async function recordSupplierFloatSyncWarning(payment, error, context) {
  console.error(`Failed to sync OTT SupplierFloat balance after ${context}:`, error.message);
  if (!payment || typeof payment.update !== 'function') return;
  await payment.update({
    metadata: {
      ...(payment.metadata || {}),
      supplierFloatSyncWarning: error.message,
      supplierFloatSyncWarningAt: new Date().toISOString(),
      supplierFloatSyncWarningSource: context,
    },
  });
}

function toSafePayout(payment) {
  if (!payment) return null;
  const plain = typeof payment.toJSON === 'function' ? payment.toJSON() : payment;
  const cashoutCredential = toSafeCashoutCredential(plain.metadata?.cashoutCredential);
  return {
    payoutId: plain.payoutId,
    uniqueReferenceId: plain.uniqueReferenceId,
    status: plain.status,
    amount: plain.amount,
    providerFeeAmount: plain.providerFeeAmount,
    mmtpFeeAmount: plain.mmtpFeeAmount,
    totalDebit: plain.totalDebit,
    currency: plain.currency,
    providerCode: plain.providerCode,
    recipientMobileLast4: plain.recipientMobileLast4,
    recipientNameMasked: plain.recipientNameMasked,
    accountNumberLast4: plain.accountNumberLast4,
    branchCode: plain.branchCode,
    reference: plain.reference,
    ottPaymentReference: plain.ottPaymentReference,
    providerTransactionReference: plain.providerTransactionReference,
    rejectionReason: plain.rejectionReason,
    cashoutCredential,
    processedAt: plain.processedAt,
    reversedAt: plain.reversedAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

async function quoteOttPayout({ amount, providerCode }) {
  requireEnabled();
  const numericAmount = roundMoney(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const err = new Error('Amount must be greater than zero');
    err.statusCode = 400;
    err.code = 'INVALID_AMOUNT';
    throw err;
  }
  if (!providerCode) {
    const err = new Error('Provider code is required');
    err.statusCode = 400;
    err.code = 'PROVIDER_REQUIRED';
    throw err;
  }
  const approvedProviderCode = requireApprovedCashPayoutProvider(providerCode);
  const feePolicy = await getPayoutFeePolicy({ providerCode: approvedProviderCode });
  return {
    amount: numericAmount,
    providerCode: approvedProviderCode,
    currency: 'ZAR',
    providerFeeAmount: feePolicy.providerFeeAmount,
    mmtpFeeAmount: feePolicy.mmtpFeeAmount,
    totalDebit: roundMoney(numericAmount + feePolicy.providerFeeAmount + feePolicy.mmtpFeeAmount),
    feePolicy,
  };
}

async function getWalletForUser(userId, transaction) {
  const wallet = await db.Wallet.findOne({
    where: { userId },
    lock: transaction ? db.Sequelize.Transaction.LOCK.UPDATE : undefined,
    transaction,
  });
  if (!wallet) {
    const err = new Error('Wallet not found');
    err.statusCode = 404;
    err.code = 'WALLET_NOT_FOUND';
    throw err;
  }
  return wallet;
}

async function postLedger(payment) {
  const lines = buildOttPayoutLedgerLines({
    amount: payment.amount,
    providerFeeAmount: payment.providerFeeAmount,
    mmtpFeeAmount: payment.mmtpFeeAmount,
  });
  const entry = await ledgerService.postJournalEntry({
    reference: `OTT-PAYOUT-${payment.payoutId}`,
    description: `OTT payout: ${payment.payoutId}`,
    lines,
  });
  await payment.update({
    metadata: {
      ...(payment.metadata || {}),
      ledgerPostedAt: new Date().toISOString(),
      ledgerReference: `OTT-PAYOUT-${payment.payoutId}`,
    },
  });
  try {
    await syncOttSupplierFloatBalance({ context: 'ott_payout_posted' });
  } catch (error) {
    await recordSupplierFloatSyncWarning(payment, error, 'ott_payout_posted');
  }
  await postPayoutFeeTaxTransaction(payment);
  if (payment.status === 'completed') {
    await markPayoutWalletTransactionCompleted(payment);
  }
  return entry;
}

async function markPayoutWalletTransactionCompleted(payment) {
  return db.Transaction.update({
    status: 'completed',
    failureReason: null,
  }, {
    where: {
      reference: payment.uniqueReferenceId,
      type: 'withdraw',
      status: ['pending', 'processing'],
    },
  });
}

async function postPayoutFeeTaxTransaction(payment) {
  const mmtpFee = roundMoney(payment.mmtpFeeAmount);
  if (!mmtpFee || mmtpFee <= 0 || !db.TaxTransaction) return null;

  const vatRate = Number(process.env.VAT_RATE || 0.15);
  const feeExVat = roundMoney(mmtpFee / (1 + vatRate));
  const vatAmount = roundMoney(mmtpFee - feeExVat);
  if (vatAmount <= 0) return null;

  const feeTransaction = await db.Transaction.findOne({
    where: {
      reference: payment.uniqueReferenceId,
      type: 'fee',
      status: 'completed',
    },
  });
  if (!feeTransaction?.transactionId) {
    await payment.update({
      metadata: {
        ...(payment.metadata || {}),
        taxWarning: 'OTT payout fee transaction not found for tax evidence',
        taxWarningAt: new Date().toISOString(),
      },
    });
    return null;
  }

  const originalTransactionId = feeTransaction.transactionId;
  const existing = await db.TaxTransaction.findOne({ where: { originalTransactionId } });
  if (existing) return existing;

  const now = new Date();
  const taxPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  try {
    return await db.TaxTransaction.create({
      taxTransactionId: `TAX-${uuidv4()}`,
      originalTransactionId,
      taxCode: 'VAT_15',
      taxName: 'VAT 15%',
      taxType: 'vat',
      baseAmount: feeExVat,
      taxAmount: vatAmount,
      totalAmount: mmtpFee,
      taxRate: vatRate,
      calculationMethod: 'inclusive',
      businessContext: 'wallet_user',
      transactionType: 'ott_payout_fee',
      entityId: 'OTT',
      entityType: 'supplier',
      taxPeriod,
      taxYear: now.getFullYear(),
      status: 'calculated',
      vatDirection: 'output',
      supplierCode: 'OTT',
      isClaimable: false,
      metadata: {
        payoutId: payment.payoutId,
        uniqueReferenceId: payment.uniqueReferenceId,
        providerCode: payment.providerCode,
        vatRate,
      },
    });
  } catch (error) {
    await payment.update({
      metadata: {
        ...(payment.metadata || {}),
        taxError: error.message,
        taxErrorAt: new Date().toISOString(),
      },
    });
    console.error('⚠️ Failed to persist OTT payout fee tax transaction:', error.message);
    return null;
  }
}

async function postReversalLedger(payment, reason) {
  if (!payment.metadata?.ledgerPostedAt) return null;
  const originalLines = buildOttPayoutLedgerLines({
    amount: payment.amount,
    providerFeeAmount: payment.providerFeeAmount,
    mmtpFeeAmount: payment.mmtpFeeAmount,
  });
  const entry = await ledgerService.postJournalEntry({
    reference: `OTT-PAYOUT-REV-${payment.payoutId}`,
    description: `OTT payout reversal: ${payment.payoutId} - ${reason}`,
    lines: reverseLedgerLines(originalLines),
  });
  await payment.update({
    metadata: {
      ...(payment.metadata || {}),
      reversalLedgerPostedAt: new Date().toISOString(),
      reversalLedgerReference: `OTT-PAYOUT-REV-${payment.payoutId}`,
    },
  });
  try {
    await syncOttSupplierFloatBalance({ context: 'ott_payout_reversed' });
  } catch (error) {
    await recordSupplierFloatSyncWarning(payment, error, 'ott_payout_reversed');
  }
  await refundPayoutFeeTaxTransaction(payment, reason);
  return entry;
}

async function refundPayoutFeeTaxTransaction(payment) {
  if (!db.TaxTransaction || !db.Transaction) return null;

  const feeTransaction = await db.Transaction.findOne({
    where: {
      reference: payment.uniqueReferenceId,
      type: 'fee',
      status: 'reversed',
    },
  });
  if (!feeTransaction?.transactionId) return null;

  return db.TaxTransaction.update({
    status: 'refunded',
  }, {
    where: {
      originalTransactionId: feeTransaction.transactionId,
      transactionType: 'ott_payout_fee',
      entityId: 'OTT',
      status: ['pending', 'calculated', 'paid', 'reported'],
    },
  });
}

async function reverseWalletDebit(payment, reason) {
  const txn = await db.sequelize.transaction();
  let committed = false;
  try {
    const wallet = await db.Wallet.findOne({
      where: { walletId: payment.walletId },
      lock: db.Sequelize.Transaction.LOCK.UPDATE,
      transaction: txn,
    });
    if (!wallet) throw new Error('Wallet not found for OTT payout reversal');
    await wallet.credit(payment.totalDebit, 'credit', { transaction: txn });
    await db.Transaction.create({
      transactionId: `OTT-REV-${payment.payoutId}`.slice(0, 50),
      userId: payment.userId,
      walletId: payment.walletId,
      amount: roundMoney(payment.totalDebit),
      type: 'refund',
      status: 'completed',
      description: `OTT payout reversal: ${reason}`,
      reference: payment.uniqueReferenceId,
      currency: payment.currency,
      metadata: { ottPayoutId: payment.payoutId, reason },
    }, { transaction: txn });
    await db.Transaction.update({
      status: 'reversed',
      failureReason: reason,
    }, {
      where: {
        reference: payment.uniqueReferenceId,
        type: ['withdraw', 'fee'],
      },
      transaction: txn,
    });
    await payment.update({
      status: 'reversed',
      rejectionReason: reason,
      reversedAt: new Date(),
      processedAt: new Date(),
    }, { transaction: txn });
    await txn.commit();
    committed = true;
  } catch (error) {
    if (!committed) await txn.rollback();
    throw error;
  }
  await postReversalLedger(payment, reason);
}

async function submitOttPayout({ userId, amount, providerCode, providerName, recipient = {}, reference, idempotencyKey }) {
  requireEnabled();
  const quote = await quoteOttPayout({ amount, providerCode });
  validateOfficialPayoutRequest({ recipient });
  const payoutId = `OTT-${Date.now()}-${uuidv4().slice(0, 8)}`;
  const uniqueReferenceId = `MM-${payoutId}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
  let payment;

  const txn = await db.sequelize.transaction();
  try {
    const wallet = await getWalletForUser(userId, txn);
    const canCashOut = wallet.canCashOut(quote.totalDebit, { kycTier: recipient.kycTier });
    if (!canCashOut.allowed) {
      const err = new Error(canCashOut.reason || 'Insufficient unrestricted balance for cash-out');
      err.statusCode = 400;
      err.code = 'WALLET_CASH_WITHDRAW_RESTRICTED';
      throw err;
    }

    await wallet.debit(quote.totalDebit, 'debit', { transaction: txn });
    payment = await db.OttPayout.create({
      payoutId,
      uniqueReferenceId,
      userId,
      walletId: wallet.walletId,
      status: 'processing',
      amount: quote.amount,
      providerFeeAmount: quote.providerFeeAmount,
      mmtpFeeAmount: quote.mmtpFeeAmount,
      totalDebit: quote.totalDebit,
      currency: quote.currency,
      providerCode,
      recipientMobileLast4: last4(recipient.mobile),
      recipientNameMasked: maskName(recipient.firstName || recipient.accountName, recipient.surname),
      accountNumberLast4: last4(recipient.accountNumber),
      branchCode: recipient.branchCode || null,
      reference: sanitizeText(reference, 80) || null,
      idempotencyKey: idempotencyKey || null,
      feeSnapshot: quote,
      metadata: { phase: 'payout_submit' },
    }, { transaction: txn });

    await db.Transaction.create({
      transactionId: `OTT-PAY-${payoutId}`.slice(0, 50),
      userId,
      walletId: wallet.walletId,
      amount: quote.amount,
      type: 'withdraw',
      status: 'processing',
      description: reference || 'OTT payout',
      reference: uniqueReferenceId,
      fee: roundMoney(quote.providerFeeAmount + quote.mmtpFeeAmount),
      currency: quote.currency,
      metadata: { ottPayoutId: payoutId, providerCode },
    }, { transaction: txn });

    if (quote.providerFeeAmount + quote.mmtpFeeAmount > 0) {
      await db.Transaction.create({
        transactionId: `OTT-FEE-${payoutId}`.slice(0, 50),
        userId,
        walletId: wallet.walletId,
        amount: -roundMoney(quote.providerFeeAmount + quote.mmtpFeeAmount),
        type: 'fee',
        status: 'completed',
        description: 'Transaction fee',
        reference: uniqueReferenceId,
        currency: quote.currency,
        metadata: {
          ottPayoutId: payoutId,
          providerFeeAmount: quote.providerFeeAmount,
          mmtpFeeAmount: quote.mmtpFeeAmount,
        },
      }, { transaction: txn });
    }

    await txn.commit();
  } catch (error) {
    await txn.rollback();
    throw error;
  }

  const client = new OttClient();
  const requestPayload = buildPayoutPayload({ payment, request: { ...recipient, providerCode, providerName } });
  let response;
  try {
    response = await client.performPayout(requestPayload);
  } catch (error) {
    if (isUnknownProviderOutcome(error)) {
      await payment.update({
        status: 'processing',
        rejectionReason: 'OTT submit outcome unknown; poll required',
        providerResponse: redact(error.responseData || {}),
        metadata: {
          ...(payment.metadata || {}),
          request: error.request || redact(requestPayload),
          submitOutcomeUnknownAt: new Date().toISOString(),
          submitOutcomeUnknownReason: error.message,
        },
      });
      return {
        payoutId,
        uniqueReferenceId,
        status: 'processing',
        amount: quote.amount,
        providerFeeAmount: quote.providerFeeAmount,
        mmtpFeeAmount: quote.mmtpFeeAmount,
        totalDebit: quote.totalDebit,
        currency: quote.currency,
        outcomeUnknown: true,
        requiresPolling: true,
      };
    }
    await reverseWalletDebit(payment, error.message);
    error.statusCode = error.statusCode || 502;
    throw error;
  }

  const refs = extractProviderRefs(response.data);
  const cashoutCredential = extractCashoutCredential(response.data);
  const nextMetadata = {
    ...(payment.metadata || {}),
    request: response.request,
    ...(cashoutCredential ? { cashoutCredential } : {}),
  };
  await payment.update({
    status: refs.status,
    ottPaymentReference: refs.ottPaymentReference,
    providerTransactionReference: refs.providerTransactionReference,
    providerResponse: redact(response.data || {}),
    processedAt: refs.status === 'completed' ? new Date() : null,
    metadata: nextMetadata,
  });
  payment.status = refs.status;
  payment.metadata = nextMetadata;
  if (cashoutCredential) {
    await updatePayoutTransactionCredential(payment, cashoutCredential);
  }

  if (['failed', 'cancelled', 'reversed'].includes(refs.status)) {
    await reverseWalletDebit(payment, response.data?.message || `OTT payout ${refs.status}`);
  } else {
    try {
      await postLedger(payment);
    } catch (error) {
      await payment.update({
        status: 'ledger_post_failed',
        rejectionReason: error.message,
        metadata: {
          ...(payment.metadata || {}),
          ledgerError: error.message,
          ledgerErrorAt: new Date().toISOString(),
        },
      });
      error.statusCode = 500;
      error.code = 'OTT_LEDGER_POST_FAILED';
      throw error;
    }
  }

  return {
    payoutId,
    uniqueReferenceId,
    status: payment.status,
    amount: quote.amount,
    providerFeeAmount: quote.providerFeeAmount,
    mmtpFeeAmount: quote.mmtpFeeAmount,
    totalDebit: quote.totalDebit,
    currency: quote.currency,
    cashoutCredential: toSafeCashoutCredential(cashoutCredential),
  };
}

async function getPayoutStatus({ userId, payoutId }) {
  const payment = await db.OttPayout.findOne({ where: { payoutId, userId } });
  if (!payment) {
    const err = new Error('OTT payout not found');
    err.statusCode = 404;
    err.code = 'OTT_PAYOUT_NOT_FOUND';
    throw err;
  }
  return toSafePayout(payment);
}

async function pollPayoutStatus({ userId, payoutId }) {
  requireEnabled();
  const paymentRecord = await db.OttPayout.findOne({ where: { payoutId, userId } });
  if (!paymentRecord) {
    const err = new Error('OTT payout not found');
    err.statusCode = 404;
    err.code = 'OTT_PAYOUT_NOT_FOUND';
    throw err;
  }
  const client = new OttClient();
  const response = await client.getPaymentStatus({
    requestdate: new Date().toISOString(),
    yourUniqueReference: paymentRecord.uniqueReferenceId,
  });
  const updateResult = await updatePayoutFromWebhook({
    ...(response.data || {}),
    yourUniqueReference: paymentRecord.uniqueReferenceId,
  });
  const refreshedPayment = await db.OttPayout.findOne({ where: { payoutId, userId } });
  const safePayout = toSafePayout(refreshedPayment || paymentRecord);
  return {
    ...safePayout,
    status: updateResult.status || safePayout.status,
    providerResponse: redact(response.data || {}),
    updateResult,
  };
}

async function updatePayoutFromWebhook(payload = {}) {
  const uniqueReferenceId = payload.uniqueReferenceId || payload.yourUniqueReference || payload.merchantUniqueReference || payload.merchant_reference;
  if (!uniqueReferenceId) {
    const err = new Error('Webhook unique reference is required');
    err.statusCode = 400;
    err.code = 'OTT_WEBHOOK_REFERENCE_REQUIRED';
    throw err;
  }

  const payment = await db.OttPayout.findOne({ where: { uniqueReferenceId } });
  if (!payment) {
    return { processed: false, reason: 'not_found' };
  }

  const eventId = payload.eventId || payload.webhookEventId || payload.transactionId || null;
  if (eventId && payment.webhookEventId === eventId) {
    return { processed: false, duplicate: true, payoutId: payment.payoutId };
  }

  const refs = extractProviderRefs(payload);
  const cashoutCredential = extractCashoutCredential(payload);
  const nextMetadata = {
    ...(payment.metadata || {}),
    ...(cashoutCredential ? { cashoutCredential } : {}),
  };
  const updates = {
    status: refs.status,
    webhookEventId: eventId,
    ottPaymentReference: refs.ottPaymentReference || payment.ottPaymentReference,
    providerTransactionReference: refs.providerTransactionReference || payment.providerTransactionReference,
    providerResponse: redact(payload),
    processedAt: refs.status === 'completed' ? new Date() : payment.processedAt,
    metadata: nextMetadata,
  };

  if (['failed', 'cancelled', 'reversed'].includes(refs.status) && !payment.reversedAt) {
    await reverseWalletDebit(payment, payload.reason || payload.message || `OTT payout ${refs.status}`);
    return { processed: true, payoutId: payment.payoutId, status: refs.status, reversed: true };
  }

  await payment.update(updates);
  payment.metadata = nextMetadata;
  if (cashoutCredential) {
    await updatePayoutTransactionCredential(payment, cashoutCredential);
  }
  if (refs.status === 'completed') {
    if (!payment.metadata?.ledgerPostedAt) {
      payment.status = refs.status;
      try {
        await postLedger(payment);
      } catch (error) {
        await payment.update({
          status: 'ledger_post_failed',
          rejectionReason: error.message,
          metadata: {
            ...(payment.metadata || {}),
            ledgerError: error.message,
            ledgerErrorAt: new Date().toISOString(),
            ledgerErrorSource: 'ott_webhook_or_poll',
          },
        });
        error.statusCode = 500;
        error.code = 'OTT_LEDGER_POST_FAILED';
        throw error;
      }
    } else {
      await markPayoutWalletTransactionCompleted(payment);
    }
  }
  return { processed: true, payoutId: payment.payoutId, status: refs.status };
}

module.exports = {
  isEnabled,
  quoteOttPayout,
  submitOttPayout,
  getPayoutStatus,
  pollPayoutStatus,
  updatePayoutFromWebhook,
  buildOttPayoutLedgerLines,
  buildPayoutPayload,
  isUnknownProviderOutcome,
  postPayoutFeeTaxTransaction,
  refundPayoutFeeTaxTransaction,
  syncOttSupplierFloatBalance,
  normalizeProviderStatus,
  toSafePayout,
  requireApprovedCashPayoutProvider,
};
