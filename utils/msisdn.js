// utils/msisdn.js
//
// Canonical MSISDN utilities for South Africa.
// - Internal canonical format: E.164 (+27XXXXXXXXX)
// - UI display helpers for local format (0XXXXXXXXX)
// - Input normalization from common user-provided variants
//
// NOTE:
// - Only mobile prefixes 06/07/08 are accepted for ZA mobile numbers
// - Non-mobile identifiers for utilities/billers should use NON_MSI_* and bypass these helpers
//

const E164_REGEX_ZA = /^\+27[6-8][0-9]{8}$/; // +27 followed by 9 digits starting with 6/7/8
const LOCAL_REGEX_ZA = /^0[6-8][0-9]{8}$/;   // 0 followed by 9 digits starting with 6/7/8

/**
 * Normalize any SA mobile number into E.164 (+27XXXXXXXXX).
 * Accepts inputs like:
 * - "0821234567"
 * - "+27821234567"
 * - "27 82 123 4567"
 * - "(082) 123-4567"
 *
 * Throws on invalid input.
 */
function normalizeToE164(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('MSISDN is required');
  }

  // Allow NON_MSI_* identifiers to flow through untouched
  if (input.startsWith('NON_MSI_')) {
    return input;
  }

  const digits = input.replace(/\D/g, '');
  if (!digits) throw new Error('Invalid MSISDN (no digits)');

  // Local 0XXXXXXXXX
  if (LOCAL_REGEX_ZA.test(digits)) {
    return `+27${digits.slice(1)}`;
  }

  // 27XXXXXXXXX without plus
  if (/^27[6-8][0-9]{8}$/.test(digits)) {
    return `+${digits}`;
  }

  // Already E.164 with plus (after stripping non-digits we lost plus), handle separately
  if (input.startsWith('+') && /^\+27[6-8][0-9]{8}$/.test(input)) {
    return input;
  }

  throw new Error('Invalid South African mobile number (expect +27XXXXXXXXX or 0XXXXXXXXX)');
}

/**
 * Validate E.164 (+27XXXXXXXXX).
 */
function isValidE164(msisdn) {
  if (typeof msisdn !== 'string') return false;
  if (msisdn.startsWith('NON_MSI_')) return true;
  return E164_REGEX_ZA.test(msisdn);
}

/**
 * Convert E.164 (+27XXXXXXXXX) to local display (0XXXXXXXXX).
 * NON_MSI_* values are returned as-is.
 */
function toLocal(msisdnE164) {
  if (!msisdnE164 || typeof msisdnE164 !== 'string') return '';
  if (msisdnE164.startsWith('NON_MSI_')) return msisdnE164;
  if (!E164_REGEX_ZA.test(msisdnE164)) return msisdnE164;
  return `0${msisdnE164.slice(3)}`;
}

/**
 * Pretty print local number as "078 123 4567".
 */
function formatLocalPretty(msisdnLocal) {
  if (!msisdnLocal || typeof msisdnLocal !== 'string') return '';
  if (!LOCAL_REGEX_ZA.test(msisdnLocal)) return msisdnLocal;
  return `${msisdnLocal.slice(0, 3)} ${msisdnLocal.slice(3, 6)} ${msisdnLocal.slice(6)}`;
}

/**
 * Mask MSISDN for logs: +27****3456
 */
function maskMsisdn(msisdn) {
  if (!msisdn || typeof msisdn !== 'string') return '';
  const raw = msisdn.startsWith('+') ? msisdn.slice(1) : msisdn;
  if (raw.length < 6) return '***';
  return `+${raw.slice(0, 2)}****${raw.slice(-4)}`;
}

module.exports = {
  normalizeToE164,
  isValidE164,
  toLocal,
  formatLocalPretty,
  maskMsisdn,
  E164_REGEX_ZA,
  LOCAL_REGEX_ZA,
};

