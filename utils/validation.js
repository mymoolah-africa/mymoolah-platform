/**
 * Validation utilities for MyMoolah platform
 */

/**
 * Validate South African mobile number format
 * Accepts formats: 0821234567, +27821234567, 27821234567
 * @param {string} mobileNumber - The mobile number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateMobileNumber(mobileNumber) {
  if (!mobileNumber || typeof mobileNumber !== 'string') {
    return false;
  }

  // Remove all non-digit characters
  const cleanNumber = mobileNumber.replace(/\D/g, '');

  // Check if it's a valid SA mobile number
  // SA mobile numbers start with 27 (country code) + 7 or 8 (mobile prefix) + 8 digits
  // Or just 7 or 8 + 8 digits (without country code)
  const saMobileRegex = /^(27)?[78]\d{8}$/;

  return saMobileRegex.test(cleanNumber);
}

/**
 * Format mobile number to standard SA format
 * @param {string} mobileNumber - The mobile number to format
 * @returns {string} - Formatted mobile number (0821234567)
 */
function formatMobileNumber(mobileNumber) {
  if (!validateMobileNumber(mobileNumber)) {
    throw new Error('Invalid mobile number format');
  }

  // Remove all non-digit characters
  const cleanNumber = mobileNumber.replace(/\D/g, '');

  // If it starts with 27, remove it
  if (cleanNumber.startsWith('27')) {
    return cleanNumber.substring(2);
  }

  return cleanNumber;
}

/**
 * Validate amount for airtime purchases
 * @param {number} amount - The amount to validate
 * @param {number} min - Minimum amount (default: 2.00)
 * @param {number} max - Maximum amount (default: 1000.00)
 * @returns {boolean} - True if valid, false otherwise
 */
function validateAmount(amount, min = 2.00, max = 1000.00) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return false;
  }

  return amount >= min && amount <= max;
}

/**
 * Validate network ID
 * @param {string} networkId - The network ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateNetworkId(networkId) {
  const validNetworks = ['vodacom', 'mtn', 'cellc', 'telkom', 'econet', 'worldcall'];
  return validNetworks.includes(networkId);
}

/**
 * Validate top-up network ID (only 4 networks support top-up)
 * @param {string} networkId - The network ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateTopUpNetworkId(networkId) {
  const validTopUpNetworks = ['vodacom', 'mtn', 'cellc', 'telkom'];
  return validTopUpNetworks.includes(networkId);
}

module.exports = {
  validateMobileNumber,
  formatMobileNumber,
  validateAmount,
  validateNetworkId,
  validateTopUpNetworkId
};
