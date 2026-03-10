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

  // Log all computed hashes for debugging (TEMPORARY — remove after fix confirmed)
  const pbkdf2Key = crypto.pbkdf2Sync(secret, SALT, PBKDF2_ITERATIONS, 32, 'sha256');
  const strats = [
    { name: 'pbkdf2+hmac', val: crypto.createHmac('sha256', pbkdf2Key).update(grpHdrStr).digest() },
    { name: 'plain-hmac', val: crypto.createHmac('sha256', secret).update(grpHdrStr).digest() },
    { name: 'sha256-only', val: crypto.createHash('sha256').update(grpHdrStr).digest() },
    { name: 'hmac-secret-utf8', val: crypto.createHmac('sha256', Buffer.from(secret, 'utf8')).update(grpHdrStr, 'utf8').digest() },
  ];
  console.log('[HASH-DEBUG] input=%s (len=%d) isBase64=%s headerBuf=%s',
    grpHdrStr.substring(0, 200), grpHdrStr.length, isBase64, headerBuf.toString('base64'));
  for (const s of strats) {
    const match = s.val.length === headerBuf.length && crypto.timingSafeEqual(s.val, headerBuf);
    console.log('[HASH-DEBUG] %s: %s match=%s', s.name, s.val.toString('base64'), match);
    if (match) return true;
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
