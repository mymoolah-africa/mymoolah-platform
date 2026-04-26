'use strict';

/**
 * PayShap Fee Service - Volume-Based Tiered Pricing
 *
 * SBSA pricing (VAT inclusive, per transaction, applied SEPARATELY for RPP and RTP):
 *   0 – 999 txns/month:      R5.75
 *   1,000 – 9,999 txns/month: R4.75
 *   10,000 – 49,999 txns/month: R4.00
 *   50,000+:                  Negotiated (env override required)
 *
 * Proxy Validation without Payment: R1.25 (VAT incl)
 *
 * MyMoolah markup:
 *   RPP (outbound): SBSA fee + R1.00 markup (both VAT incl) → charged to user
 *   RTP (request to pay): SBSA fee only (flat pass-through, no markup) → charged to user
 *
 * VAT rate: 15% (South Africa)
 * All fees are VAT INCLUSIVE — VAT is extracted from the inclusive amount.
 *
 * Ledger accounting:
 *   RPP:
 *     DR  Client Float (wallet debit)        = sbsaFee + mmMarkup (total user charge)
 *     CR  Bank (beneficiary outflow)         = principal amount
 *     CR  SBSA Fee Clearing / Payable        = sbsaFeeVatIncl [pass-through]
 *     CR  Transaction Fee Revenue            = mmMarkupExVat [net markup revenue]
 *     CR  VAT Control                        = mmMarkupVat
 *
 *   RTP (on Paid callback):
 *     DR  Bank (inflow from payer)           = principal
 *     CR  Client Float (wallet credit)       = principal - sbsaFee
 *     CR  SBSA Fee Clearing / Payable        = sbsaFeeVatIncl [pass-through]
 *     No VAT Control / TaxTransaction because MMTP earns no RTP markup.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-24
 */

const VAT_RATE = 0.15;

// SBSA tiered pricing tiers (VAT inclusive, per transaction)
// Tiers apply separately to RPP and RTP monthly volumes
const SBSA_TIERS = [
  { minTxns: 0,      maxTxns: 999,    feeVatIncl: 5.75 },
  { minTxns: 1000,   maxTxns: 9999,   feeVatIncl: 4.75 },
  { minTxns: 10000,  maxTxns: 49999,  feeVatIncl: 4.00 },
  // 50,000+ — use env override PAYSHAP_SBSA_FEE_NEGOTIATED_ZAR
];

// MM markup on RPP (VAT inclusive)
const MM_RPP_MARKUP_VAT_INCL = Number(process.env.PAYSHAP_MM_RPP_MARKUP_ZAR || 1.00);

// Proxy validation fee (VAT inclusive)
const PROXY_VALIDATION_FEE_VAT_INCL = Number(process.env.PAYSHAP_PROXY_VALIDATION_FEE_ZAR || 1.25);

/**
 * Extract VAT from a VAT-inclusive amount.
 * @param {number} vatInclAmount
 * @returns {{ exVat: number, vatAmount: number }}
 */
function extractVat(vatInclAmount) {
  const vatAmount = Number(((vatInclAmount / (1 + VAT_RATE)) * VAT_RATE).toFixed(4));
  const exVat = Number((vatInclAmount - vatAmount).toFixed(4));
  return { exVat, vatAmount };
}

/**
 * Get the SBSA fee (VAT incl) for the given monthly transaction count.
 * Applies to RPP and RTP independently.
 *
 * @param {number} monthlyTxnCount - Number of transactions processed this month (for this type)
 * @param {'rpp'|'rtp'} type - Transaction type
 * @returns {number} SBSA fee VAT inclusive
 */
function getSbsaFeeVatIncl(monthlyTxnCount, type) {
  // Check for negotiated override (50,000+)
  const negotiatedFee = process.env.PAYSHAP_SBSA_FEE_NEGOTIATED_ZAR;
  if (monthlyTxnCount >= 50000 && negotiatedFee) {
    return Number(negotiatedFee);
  }

  // Check for env overrides per tier (allows manual override without code change)
  const envOverride = process.env[`PAYSHAP_SBSA_FEE_TIER_${type.toUpperCase()}_ZAR`];
  if (envOverride) {
    return Number(envOverride);
  }

  for (const tier of SBSA_TIERS) {
    if (monthlyTxnCount >= tier.minTxns && monthlyTxnCount <= tier.maxTxns) {
      return tier.feeVatIncl;
    }
  }

  // Default to highest tier if count exceeds all tiers and no negotiated fee set
  return SBSA_TIERS[SBSA_TIERS.length - 1].feeVatIncl;
}

/**
 * Calculate the full RPP fee breakdown for a transaction.
 *
 * RPP: user pays SBSA fee + MM markup (both VAT incl)
 *
 * @param {number} monthlyRppCount - RPP transactions processed this month (before this one)
 * @returns {{
 *   sbsaFeeVatIncl: number,    // SBSA pass-through fee (VAT incl)
 *   sbsaFeeExVat: number,      // SBSA fee ex-VAT, informational only for RPP pass-through
 *   sbsaVat: number,           // VAT in SBSA fee, informational only for RPP pass-through
 *   mmMarkupVatIncl: number,   // MM markup charged to user (VAT incl)
 *   mmMarkupExVat: number,     // MM markup ex-VAT (net revenue)
 *   mmMarkupVat: number,       // VAT on MM markup (output VAT)
 *   totalUserFeeVatIncl: number, // Total charged to user (VAT incl)
 *   totalUserFeeExVat: number,   // Total ex-VAT
 *   totalOutputVat: number,    // VAT embedded in total user fee, including SBSA pass-through
 *   netVatPayable: number,     // VAT payable on MMTP markup only
 *   mmNetRevenue: number,      // MM net revenue ex-VAT (markup only)
 * }}
 */
function calculateRppFee(monthlyRppCount) {
  const sbsaFeeVatIncl = getSbsaFeeVatIncl(monthlyRppCount, 'rpp');
  const { exVat: sbsaFeeExVat, vatAmount: sbsaVat } = extractVat(sbsaFeeVatIncl);

  const mmMarkupVatIncl = MM_RPP_MARKUP_VAT_INCL;
  const { exVat: mmMarkupExVat, vatAmount: mmMarkupVat } = extractVat(mmMarkupVatIncl);

  const totalUserFeeVatIncl = Number((sbsaFeeVatIncl + mmMarkupVatIncl).toFixed(2));
  const { exVat: totalUserFeeExVat, vatAmount: totalOutputVat } = extractVat(totalUserFeeVatIncl);

  // SBSA fee is pass-through; MMTP VAT payable is only VAT on its own markup.
  const netVatPayable = Number(mmMarkupVat.toFixed(4));

  return {
    sbsaFeeVatIncl: Number(sbsaFeeVatIncl.toFixed(2)),
    sbsaFeeExVat: Number(sbsaFeeExVat.toFixed(2)),
    sbsaVat: Number(sbsaVat.toFixed(2)),
    mmMarkupVatIncl: Number(mmMarkupVatIncl.toFixed(2)),
    mmMarkupExVat: Number(mmMarkupExVat.toFixed(2)),
    mmMarkupVat: Number(mmMarkupVat.toFixed(2)),
    totalUserFeeVatIncl,
    totalUserFeeExVat: Number(totalUserFeeExVat.toFixed(2)),
    totalOutputVat: Number(totalOutputVat.toFixed(2)),
    netVatPayable: Number(netVatPayable.toFixed(2)),
    mmNetRevenue: Number(mmMarkupExVat.toFixed(2)),
  };
}

/**
 * Calculate the full RTP fee breakdown for a transaction.
 *
 * RTP: user pays SBSA fee only (flat pass-through, no MM markup).
 * MM collects the fee and remits to SBSA — net revenue = R0.
 * VAT embedded in SBSA fee is informational only for MMTP; no MMTP VAT control entry.
 *
 * @param {number} monthlyRtpCount - RTP transactions processed this month (before this one)
 * @returns {{
 *   sbsaFeeVatIncl: number,
 *   sbsaFeeExVat: number,
 *   sbsaVat: number,
 *   totalUserFeeVatIncl: number,
 *   totalOutputVat: number,
 *   netVatPayable: number,
 *   mmNetRevenue: number,
 * }}
 */
function calculateRtpFee(monthlyRtpCount) {
  const sbsaFeeVatIncl = getSbsaFeeVatIncl(monthlyRtpCount, 'rtp');
  const { exVat: sbsaFeeExVat, vatAmount: sbsaVat } = extractVat(sbsaFeeVatIncl);

  return {
    sbsaFeeVatIncl: Number(sbsaFeeVatIncl.toFixed(2)),
    sbsaFeeExVat: Number(sbsaFeeExVat.toFixed(2)),
    sbsaVat: Number(sbsaVat.toFixed(2)),
    totalUserFeeVatIncl: Number(sbsaFeeVatIncl.toFixed(2)),
    totalOutputVat: Number(sbsaVat.toFixed(2)),
    netVatPayable: 0, // pure pass-through; no MMTP VAT liability
    mmNetRevenue: 0,
  };
}

/**
 * Calculate proxy validation fee breakdown.
 * @returns {{ feeVatIncl: number, feeExVat: number, vatAmount: number }}
 */
function calculateProxyValidationFee() {
  const feeVatIncl = PROXY_VALIDATION_FEE_VAT_INCL;
  const { exVat: feeExVat, vatAmount } = extractVat(feeVatIncl);
  return {
    feeVatIncl: Number(feeVatIncl.toFixed(2)),
    feeExVat: Number(feeExVat.toFixed(2)),
    vatAmount: Number(vatAmount.toFixed(2)),
  };
}

/**
 * Get the current month's RPP transaction count for a given wallet/user.
 * Used to determine which pricing tier applies.
 *
 * @param {Object} db - Sequelize db instance
 * @param {string} [walletId] - Optional: count for specific wallet
 * @returns {Promise<number>}
 */
async function getMonthlyRppCount(db, walletId) {
  const { Op } = require('sequelize');
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const where = {
    type: 'rpp',
    direction: 'debit',
    status: { [Op.in]: ['initiated', 'completed'] },
    createdAt: { [Op.gte]: startOfMonth },
  };
  if (walletId) where.walletId = walletId;

  return db.StandardBankTransaction.count({ where });
}

/**
 * Get the current month's RTP transaction count.
 *
 * @param {Object} db - Sequelize db instance
 * @param {string} [walletId] - Optional: count for specific wallet
 * @returns {Promise<number>}
 */
async function getMonthlyRtpCount(db, walletId) {
  const { Op } = require('sequelize');
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const where = {
    status: { [Op.in]: ['initiated', 'paid', 'presented', 'received'] },
    createdAt: { [Op.gte]: startOfMonth },
  };
  if (walletId) where.walletId = walletId;

  return db.StandardBankRtpRequest.count({ where });
}

module.exports = {
  getSbsaFeeVatIncl,
  calculateRppFee,
  calculateRtpFee,
  calculateProxyValidationFee,
  getMonthlyRppCount,
  getMonthlyRtpCount,
  extractVat,
  SBSA_TIERS,
  MM_RPP_MARKUP_VAT_INCL,
  PROXY_VALIDATION_FEE_VAT_INCL,
};
