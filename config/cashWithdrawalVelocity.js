'use strict';

/**
 * Cash-Withdrawal Velocity & Aggregation Thresholds — Single Source of Truth
 *
 * Authoritative policy: POL-020 §7.6 – §7.10 and POL-004 §5.2.8.
 *
 * These values are read by `services/cashWithdrawalVelocityService.js`
 * (Phase 3 of `docs/OWN_FUNDS_RINGFENCE_IMPLEMENTATION_PLAN.md`). Until the
 * service is running in enforcing mode, the rule family runs in log-only
 * mode per POL-020 §7.11.
 *
 * All monetary values are ZAR and integers of rand (not cents) where
 * stated. Time windows are expressed in seconds to be Redis TTL friendly.
 *
 * Tuning authority: joint CCO + CTO sign-off (POL-020 §9).
 */

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Count-cap enforcement mode.
 *   'log_only' — alerts emitted, no blocks applied (initial rollout).
 *   'enforce'  — blocks applied as per policy; alerts emitted.
 */
const ENFORCEMENT_MODE = process.env.CASH_WITHDRAWAL_VELOCITY_MODE || 'log_only';

/**
 * FICA-aligned aggregation triggers (POL-020 §7.7).
 * Sums are evaluated across all Cash-Withdrawal Partners combined, per wallet holder,
 * across the specified rolling window.
 */
const AGGREGATION = {
  enhancedReviewThresholdZar: 24999.99,
  ctrAutoFileThresholdZar: 49999.99,
  rapidDeploymentPctOfDailyCap: 0.80,
  rapidDeploymentWindowSec: 2 * HOUR,
  window: {
    reviewSec: DAY,
    ctrSec: DAY,
  },
};

/**
 * Structuring detection (POL-020 §7.8, rules CW-STR-*).
 */
const STRUCTURING = {
  // CW-STR-01 — structuring around per-credential partner ceilings
  smallSplitMinAmountZar: 2000,
  smallSplitCountThreshold: 3,
  smallSplitWindowSec: DAY,

  // CW-STR-02 — layering over 7 days against tier monthly value cap
  layeringWindowSec: WEEK,
  layeringCountThreshold: 5,
  layeringPctOfMonthlyValueCap: 0.90,

  // CW-STR-03 — rapid deposit-to-withdrawal (money-mule signal)
  rapidDepositWindowSec: 60 * MINUTE,
  rapidDepositPctOfDeposit: 0.70,
};

/**
 * Channel-rotation detection (POL-020 §7.9, rules CW-CHR-*).
 * Counts distinct Cash-Withdrawal Partners used by the same wallet holder.
 */
const CHANNEL_ROTATION = {
  softAlert: {
    distinctPartners: 2,
    windowSec: 60 * MINUTE,
  },
  hardBlock: {
    distinctPartners: 3,
    windowSec: 4 * HOUR,
  },
};

/**
 * Step-up & pending-review mechanics (POL-020 §7.10, rules CW-SUP-*).
 */
const STEP_UP = {
  // CW-SUP-01 — OTP required at this utilisation of any 24-hour count cap
  otpStepUpPctOfDailyCountCap: 0.80,
  // CW-SUP-02 — attempts at or beyond the count cap are held for review
  pendingReviewMaxWaitSec: 2 * HOUR,
};

/**
 * Rolling-counter configuration (Redis-backed).
 * Service implementation detail; exposed here for operational transparency.
 */
const COUNTER_KEYS = {
  countPer60m: (userId) => `cw:velocity:count60m:${userId}`,
  countPer24h: (userId) => `cw:velocity:count24h:${userId}`,
  amountPer24h: (userId) => `cw:velocity:amount24h:${userId}`,
  partnersPer24h: (userId) => `cw:velocity:partners24h:${userId}`,
  retailersPer24h: (userId) => `cw:velocity:retailers24h:${userId}`,
  partnersPer60m: (userId) => `cw:velocity:partners60m:${userId}`,
  partnersPer4h: (userId) => `cw:velocity:partners4h:${userId}`,
};

const COUNTER_TTL_SEC = {
  per60m: 60 * MINUTE,
  per24h: DAY,
  per4h: 4 * HOUR,
};

module.exports = {
  ENFORCEMENT_MODE,
  AGGREGATION,
  STRUCTURING,
  CHANNEL_ROTATION,
  STEP_UP,
  COUNTER_KEYS,
  COUNTER_TTL_SEC,
  // Re-exported time helpers for downstream callers
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  WEEK,
};
