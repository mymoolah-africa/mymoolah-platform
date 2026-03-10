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

  // SBSA sends hash as hex (RPP) or Base64 (RTP) — detect format
  const isBase64 = /[+/=]/.test(headerHash) || !/^[0-9a-fA-F]+$/.test(headerHash);
  const headerBuf = isBase64
    ? Buffer.from(headerHash, 'base64')
    : Buffer.from(headerHash, 'hex');

  // Strategy 1: PBKDF2-derived key + HMAC-SHA256 (RPP proven pattern)
  const pbkdf2Key = crypto.pbkdf2Sync(secret, SALT, PBKDF2_ITERATIONS, 32, 'sha256');
  const computed1 = crypto.createHmac('sha256', pbkdf2Key).update(grpHdrStr).digest();
  if (computed1.length === headerBuf.length && crypto.timingSafeEqual(computed1, headerBuf)) {
    return true;
  }

  // Strategy 2: Plain HMAC-SHA256 with raw secret (RTP may use this)
  const computed2 = crypto.createHmac('sha256', secret).update(grpHdrStr).digest();
  if (computed2.length === headerBuf.length && crypto.timingSafeEqual(computed2, headerBuf)) {
    return true;
  }

  return false;
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

/**
 * Extract raw grpHdr JSON substring from unparsed body text.
 * Preserves original formatting/whitespace so HMAC matches SBSA's computation.
 * @param {string} rawBodyStr - Raw JSON body string
 * @param {string} type - 'rpp' or 'rtp'
 * @returns {string|null}
 */
function extractRawGrpHdr(rawBodyStr, type) {
  if (!rawBodyStr || typeof rawBodyStr !== 'string') return null;

  const key = '"grpHdr"';
  const idx = rawBodyStr.indexOf(key);
  if (idx === -1) return null;

  let start = rawBodyStr.indexOf('{', idx + key.length);
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < rawBodyStr.length; i++) {
    if (rawBodyStr[i] === '{') depth++;
    else if (rawBodyStr[i] === '}') depth--;
    if (depth === 0) {
      return rawBodyStr.substring(start, i + 1);
    }
  }
  return null;
}

module.exports = {
  validateGroupHeaderHash,
  extractGrpHdr,
  extractRawGrpHdr,
};
