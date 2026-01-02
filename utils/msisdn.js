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

/**
 * Extract network provider from South African mobile number
 * Returns lowercase network name: 'vodacom', 'mtn', 'cellc', 'telkom', or null
 * 
 * @param {string} msisdn - Mobile number in any format (0821234567, +27821234567, etc.)
 * @returns {string|null} - Network name or null if cannot determine
 */
function getNetworkFromMsisdn(msisdn) {
  if (!msisdn || typeof msisdn !== 'string') return null;
  
  // Allow NON_MSI_* identifiers to pass through
  if (msisdn.startsWith('NON_MSI_')) return null;
  
  // Extract digits only
  const digits = msisdn.replace(/\D/g, '');
  if (!digits || digits.length < 3) return null;
  
  // Get first 3 digits (prefix)
  // Handle both local format (082...) and international format (2782...)
  let prefix;
  if (digits.startsWith('27') && digits.length >= 11) {
    // International format: 27821234567 -> prefix is 2782 -> extract 082
    prefix = `0${digits.slice(2, 5)}`;
  } else if (digits.startsWith('0') && digits.length >= 10) {
    // Local format: 0821234567 -> prefix is 082
    prefix = digits.substring(0, 3);
  } else {
    return null;
  }
  
  // South African network prefix mapping
  // Vodacom: 082, 084
  if (prefix === '082' || prefix === '084') return 'vodacom';
  
  // MTN: 083, 081, 060, 061, 073
  if (prefix === '083' || prefix === '081' || prefix === '060' || prefix === '061' || prefix === '073') return 'mtn';
  
  // CellC: 076, 074
  if (prefix === '076' || prefix === '074') return 'cellc';
  
  // Telkom: 085, 087
  if (prefix === '085' || prefix === '087') return 'telkom';
  
  return null;
}

module.exports = {
  normalizeToE164,
  isValidE164,
  toLocal,
  formatLocalPretty,
  maskMsisdn,
  getNetworkFromMsisdn,
  E164_REGEX_ZA,
  LOCAL_REGEX_ZA,
};

