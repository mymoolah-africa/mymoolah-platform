/**
 * EasyPay Utility Functions
 * Helper functions for EasyPay number validation and processing
 */

/**
 * Validate EasyPay number format
 * Format: 9XXXXNNNNNNNNNNNNNNNN (9 + 4-digit receiver ID + account number + check digit)
 * @param {string} easyPayNumber - The EasyPay number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateEasyPayNumber(easyPayNumber) {
  try {
    // Check if it's a string
    if (typeof easyPayNumber !== 'string') {
      return false;
    }

    // Check length (should be 20 digits)
    if (easyPayNumber.length !== 20) {
      return false;
    }

    // Check if it starts with '9'
    if (!easyPayNumber.startsWith('9')) {
      return false;
    }

    // Check if all characters are digits
    if (!/^\d+$/.test(easyPayNumber)) {
      return false;
    }

    // Extract receiver ID (positions 2-5)
    const receiverId = easyPayNumber.substring(1, 5);
    
    // Validate receiver ID (should be 4 digits)
    if (receiverId.length !== 4 || !/^\d{4}$/.test(receiverId)) {
      return false;
    }

    // Extract account number (positions 6-19)
    const accountNumber = easyPayNumber.substring(5, 19);
    
    // Validate account number (should be 13 digits)
    if (accountNumber.length !== 13 || !/^\d{13}$/.test(accountNumber)) {
      return false;
    }

    // Extract check digit (position 20)
    const checkDigit = easyPayNumber.substring(19, 20);
    
    // Validate check digit (should be 1 digit)
    if (checkDigit.length !== 1 || !/^\d{1}$/.test(checkDigit)) {
      return false;
    }

    // TODO: Implement proper check digit validation algorithm
    // For now, we'll accept any valid format

    return true;

  } catch (error) {
    console.error('❌ EasyPay number validation error:', error);
    return false;
  }
}

/**
 * Extract receiver ID from EasyPay number
 * @param {string} easyPayNumber - The EasyPay number
 * @returns {string} - The 4-digit receiver ID
 */
function extractReceiverId(easyPayNumber) {
  try {
    if (!validateEasyPayNumber(easyPayNumber)) {
      throw new Error('Invalid EasyPay number format');
    }
    
    // Receiver ID is positions 2-5 (after the leading '9')
    return easyPayNumber.substring(1, 5);
    
  } catch (error) {
    console.error('❌ Error extracting receiver ID:', error);
    return null;
  }
}

/**
 * Extract account number from EasyPay number
 * @param {string} easyPayNumber - The EasyPay number
 * @returns {string} - The account number
 */
function extractAccountNumber(easyPayNumber) {
  try {
    if (!validateEasyPayNumber(easyPayNumber)) {
      throw new Error('Invalid EasyPay number format');
    }
    
    // Account number is positions 6-19
    return easyPayNumber.substring(5, 19);
    
  } catch (error) {
    console.error('❌ Error extracting account number:', error);
    return null;
  }
}

/**
 * Extract check digit from EasyPay number
 * @param {string} easyPayNumber - The EasyPay number
 * @returns {string} - The check digit
 */
function extractCheckDigit(easyPayNumber) {
  try {
    if (!validateEasyPayNumber(easyPayNumber)) {
      throw new Error('Invalid EasyPay number format');
    }
    
    // Check digit is position 20
    return easyPayNumber.substring(19, 20);
    
  } catch (error) {
    console.error('❌ Error extracting check digit:', error);
    return null;
  }
}

/**
 * Parse EasyPay number into components
 * @param {string} easyPayNumber - The EasyPay number
 * @returns {object} - Object with receiverId, accountNumber, and checkDigit
 */
function parseEasyPayNumber(easyPayNumber) {
  try {
    if (!validateEasyPayNumber(easyPayNumber)) {
      throw new Error('Invalid EasyPay number format');
    }
    
    return {
      receiverId: extractReceiverId(easyPayNumber),
      accountNumber: extractAccountNumber(easyPayNumber),
      checkDigit: extractCheckDigit(easyPayNumber),
      fullNumber: easyPayNumber
    };
    
  } catch (error) {
    console.error('❌ Error parsing EasyPay number:', error);
    return null;
  }
}

/**
 * Generate a test EasyPay number for development
 * @param {string} receiverId - 4-digit receiver ID
 * @param {string} accountNumber - 13-digit account number
 * @returns {string} - Valid EasyPay number
 */
function generateTestEasyPayNumber(receiverId = '2021', accountNumber = '0000000000001') {
  try {
    // Pad account number to 13 digits
    const paddedAccountNumber = accountNumber.padStart(13, '0');
    
    // Generate a simple check digit (for testing only)
    const checkDigit = '0';
    
    return `9${receiverId}${paddedAccountNumber}${checkDigit}`;
    
  } catch (error) {
    console.error('❌ Error generating test EasyPay number:', error);
    return null;
  }
}

module.exports = {
  validateEasyPayNumber,
  extractReceiverId,
  extractAccountNumber,
  extractCheckDigit,
  parseEasyPayNumber,
  generateTestEasyPayNumber
}; 