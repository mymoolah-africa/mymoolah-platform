'use strict';

/**
 * @module feeEngine
 * @description Per-payment fee calculation engine for disbursement runs.
 *
 * Resolves the active fee configuration from `disbursement_client_fees` for a
 * given client + rail, then computes individual payment fees entirely in integer
 * cents to avoid floating-point rounding errors.
 *
 * Fee types supported:
 *   - flat              — fixed fee per payment
 *   - percentage         — percentage of payment amount, clamped to min/max
 *   - flat_plus_percentage — flat base + percentage component, clamped to min/max
 *
 * Wallet rail is always R 0.00 (hardcoded, no DB lookup required).
 */

const { getUATClient, getStagingClient, getProductionClient } = require('../../scripts/db-connection-helper');

const VALID_RAILS = ['eft', 'payshap', 'wallet'];
const FREE_RAIL = 'wallet';
const LOG_PREFIX = '[FeeEngine]';

const ZERO_FEE_CONFIG = Object.freeze({
  id: null,
  client_id: null,
  rail: FREE_RAIL,
  fee_type: 'flat',
  flat_fee_cents: 0,
  percentage_fee: 0,
  min_fee_cents: 0,
  max_fee_cents: 0,
});

// ---------------------------------------------------------------------------
// Database client resolution
// ---------------------------------------------------------------------------

function getClient() {
  const env = process.env.MM_DEPLOYMENT_ENV || process.env.NODE_ENV || 'uat';
  if (env === 'production') return getProductionClient();
  if (env === 'staging') return getStagingClient();
  return getUATClient();
}

// ---------------------------------------------------------------------------
// Input validation helpers
// ---------------------------------------------------------------------------

function validateClientId(clientId) {
  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw new Error(`${LOG_PREFIX} clientId must be a positive integer, received: ${typeof clientId}`);
  }
}

function validateRail(rail) {
  if (!VALID_RAILS.includes(rail)) {
    throw new Error(`${LOG_PREFIX} rail must be one of [${VALID_RAILS.join(', ')}], received: "${rail}"`);
  }
}

function validatePayments(payments) {
  if (!Array.isArray(payments) || payments.length === 0) {
    throw new Error(`${LOG_PREFIX} payments must be a non-empty array`);
  }
  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    if (p == null || typeof p.amount !== 'number' || p.amount < 0) {
      throw new Error(`${LOG_PREFIX} payments[${i}].amount must be a non-negative number`);
    }
  }
}

// ---------------------------------------------------------------------------
// Fee config lookup
// ---------------------------------------------------------------------------

/**
 * Retrieve the currently active fee configuration for a client + rail.
 *
 * @param {number} clientId - Disbursement client ID (positive integer).
 * @param {string} rail     - Payment rail: 'eft' | 'payshap' | 'wallet'.
 * @returns {Promise<object|null>} Fee config row or null when no active config exists.
 *   Wallet rail always returns a hardcoded zero-fee config.
 */
async function getActiveFeeConfig(clientId, rail) {
  validateClientId(clientId);
  validateRail(rail);

  if (rail === FREE_RAIL) {
    return { ...ZERO_FEE_CONFIG, client_id: clientId };
  }

  const client = await getClient();
  try {
    const { rows } = await client.query(
      `SELECT id, client_id, rail, fee_type,
              flat_fee_cents, percentage_fee,
              min_fee_cents, max_fee_cents,
              effective_from, effective_to
         FROM disbursement_client_fees
        WHERE client_id = $1
          AND rail = $2
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        ORDER BY effective_from DESC
        LIMIT 1`,
      [clientId, rail],
    );

    if (rows.length === 0) {
      console.log(`${LOG_PREFIX} No active fee config for clientId=${clientId} rail=${rail}`);
      return null;
    }

    console.log(`${LOG_PREFIX} Loaded fee config id=${rows[0].id} type=${rows[0].fee_type} for clientId=${clientId} rail=${rail}`);
    return rows[0];
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Single-payment fee calculation (pure, no DB)
// ---------------------------------------------------------------------------

/**
 * Calculate the fee for a single payment amount.
 *
 * @param {number} amountCents - Payment amount in cents (non-negative integer).
 * @param {object} feeConfig   - Fee configuration row from `disbursement_client_fees`.
 * @returns {{ feeCents: number, feeType: string, flatComponent: number, percentageComponent: number }}
 */
function calculateSingleFee(amountCents, feeConfig) {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error(`${LOG_PREFIX} amountCents must be a non-negative integer, received: ${amountCents}`);
  }
  if (!feeConfig || !feeConfig.fee_type) {
    throw new Error(`${LOG_PREFIX} feeConfig is required and must include fee_type`);
  }

  const { fee_type, flat_fee_cents = 0, percentage_fee = 0, min_fee_cents = 0, max_fee_cents = 0 } = feeConfig;

  let flatComponent = 0;
  let percentageComponent = 0;
  let feeCents = 0;

  switch (fee_type) {
    case 'flat':
      flatComponent = flat_fee_cents;
      feeCents = flatComponent;
      break;

    case 'percentage':
      percentageComponent = Math.round(amountCents * percentage_fee);
      feeCents = percentageComponent;
      if (min_fee_cents > 0 && feeCents < min_fee_cents) feeCents = min_fee_cents;
      if (max_fee_cents > 0 && feeCents > max_fee_cents) feeCents = max_fee_cents;
      break;

    case 'flat_plus_percentage':
      flatComponent = flat_fee_cents;
      percentageComponent = Math.round(amountCents * percentage_fee);
      feeCents = flatComponent + percentageComponent;
      if (min_fee_cents > 0 && feeCents < min_fee_cents) feeCents = min_fee_cents;
      if (max_fee_cents > 0 && feeCents > max_fee_cents) feeCents = max_fee_cents;
      break;

    default:
      throw new Error(`${LOG_PREFIX} Unknown fee_type: "${fee_type}"`);
  }

  return { feeCents, feeType: fee_type, flatComponent, percentageComponent };
}

// ---------------------------------------------------------------------------
// Batch fee calculation
// ---------------------------------------------------------------------------

/**
 * Calculate fees for an array of payments belonging to a single disbursement run.
 *
 * @param {number}   clientId - Disbursement client ID.
 * @param {string}   rail     - Payment rail: 'eft' | 'payshap' | 'wallet'.
 * @param {Array<{ amount: number }>} payments - Payments with amount in ZAR (decimal).
 * @returns {Promise<{
 *   fees: Array<{ paymentIndex: number, amountCents: number, feeCents: number }>,
 *   totalAmountCents: number,
 *   totalFeeCents: number,
 *   grandTotalCents: number,
 *   feeConfig: object
 * }>}
 */
async function calculateFees(clientId, rail, payments) {
  validateClientId(clientId);
  validateRail(rail);
  validatePayments(payments);

  const feeConfig = await getActiveFeeConfig(clientId, rail);

  if (!feeConfig) {
    throw new Error(`${LOG_PREFIX} No active fee configuration for clientId=${clientId} rail=${rail}. Cannot calculate fees.`);
  }

  let totalAmountCents = 0;
  let totalFeeCents = 0;
  const fees = [];

  for (let i = 0; i < payments.length; i++) {
    const amountCents = Math.round(payments[i].amount * 100);
    const { feeCents } = calculateSingleFee(amountCents, feeConfig);

    fees.push({ paymentIndex: i, amountCents, feeCents });
    totalAmountCents += amountCents;
    totalFeeCents += feeCents;
  }

  const grandTotalCents = totalAmountCents + totalFeeCents;

  console.log(
    `${LOG_PREFIX} Calculated fees: ${payments.length} payments, ` +
    `totalAmount=${totalAmountCents}c, totalFees=${totalFeeCents}c, grand=${grandTotalCents}c`,
  );

  return { fees, totalAmountCents, totalFeeCents, grandTotalCents, feeConfig };
}

module.exports = {
  calculateFees,
  getActiveFeeConfig,
  calculateSingleFee,
};
