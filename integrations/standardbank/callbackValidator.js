'use strict';

/**
 * SBSA Callback Hash Validation
 * HMAC-SHA256 with 1000 iterations (PBKDF2 key derivation) per spec
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

const crypto = require('crypto');

const PBKDF2_ITERATIONS = 1000;
const SALT = 'SBSA_GRPHDR';

/**
 * Validate x-GroupHeader-Hash against computed hash
 * @param {string|Object} grpHdr - Group header (string or object to stringify)
 * @param {string} headerHash - Value from x-GroupHeader-Hash header
 * @param {string} secret - SBSA_CALLBACK_SECRET from OneHub
 * @returns {boolean}
 */
function validateGroupHeaderHash(grpHdr, headerHash, secret) {
  if (!secret || !headerHash || typeof headerHash !== 'string') {
    return false;
  }
  const grpHdrStr = typeof grpHdr === 'string' ? grpHdr : JSON.stringify(grpHdr);
  const key = crypto.pbkdf2Sync(secret, SALT, PBKDF2_ITERATIONS, 32, 'sha256');
  const computed = crypto.createHmac('sha256', key).update(grpHdrStr).digest('hex');
  const computedBuf = Buffer.from(computed, 'hex');
  const headerBuf = Buffer.from(headerHash, 'hex');
  if (computedBuf.length !== headerBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, headerBuf);
}

/**
 * Extract grpHdr from Pain.002 (RPP) or Pain.014 (RTP) callback body
 * @param {Object} body - Parsed callback JSON
 * @param {string} type - 'rpp' or 'rtp'
 * @returns {Object|null}
 */
function extractGrpHdr(body, type) {
  if (!body) return null;
  if (type === 'rpp') {
    return body.cstmrPmtStsRpt?.grpHdr ?? body.grpHdr ?? null;
  }
  if (type === 'rtp') {
    return body.cstmrPmtReqStsRpt?.grpHdr ?? body.grpHdr ?? null;
  }
  return null;
}

module.exports = {
  validateGroupHeaderHash,
  extractGrpHdr,
};
