'use strict';

/**
 * Field-Level Encryption Utility
 * ================================
 * AES-256-GCM encryption + HMAC-SHA256 blind index for searchable PII fields.
 *
 * WHY THIS EXISTS:
 * ----------------
 * GCP already encrypts the entire database disk (infrastructure-level AES-256).
 * This adds APPLICATION-LEVEL field encryption so that even a full database dump
 * with valid credentials cannot reveal sensitive PII (SA ID numbers, etc).
 *
 * HOW IT WORKS:
 * -------------
 * 1. ENCRYPTION (AES-256-GCM):
 *    - Each value is encrypted with a random 16-byte IV before being stored.
 *    - The auth tag prevents tampering (integrity check).
 *    - Format stored in DB: `enc:v1:<iv_base64>:<tag_base64>:<ciphertext_base64>`
 *    - The `enc:v1:` prefix distinguishes encrypted from legacy plaintext values,
 *      allowing zero-downtime migration of existing rows.
 *
 * 2. BLIND INDEX (HMAC-SHA256):
 *    - Searchable fields (e.g. idNumber) need a separate "blind index" column
 *      because you cannot WHERE-query encrypted ciphertext.
 *    - The blind index is a deterministic HMAC-SHA256 of the plaintext using a
 *      separate secret key. Same plaintext → same hash → searchable/unique.
 *    - The HMAC key must be different from the encryption key.
 *
 * REQUIRED ENV VARS:
 * ------------------
 * FIELD_ENCRYPTION_KEY  64 hex chars (32 bytes) — AES-256 key
 * FIELD_HMAC_KEY        64 hex chars (32 bytes) — HMAC-SHA256 key
 *
 * Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * GRACEFUL DEGRADATION:
 * ---------------------
 * If env vars are not set, the utility logs a warning and stores plaintext.
 * This prevents startup failures in development/CI. Set env vars before going
 * live with real user data.
 *
 * @module utils/fieldEncryption
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENC_PREFIX = 'enc:v1:';

// ---- Key resolution --------------------------------------------------------

function _resolveKey(envVar, description) {
  const raw = process.env[envVar];
  if (!raw) {
    return null;
  }
  if (raw.length !== 64 || !/^[0-9a-fA-F]+$/.test(raw)) {
    console.error(`❌ [FieldEncryption] ${envVar} must be exactly 64 hex characters (32 bytes). Got ${raw.length} chars.`);
    return null;
  }
  return Buffer.from(raw, 'hex');
}

function _getEncryptionKey() {
  return _resolveKey('FIELD_ENCRYPTION_KEY', 'AES-256 encryption key');
}

function _getHmacKey() {
  return _resolveKey('FIELD_HMAC_KEY', 'HMAC-SHA256 blind index key');
}

let _warnedOnce = false;
function _warnNotConfigured() {
  if (!_warnedOnce) {
    console.warn(
      '⚠️  [FieldEncryption] FIELD_ENCRYPTION_KEY and/or FIELD_HMAC_KEY not configured. ' +
      'PII fields will be stored as PLAINTEXT. Set these keys before storing real user data.'
    );
    _warnedOnce = true;
  }
}

// ---- Core functions --------------------------------------------------------

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns the encrypted string (prefixed with `enc:v1:`) or the original
 * plaintext if the encryption key is not configured.
 *
 * @param {string|null|undefined} plaintext
 * @returns {string|null|undefined}
 */
function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return plaintext;

  // Already encrypted — do not double-encrypt
  if (isEncrypted(plaintext)) return plaintext;

  const key = _getEncryptionKey();
  if (!key) {
    _warnNotConfigured();
    return plaintext;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ENC_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt a string previously encrypted with `encrypt()`.
 * Returns the plaintext. If the value is not encrypted (legacy plaintext),
 * returns the value as-is (supports zero-downtime migration of existing rows).
 *
 * @param {string|null|undefined} ciphertext
 * @returns {string|null|undefined}
 */
function decrypt(ciphertext) {
  if (ciphertext == null || ciphertext === '') return ciphertext;

  // Not encrypted — legacy plaintext row, return as-is
  if (!isEncrypted(ciphertext)) return ciphertext;

  const key = _getEncryptionKey();
  if (!key) {
    // Key not available — return raw stored value (unusable ciphertext)
    console.error('[FieldEncryption] Cannot decrypt: FIELD_ENCRYPTION_KEY not set.');
    return ciphertext;
  }

  // Format: enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
  const rest = ciphertext.slice(ENC_PREFIX.length); // strip "enc:v1:"
  const parts = rest.split(':');
  if (parts.length !== 3) {
    console.error('[FieldEncryption] Malformed encrypted value — returning raw.');
    return ciphertext;
  }

  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(data) + decipher.final('utf8');
}

/**
 * Compute a deterministic HMAC-SHA256 blind index for a plaintext value.
 * Used to enable WHERE-clause lookups and unique constraints on encrypted fields.
 *
 * @param {string|null|undefined} plaintext
 * @returns {string|null} 64-char hex HMAC, or null if plaintext is empty or key unavailable
 */
function blindIndex(plaintext) {
  if (plaintext == null || plaintext === '') return null;

  const key = _getHmacKey();
  if (!key) {
    _warnNotConfigured();
    // Fallback: store raw value as blind index (only safe for dev/test)
    return String(plaintext);
  }

  return crypto
    .createHmac('sha256', key)
    .update(String(plaintext))
    .digest('hex');
}

/**
 * Return true if the value was encrypted by this utility.
 * @param {string} value
 * @returns {boolean}
 */
function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

/**
 * Check whether field encryption is fully configured (both keys present).
 * Use this for startup health checks.
 * @returns {{ configured: boolean, encryptionKey: boolean, hmacKey: boolean }}
 */
function checkConfiguration() {
  const encKey = !!_getEncryptionKey();
  const hmacKey = !!_getHmacKey();
  return {
    configured: encKey && hmacKey,
    encryptionKey: encKey,
    hmacKey: hmacKey,
  };
}

module.exports = {
  encrypt,
  decrypt,
  blindIndex,
  isEncrypted,
  checkConfiguration,
};
