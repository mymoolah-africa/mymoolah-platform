/**
 * Solana Address Validator
 * 
 * Validates Solana wallet addresses for USDC transfers.
 * Uses @solana/web3.js for cryptographic validation.
 * 
 * Security: Always validate server-side (never trust client-side validation)
 */

const { PublicKey } = require('@solana/web3.js');

// Base58 characters used in Solana addresses (excludes 0, O, I, l)
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Validates a Solana wallet address
 * 
 * @param {string} address - The Solana address to validate
 * @returns {Object} Validation result
 * @returns {boolean} valid - Whether the address is valid
 * @returns {boolean} isOnCurve - Whether the address is on the ed25519 curve
 * @returns {string} reason - Reason if invalid
 * @returns {string} warning - Warning message if applicable
 */
function isValidSolanaAddress(address) {
  // Check for null/undefined/empty
  if (!address || typeof address !== 'string') {
    return { 
      valid: false, 
      reason: 'Address is required' 
    };
  }

  // Trim whitespace
  address = address.trim();

  // Basic format check using regex
  if (!SOLANA_ADDRESS_REGEX.test(address)) {
    return { 
      valid: false, 
      reason: 'Invalid format. Solana addresses must be 32-44 characters using Base58 encoding (excludes 0, O, I, l)' 
    };
  }

  // Cryptographic validation using Solana SDK
  try {
    const publicKey = new PublicKey(address);
    
    // Check if the address is on the ed25519 curve (valid user wallet)
    // Program-derived addresses (PDAs) are not on curve but are still valid
    const isOnCurve = PublicKey.isOnCurve(publicKey.toBytes());
    
    return { 
      valid: true,
      isOnCurve,
      warning: !isOnCurve ? 'This appears to be a program-derived address (PDA). Ensure the recipient can access funds at this address.' : null
    };
  } catch (error) {
    return { 
      valid: false, 
      reason: `Invalid Solana address: ${error.message}` 
    };
  }
}

/**
 * Validates and normalizes a Solana address
 * 
 * @param {string} address - The address to validate
 * @returns {Object} Result with normalized address
 */
function validateAndNormalize(address) {
  const validation = isValidSolanaAddress(address);
  
  if (!validation.valid) {
    return validation;
  }

  // Normalize: trim whitespace, ensure proper case
  const normalized = address.trim();
  
  return {
    ...validation,
    normalized
  };
}

/**
 * Batch validate multiple addresses
 * 
 * @param {string[]} addresses - Array of addresses to validate
 * @returns {Object[]} Array of validation results
 */
function validateBatch(addresses) {
  if (!Array.isArray(addresses)) {
    throw new Error('validateBatch expects an array of addresses');
  }

  return addresses.map((address, index) => ({
    index,
    address,
    ...isValidSolanaAddress(address)
  }));
}

/**
 * Check if address matches a known pattern (exchange, protocol, etc.)
 * This is for additional context/warnings, not validation
 * 
 * @param {string} address - Validated Solana address
 * @returns {Object|null} Pattern match info or null
 */
function detectKnownPattern(address) {
  // Known program addresses (for educational purposes)
  const knownPatterns = {
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': { 
      type: 'program', 
      name: 'Token Program',
      warning: 'This is a Solana system program address. Do not send USDC here - funds will be lost.'
    },
    '11111111111111111111111111111111': { 
      type: 'program', 
      name: 'System Program',
      warning: 'This is a Solana system program address. Do not send USDC here - funds will be lost.'
    }
  };

  return knownPatterns[address] || null;
}

module.exports = {
  isValidSolanaAddress,
  validateAndNormalize,
  validateBatch,
  detectKnownPattern,
  SOLANA_ADDRESS_REGEX
};
