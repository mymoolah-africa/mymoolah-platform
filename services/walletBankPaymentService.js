'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const { quoteWalletBankFee } = require('./transactionFeeService');
const { estimateEftSettlement } = require('../utils/eftSettlementEstimator');
const {
  buildPain001Bulk,
  generatePain001Filename,
} = require('./standardbank/pain001BulkBuilder');
const { uploadPain001File } = require('./standardbank/sbsaSftpClientService');
const { initiateRppPayment } = require('./standardbankRppService');

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function isFeatureEnabled() {
  const explicit = String(process.env.WALLET_BANK_EFT_ENABLED || '').toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  const env = String(process.env.MM_DEPLOYMENT_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  return env !== 'production';
}

function accountTypeToPainCode(accountType) {
  const type = String(accountType || '').toLowerCase();
  if (['savings', 'svgs'].includes(type)) return 'SVGS';
  return 'CACC';
}

function last4(value) {
  return String(value || '').replace(/\D/g, '').slice(-4) || null;
}

function sanitizeReference(value) {
  return String(value || 'Wallet to bank')
    .replace(/[^a-zA-Z0-9 \-\/\.,\(\)\?\+]/g, '')
    .substring(0, 35);
}

async function getOwnedBankAccount(userId, beneficiaryAccountId) {
  const account = await db.BeneficiaryPaymentMethod.findOne({
    where: {
      id: beneficiaryAccountId,
      methodType: 'bank',
      isActive: true,
    },
    include: [{
      model: db.Beneficiary,
      as: 'beneficiary',
      required: true,
      where: { userId },
    }],
  });

  if (!account) {
    const err = new Error('Bank beneficiary account not found');
    err.statusCode = 404;
    throw err;
  }

  if (!account.accountNumber || !account.branchCode) {
    const err = new Error('Bank beneficiary account is missing account number or branch code');
    err.statusCode = 400;
    throw err;
  }

  return account;
}

async function getUserWallet(userId) {
  const wallet = await db.Wallet.findOne({ where: { userId } });
  if (!wallet) {
    const err = new Error('Wallet not found');
    err.statusCode = 404;
    throw err;
  }
  return wallet;
}

async function quoteWalletBankPayment({ userId, beneficiaryAccountId, amount, rail = 'eft' }) {
  if (!isFeatureEnabled()) {
    const err = new Error('Wallet to bank EFT is not enabled');
    err.statusCode = 403;
    throw err;
  }

  const normalizedRail = rail === 'payshap' ? 'payshap' : 'eft';
  const numericAmount = roundMoney(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const err = new Error('Amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  const [wallet, account] = await Promise.all([
    getUserWallet(userId),
    getOwnedBankAccount(userId, beneficiaryAccountId),
  ]);

  const fee = await quoteWalletBankFee({
    rail: normalizedRail,
    amount: numericAmount,
    walletId: wallet.walletId,
  });
  const settlementEstimate = normalizedRail === 'eft'
    ? estimateEftSettlement()
    : {
        estimatedReceiverAvailabilityDate: new Date().toISOString().slice(0, 10),
        message: 'Instant Payment is usually available within minutes, subject to the receiving bank.',
      };

  return {
    rail: normalizedRail,
    amount: numericAmount,
    feeAmount: fee.feeAmount,
    totalDebit: fee.totalDebit,
    currency: 'ZAR',
    fee,
    settlementEstimate,
    beneficiary: {
      id: account.id,
      name: account.beneficiary?.name || 'Beneficiary',
      bankName: account.bankName,
      accountNumberLast4: last4(account.accountNumber),
      branchCode: account.branchCode,
    },
  };
}

async function postEftLedger(payment) {
  try {
    const ledgerService = require('./ledgerService');
    const clientFloatCode = process.env.LEDGER_ACCOUNT_CLIENT_FLOAT || '2100-01-01';
    const bankLedgerCode = process.env.LEDGER_ACCOUNT_BANK || '1100-01-01';
    const feeRevenueCode = process.env.LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE;
    const vatControlCode = process.env.LEDGER_ACCOUNT_VAT_CONTROL;
    const fee = roundMoney(payment.feeAmount);
    const exVatFee = roundMoney(fee / 1.15);
    const vatAmount = roundMoney(fee - exVatFee);

    const lines = [
      { accountCode: clientFloatCode, dc: 'debit', amount: roundMoney(payment.totalDebit), memo: 'Wallet debit (EFT principal + fee)' },
      { accountCode: bankLedgerCode, dc: 'credit', amount: roundMoney(payment.amount), memo: 'Bank outflow (H2H EFT payment)' },
    ];

    if (fee > 0) {
      if (feeRevenueCode) {
        lines.push({ accountCode: feeRevenueCode, dc: 'credit', amount: exVatFee, memo: 'EFT fee revenue ex-VAT' });
        if (vatControlCode) {
          lines.push({ accountCode: vatControlCode, dc: 'credit', amount: vatAmount, memo: 'EFT fee output VAT' });
        } else {
          lines[lines.length - 1].amount = fee;
        }
      } else {
        lines.push({ accountCode: bankLedgerCode, dc: 'credit', amount: fee, memo: 'EFT fee clearing fallback' });
      }
    }

    await ledgerService.postJournalEntry({
      reference: `WALLET-BANK-EFT-${payment.paymentId}`,
      description: `Wallet to bank EFT: ${payment.paymentId}`,
      lines,
    });
  } catch (err) {
    console.warn('Wallet-bank EFT ledger posting skipped:', err.message);
  }
}

async function reverseWalletBankPayment(paymentId, reason = 'EFT reversed') {
  const txn = await db.sequelize.transaction();
  try {
    const payment = await db.WalletBankPayment.findOne({
      where: { paymentId },
      lock: db.Sequelize.Transaction.LOCK.UPDATE,
      transaction: txn,
    });
    if (!payment || payment.reversedAt) {
      await txn.rollback();
      return payment;
    }

    const wallet = await db.Wallet.findOne({
      where: { walletId: payment.walletId },
      lock: db.Sequelize.Transaction.LOCK.UPDATE,
      transaction: txn,
    });
    if (!wallet) throw new Error('Wallet not found for reversal');

    await wallet.credit(payment.totalDebit, 'credit', { transaction: txn });
    await payment.update({
      status: 'reversed',
      rejectionReason: reason,
      reversedAt: new Date(),
      processedAt: new Date(),
    }, { transaction: txn });

    await db.Transaction.create({
      transactionId: `EFT-REV-${payment.paymentId}`.substring(0, 50),
      userId: payment.userId,
      walletId: payment.walletId,
      amount: roundMoney(payment.totalDebit),
      type: 'refund',
      status: 'completed',
      description: `EFT refund: ${reason}`,
      currency: payment.currency,
      metadata: { walletBankPaymentId: payment.paymentId },
    }, { transaction: txn });

    await txn.commit();
    return payment;
  } catch (err) {
    await txn.rollback();
    throw err;
  }
}

async function submitEftPayment({ userId, beneficiaryAccountId, amount, reference }) {
  const quote = await quoteWalletBankPayment({ userId, beneficiaryAccountId, amount, rail: 'eft' });
  const account = await getOwnedBankAccount(userId, beneficiaryAccountId);
  const wallet = await getUserWallet(userId);
  const paymentId = `WB-EFT-${Date.now()}-${uuidv4().slice(0, 8)}`;
  const endToEndId = paymentId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 35);
  const runReference = `WBEFT-${Date.now()}`;
  const filename = generatePain001Filename();
  const pain001 = buildPain001Bulk({
    runReference,
    rail: 'eft',
    paymentDate: quote.settlementEstimate.requestedExecutionDate,
    payments: [{
      endToEndId,
      beneficiaryName: account.beneficiary?.name || 'Beneficiary',
      accountNumber: account.accountNumber,
      branchCode: account.branchCode,
      amount: quote.amount,
      reference: sanitizeReference(reference || `MyMoolah ${paymentId}`),
      accountType: accountTypeToPainCode(account.accountType),
    }],
  });

  const txn = await db.sequelize.transaction();
  let createdPayment;
  try {
    const lockedWallet = await db.Wallet.findOne({
      where: { walletId: wallet.walletId },
      lock: db.Sequelize.Transaction.LOCK.UPDATE,
      transaction: txn,
    });
    const canDebit = lockedWallet.canDebit(quote.totalDebit);
    if (!canDebit.allowed) {
      const err = new Error(canDebit.reason || 'Insufficient balance');
      err.statusCode = 400;
      throw err;
    }

    await lockedWallet.debit(quote.totalDebit, 'debit', { transaction: txn });
    try {
      const { releaseRestrictedFunds } = require('./restrictedFundsService');
      await releaseRestrictedFunds(lockedWallet, quote.totalDebit, paymentId, { transaction: txn });
    } catch (releaseErr) {
      console.error('[restrictedFunds] Release failed:', releaseErr.message);
    }

    const sbTransaction = await db.StandardBankTransaction.create({
      merchantTransactionId: paymentId,
      originalMessageId: pain001.msgId,
      type: 'eft',
      direction: 'debit',
      amount: quote.amount,
      currency: 'ZAR',
      referenceNumber: account.accountNumber,
      accountType: 'wallet',
      accountId: lockedWallet.id,
      userId,
      walletId: lockedWallet.walletId,
      status: 'processing',
      bankAccountNumber: account.accountNumber,
      bankCode: account.branchCode,
      bankName: account.bankName,
      description: reference || 'Wallet to bank EFT',
      rawRequest: { filename, xml: pain001.xml },
      metadata: {
        walletBankPaymentId: paymentId,
        endToEndId,
        feeSnapshot: quote.fee,
        settlementEstimate: quote.settlementEstimate,
      },
    }, { transaction: txn });

    await db.Transaction.create({
      transactionId: `EFT-${paymentId}`.substring(0, 50),
      userId,
      walletId: lockedWallet.walletId,
      amount: -quote.amount,
      type: 'payment',
      status: 'processing',
      description: reference || `EFT to ${account.beneficiary?.name || 'beneficiary'}`,
      fee: quote.feeAmount,
      currency: 'ZAR',
      metadata: { walletBankPaymentId: paymentId, standardBankTransactionId: sbTransaction.id },
    }, { transaction: txn });

    if (quote.feeAmount > 0) {
      await db.Transaction.create({
        transactionId: `EFT-FEE-${paymentId}`.substring(0, 50),
        userId,
        walletId: lockedWallet.walletId,
        amount: -quote.feeAmount,
        type: 'fee',
        status: 'completed',
        description: 'EFT fee',
        currency: 'ZAR',
        metadata: { walletBankPaymentId: paymentId, feeSnapshot: quote.fee },
      }, { transaction: txn });
    }

    createdPayment = await db.WalletBankPayment.create({
      paymentId,
      userId,
      walletId: lockedWallet.walletId,
      beneficiaryAccountId: account.id,
      rail: 'eft',
      status: 'processing',
      amount: quote.amount,
      feeAmount: quote.feeAmount,
      totalDebit: quote.totalDebit,
      currency: 'ZAR',
      bankName: account.bankName,
      accountNumberLast4: last4(account.accountNumber),
      branchCode: account.branchCode,
      reference: reference || null,
      pain001MsgId: pain001.msgId,
      endToEndId,
      pain001Filename: filename,
      standardBankTransactionId: sbTransaction.id,
      feeSnapshot: quote.fee,
      settlementEstimate: quote.settlementEstimate,
      metadata: { runReference },
    }, { transaction: txn });

    await txn.commit();
  } catch (err) {
    await txn.rollback();
    throw err;
  }

  try {
    const upload = await uploadPain001File(pain001.xml, filename);
    await createdPayment.update({
      metadata: {
        ...(createdPayment.metadata || {}),
        upload,
      },
    });
  } catch (uploadErr) {
    await reverseWalletBankPayment(paymentId, `EFT file upload failed: ${uploadErr.message}`);
    uploadErr.statusCode = 502;
    throw uploadErr;
  }

  postEftLedger(createdPayment).catch(() => {});

  return {
    paymentId,
    status: 'processing',
    rail: 'eft',
    amount: quote.amount,
    feeAmount: quote.feeAmount,
    totalDebit: quote.totalDebit,
    settlementEstimate: quote.settlementEstimate,
    pain001MsgId: pain001.msgId,
    endToEndId,
  };
}

async function submitPayshapPayment({ userId, beneficiaryAccountId, amount, reference }) {
  if (!isFeatureEnabled()) {
    const err = new Error('Wallet to bank payments are not enabled');
    err.statusCode = 403;
    throw err;
  }
  const [wallet, account] = await Promise.all([
    getUserWallet(userId),
    getOwnedBankAccount(userId, beneficiaryAccountId),
  ]);
  const quote = await quoteWalletBankPayment({ userId, beneficiaryAccountId, amount, rail: 'payshap' });

  const rpp = await initiateRppPayment({
    userId,
    walletId: wallet.walletId,
    amount: quote.amount,
    currency: 'ZAR',
    creditorAccountNumber: account.accountNumber,
    creditorBankBranchCode: account.branchCode,
    creditorName: account.beneficiary?.name || 'Beneficiary',
    bankCode: account.branchCode,
    bankName: account.bankName,
    description: reference || 'Instant Payment',
    reference,
  });

  const paymentId = `WB-RPP-${Date.now()}-${uuidv4().slice(0, 8)}`;
  await db.WalletBankPayment.create({
    paymentId,
    userId,
    walletId: wallet.walletId,
    beneficiaryAccountId: account.id,
    rail: 'payshap',
    status: 'processing',
    amount: quote.amount,
    feeAmount: rpp.fee,
    totalDebit: rpp.totalDebit,
    currency: 'ZAR',
    bankName: account.bankName,
    accountNumberLast4: last4(account.accountNumber),
    branchCode: account.branchCode,
    reference: reference || null,
    pain001MsgId: rpp.originalMessageId,
    standardBankTransactionId: rpp.standardBankTransaction.id,
    feeSnapshot: quote.fee,
    settlementEstimate: quote.settlementEstimate,
    metadata: { merchantTransactionId: rpp.merchantTransactionId },
  });

  return {
    paymentId,
    status: 'processing',
    rail: 'payshap',
    amount: quote.amount,
    feeAmount: rpp.fee,
    totalDebit: rpp.totalDebit,
    settlementEstimate: quote.settlementEstimate,
    merchantTransactionId: rpp.merchantTransactionId,
  };
}

async function processPain002Response(pain002Data) {
  const { originalMsgId, payments = [], responseType, addtlInf } = pain002Data || {};
  if (!originalMsgId) return { updated: 0, reversed: 0 };

  const candidates = await db.WalletBankPayment.findAll({
    where: { pain001MsgId: originalMsgId, rail: 'eft' },
  });
  if (candidates.length === 0) return { updated: 0, reversed: 0 };

  let updated = 0;
  let reversed = 0;
  const byEndToEndId = new Map(candidates.map((p) => [p.endToEndId, p]));

  if (responseType === 'NACK') {
    for (const payment of candidates) {
      await reverseWalletBankPayment(payment.paymentId, addtlInf || 'EFT file rejected by SBSA');
      updated++;
      reversed++;
    }
    return { updated, reversed };
  }

  for (const p of payments) {
    const payment = byEndToEndId.get(p.endToEndId);
    if (!payment) continue;
    if (p.status === 'rejected') {
      await reverseWalletBankPayment(payment.paymentId, p.rejectionReasonDetail || p.rejectionReason || 'EFT rejected by SBSA');
      reversed++;
    } else if (responseType === 'FINAUD') {
      await payment.update({ status: 'completed', processedAt: new Date() });
      await db.StandardBankTransaction.update(
        { status: 'completed', processedAt: new Date() },
        { where: { id: payment.standardBankTransactionId } }
      );
    }
    updated++;
  }

  return { updated, reversed };
}

module.exports = {
  quoteWalletBankPayment,
  submitEftPayment,
  submitPayshapPayment,
  reverseWalletBankPayment,
  processPain002Response,
  isFeatureEnabled,
};
