'use strict';

/**
 * SBSA PayShap Polling Fallback Service
 *
 * Gustaf (SBSA) confirmed:
 *   - Poll every 10 seconds, starting 10 seconds after initiation
 *   - Stop when transaction reaches a terminal state (completed / rejected / cancelled / expired)
 *   - Max 10 GET calls per second (we poll one transaction at a time — well within limit)
 *
 * Polling endpoints (UAT):
 *   RPP: GET {SBSA_RPP_BASE_URL}/api/payments/initiation/{uetr}
 *   RTP: GET {SBSA_RTP_BASE_URL}/api/requestToPay/initiation/{uetr}
 *
 * The {transactionIdentifier} = UETR from the initiation request (stored in
 * StandardBankTransaction.transactionId and StandardBankRtpRequest.requestId).
 *
 * This service is used as a fallback when callbacks are not yet received
 * (e.g. before domain whitelisting on 2 March, or if a callback is missed).
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-26
 */

const sbClient = require('../integrations/standardbank/client');
const db = require('../models');

// Terminal states — stop polling when reached
const RPP_TERMINAL_STATUSES = new Set(['completed', 'rejected', 'failed', 'cancelled', 'expired']);
const RTP_TERMINAL_STATUSES = new Set(['paid', 'rejected', 'cancelled', 'declined', 'expired', 'failed']);

// SBSA status code → internal status maps
const RPP_STATUS_MAP = {
  ACSP: 'completed',
  ACCC: 'completed',
  ACWC: 'processing',
  RJCT: 'rejected',
  PDNG: 'pending',
  RCVD: 'processing',
};

const RTP_STATUS_MAP = {
  ACSP: 'paid',
  ACCP: 'presented',
  RJCT: 'rejected',
  PDNG: 'pending',
  RCVD: 'received',
  CANC: 'cancelled',
};

/**
 * Map SBSA RPP status response to internal status string.
 * @param {Object} data - SBSA GET response body
 * @returns {string} internal status
 */
function mapRppStatus(data) {
  // SBSA response may contain txSts, sts, or nested status fields
  const raw =
    data?.txSts ||
    data?.sts ||
    data?.cstmrPmtStsRpt?.orgnlPmtInfAndSts?.[0]?.txInfAndSts?.[0]?.txSts ||
    data?.status ||
    null;
  return RPP_STATUS_MAP[raw] || 'processing';
}

/**
 * Map SBSA RTP status response to internal status string.
 * @param {Object} data - SBSA GET response body
 * @returns {string} internal status
 */
function mapRtpStatus(data) {
  const raw =
    data?.txSts ||
    data?.sts ||
    data?.cstmrPmtReqStsRpt?.orgnlPmtReqInfAndSts?.[0]?.txInfAndSts?.[0]?.txSts ||
    data?.status ||
    null;
  return RTP_STATUS_MAP[raw] || 'presented';
}

/**
 * Poll SBSA for RPP payment status and update DB record.
 *
 * @param {string} originalMessageId - msgId from Pain.001 (stored as originalMessageId)
 * @param {string} uetr - UETR from initiation (stored as transactionId)
 * @returns {Promise<{ status: string, terminal: boolean, rawResponse: Object }>}
 */
async function pollRppStatus(originalMessageId, uetr) {
  if (!uetr && !originalMessageId) {
    throw new Error('uetr or originalMessageId required for RPP polling');
  }

  // SBSA polling uses UETR as transactionIdentifier
  const identifier = uetr || originalMessageId;

  const { data } = await sbClient.getPaymentStatus(identifier);
  const internalStatus = mapRppStatus(data);
  const isTerminal = RPP_TERMINAL_STATUSES.has(internalStatus);

  // Update DB record
  const record = await db.StandardBankTransaction.findOne({
    where: originalMessageId
      ? { originalMessageId }
      : { transactionId: uetr },
  });

  if (record && record.status !== internalStatus) {
    await record.update({
      status: internalStatus,
      rawResponse: data,
      processedAt: isTerminal ? new Date() : record.processedAt,
    });
  }

  return { status: internalStatus, terminal: isTerminal, rawResponse: data };
}

/**
 * Poll SBSA for RTP request status and update DB record.
 * If status becomes 'paid', triggers wallet credit via RTP service.
 *
 * @param {string} originalMessageId - msgId from Pain.013
 * @param {string} uetr - UETR from initiation (stored as requestId)
 * @returns {Promise<{ status: string, terminal: boolean, rawResponse: Object }>}
 */
async function pollRtpStatus(originalMessageId, uetr) {
  if (!uetr && !originalMessageId) {
    throw new Error('uetr or originalMessageId required for RTP polling');
  }

  const identifier = uetr || originalMessageId;

  const { data } = await sbClient.getRequestToPayStatus(identifier);
  const internalStatus = mapRtpStatus(data);
  const isTerminal = RTP_TERMINAL_STATUSES.has(internalStatus);

  const record = await db.StandardBankRtpRequest.findOne({
    where: originalMessageId
      ? { originalMessageId }
      : { requestId: uetr },
  });

  if (record && record.status !== internalStatus) {
    await record.update({
      status: internalStatus,
      rawResponse: data,
      webhookReceivedAt: new Date(),
      processedAt: isTerminal ? new Date() : record.processedAt,
    });

    // If newly paid, credit the wallet (same as callback path)
    if (internalStatus === 'paid' && record.status !== 'paid') {
      const rtpService = require('./standardbankRtpService');
      await rtpService.creditWalletOnPaid(record, data);
    }
  }

  return { status: internalStatus, terminal: isTerminal, rawResponse: data };
}

/**
 * Poll a single RPP transaction until terminal state or max attempts reached.
 * Gustaf recommends: start 10s after initiation, poll every 10s.
 *
 * @param {string} originalMessageId
 * @param {string} uetr
 * @param {Object} [options]
 * @param {number} [options.intervalMs=10000]   - Polling interval (default 10s)
 * @param {number} [options.maxAttempts=36]     - Max polls (default 36 = 6 min coverage)
 * @param {number} [options.initialDelayMs=10000] - Delay before first poll (default 10s)
 * @returns {Promise<{ status: string, attempts: number, terminal: boolean }>}
 */
async function pollRppUntilTerminal(originalMessageId, uetr, options = {}) {
  const {
    intervalMs = 10000,
    maxAttempts = 36,
    initialDelayMs = 10000,
  } = options;

  await _sleep(initialDelayMs);

  let attempts = 0;
  let lastStatus = 'initiated';

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const result = await pollRppStatus(originalMessageId, uetr);
      lastStatus = result.status;
      if (result.terminal) {
        return { status: lastStatus, attempts, terminal: true };
      }
    } catch (err) {
      console.warn(`SBSA RPP poll attempt ${attempts} failed: ${err.message}`);
    }
    if (attempts < maxAttempts) {
      await _sleep(intervalMs);
    }
  }

  return { status: lastStatus, attempts, terminal: false };
}

/**
 * Poll a single RTP request until terminal state or max attempts reached.
 *
 * @param {string} originalMessageId
 * @param {string} uetr
 * @param {Object} [options]
 * @returns {Promise<{ status: string, attempts: number, terminal: boolean }>}
 */
async function pollRtpUntilTerminal(originalMessageId, uetr, options = {}) {
  const {
    intervalMs = 10000,
    maxAttempts = 36,
    initialDelayMs = 10000,
  } = options;

  await _sleep(initialDelayMs);

  let attempts = 0;
  let lastStatus = 'initiated';

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const result = await pollRtpStatus(originalMessageId, uetr);
      lastStatus = result.status;
      if (result.terminal) {
        return { status: lastStatus, attempts, terminal: true };
      }
    } catch (err) {
      console.warn(`SBSA RTP poll attempt ${attempts} failed: ${err.message}`);
    }
    if (attempts < maxAttempts) {
      await _sleep(intervalMs);
    }
  }

  return { status: lastStatus, attempts, terminal: false };
}

/**
 * Recover stale non-terminal transactions by polling SBSA for their current status.
 * Intended to be called on server startup or via a scheduled job to catch any
 * transactions that missed their callback (e.g. during the pre-whitelisting period).
 *
 * @param {Object} [options]
 * @param {number} [options.staleMins=30] - Transactions older than this (minutes) and still non-terminal
 * @returns {Promise<{ rppRecovered: number, rtpRecovered: number }>}
 */
async function recoverStaleTransactions(options = {}) {
  const { staleMins = 30 } = options;
  const { Op } = require('sequelize');
  const cutoff = new Date(Date.now() - staleMins * 60 * 1000);

  let rppRecovered = 0;
  let rtpRecovered = 0;

  // Recover stale RPP transactions
  const staleRpp = await db.StandardBankTransaction.findAll({
    where: {
      type: 'rpp',
      status: { [Op.notIn]: ['completed', 'rejected', 'failed', 'cancelled', 'expired'] },
      createdAt: { [Op.lt]: cutoff },
    },
    limit: 50,
  });

  for (const txn of staleRpp) {
    try {
      const result = await pollRppStatus(txn.originalMessageId, txn.transactionId);
      if (result.terminal) rppRecovered++;
    } catch (err) {
      console.warn(`SBSA RPP recovery failed for ${txn.originalMessageId}: ${err.message}`);
    }
  }

  // Recover stale RTP requests
  const staleRtp = await db.StandardBankRtpRequest.findAll({
    where: {
      status: { [Op.notIn]: ['paid', 'rejected', 'cancelled', 'declined', 'expired', 'failed'] },
      createdAt: { [Op.lt]: cutoff },
    },
    limit: 50,
  });

  for (const req of staleRtp) {
    try {
      const result = await pollRtpStatus(req.originalMessageId, req.requestId);
      if (result.terminal) rtpRecovered++;
    } catch (err) {
      console.warn(`SBSA RTP recovery failed for ${req.originalMessageId}: ${err.message}`);
    }
  }

  return { rppRecovered, rtpRecovered };
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  pollRppStatus,
  pollRtpStatus,
  pollRppUntilTerminal,
  pollRtpUntilTerminal,
  recoverStaleTransactions,
  RPP_TERMINAL_STATUSES,
  RTP_TERMINAL_STATUSES,
};
