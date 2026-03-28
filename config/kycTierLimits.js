'use strict';

/**
 * KYC Tier Transaction Limits — Single Source of Truth
 *
 * Regulatory basis:
 *   Tier 0 — Conservative (no document verification, ID format-validated only)
 *   Tier 1 — FIC Exemption 17 ceiling (ID document OCR-verified, no proof of address)
 *   Tier 2 — Full FICA CDD (ID document + proof of address verified)
 *
 * All amounts in ZAR (Rand).
 */

const KYC_TIER_LIMITS = {
  0: {
    label: 'USSD Basic',
    description: 'Name + ID/passport format-validated (no document)',
    singleTransactionLimit: 1000,
    dailyLimit: 3000,
    monthlyLimit: 5000,
    maxBalance: 3000,
    canSendMoney: false,
    canWithdrawCash: false,
    canPurchaseVAS: true,
    canReceiveDeposits: true,
    canTransferInternational: false,
  },
  1: {
    label: 'ID Verified',
    description: 'ID document uploaded and OCR-validated (Exemption 17)',
    singleTransactionLimit: 5000,
    dailyLimit: 5000,
    monthlyLimit: 25000,
    maxBalance: 25000,
    canSendMoney: true,
    canWithdrawCash: true,
    canPurchaseVAS: true,
    canReceiveDeposits: true,
    canTransferInternational: false,
  },
  2: {
    label: 'Fully Verified',
    description: 'ID document + proof of address verified (Full FICA CDD)',
    singleTransactionLimit: 25000,
    dailyLimit: 50000,
    monthlyLimit: 100000,
    maxBalance: 100000,
    canSendMoney: true,
    canWithdrawCash: true,
    canPurchaseVAS: true,
    canReceiveDeposits: true,
    canTransferInternational: true,
  },
};

const DEFAULT_TIER = null;

/**
 * Returns the limits for a given KYC tier.
 * Falls back to Tier 0 (most restrictive) for null/unknown tiers.
 */
function getLimitsForTier(tier) {
  const t = tier === null || tier === undefined ? 0 : Number(tier);
  return KYC_TIER_LIMITS[t] || KYC_TIER_LIMITS[0];
}

/**
 * Returns the wallet creation defaults (dailyLimit, monthlyLimit) for a tier.
 */
function getWalletDefaults(tier) {
  const limits = getLimitsForTier(tier);
  return {
    dailyLimit: limits.dailyLimit,
    monthlyLimit: limits.monthlyLimit,
  };
}

module.exports = {
  KYC_TIER_LIMITS,
  DEFAULT_TIER,
  getLimitsForTier,
  getWalletDefaults,
};
