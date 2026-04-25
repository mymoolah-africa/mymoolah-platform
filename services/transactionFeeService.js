'use strict';

const { Op } = require('sequelize');
const db = require('../models');
const {
  calculateRppFee,
  getMonthlyRppCount,
} = require('./payshapFeeService');

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function applyBounds(value, policy) {
  let fee = roundMoney(value);
  if (policy.minFee !== null && policy.minFee !== undefined) {
    fee = Math.max(fee, Number(policy.minFee));
  }
  if (policy.maxFee !== null && policy.maxFee !== undefined) {
    fee = Math.min(fee, Number(policy.maxFee));
  }
  return roundMoney(fee);
}

async function findEffectivePolicy({ transactionType, rail, channel = 'wallet', customerTier = 'all', currency = 'ZAR', asOf = new Date() }) {
  return db.TransactionFeePolicy.findOne({
    where: {
      transactionType,
      rail,
      channel,
      currency,
      status: 'active',
      customerTier: { [Op.in]: [customerTier, 'all'] },
      effectiveFrom: { [Op.lte]: asOf },
      [Op.or]: [
        { effectiveTo: null },
        { effectiveTo: { [Op.gt]: asOf } },
      ],
    },
    order: [
      ['customerTier', 'DESC'],
      ['effectiveFrom', 'DESC'],
      ['id', 'DESC'],
    ],
  });
}

function calculatePolicyFee(policy, amount) {
  const base = roundMoney(policy.fixedFee);
  const percentage = roundMoney((Number(amount) * Number(policy.percentageFeeBps || 0)) / 10000);
  return applyBounds(base + percentage, policy);
}

async function quoteWalletBankFee({ rail, amount, walletId, currency = 'ZAR', customerTier = 'all' }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const err = new Error('Amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  if (rail === 'payshap') {
    const monthlyCount = await getMonthlyRppCount(db, walletId);
    const breakdown = calculateRppFee(monthlyCount);
    const feeAmount = roundMoney(breakdown.totalUserFeeVatIncl);
    return {
      transactionType: 'wallet_bank_payment',
      rail,
      currency,
      feeAmount,
      totalDebit: roundMoney(numericAmount + feeAmount),
      policyCode: 'PAYSHAP_RPP_EXISTING_TIERED_FEE',
      feeType: 'tiered_existing_rpp',
      effectiveAt: new Date().toISOString(),
      breakdown: {
        ...breakdown,
        monthlyRppCount: monthlyCount,
      },
    };
  }

  const policy = await findEffectivePolicy({
    transactionType: 'wallet_bank_payment',
    rail,
    currency,
    customerTier,
  });

  if (!policy) {
    const err = new Error(`No active fee policy configured for ${rail}`);
    err.statusCode = 500;
    throw err;
  }

  const feeAmount = calculatePolicyFee(policy, numericAmount);
  return {
    transactionType: 'wallet_bank_payment',
    rail,
    currency,
    feeAmount,
    totalDebit: roundMoney(numericAmount + feeAmount),
    policyCode: policy.code,
    feeType: policy.feeType,
    effectiveAt: new Date().toISOString(),
    policyId: policy.id,
    breakdown: {
      fixedFee: roundMoney(policy.fixedFee),
      percentageFeeBps: Number(policy.percentageFeeBps || 0),
      minFee: policy.minFee === null ? null : roundMoney(policy.minFee),
      maxFee: policy.maxFee === null ? null : roundMoney(policy.maxFee),
    },
  };
}

module.exports = {
  quoteWalletBankFee,
  findEffectivePolicy,
};
