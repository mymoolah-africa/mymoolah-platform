/**
 * EasyPay Utility Functions (14-digit version)
 */

// Validate EasyPay number format and check digit (14 digits only)
function validateEasyPayNumber(easyPayNumber) {
  try {
    if (typeof easyPayNumber !== 'string') return false;
    if (!/^\d{14}$/.test(easyPayNumber)) return false; // 14 digits only
    if (!easyPayNumber.startsWith('9')) return false;

    // Extract receiverId (4 digits after the 9)
    const receiverId = easyPayNumber.substring(1, 5);
    if (!/^\d{4}$/.test(receiverId)) return false;

    // Account number is 8 digits after receiverId, up to the last digit (check digit)
    const accountNumber = easyPayNumber.substring(5, 13);
    if (!/^\d{8}$/.test(accountNumber)) return false;

    const checkDigit = easyPayNumber.slice(-1);
    if (!/^\d$/.test(checkDigit)) return false;

    // Validate Luhn check digit
    const calculatedCheck = calculateLuhnCheckDigit(receiverId + accountNumber);
    return checkDigit === calculatedCheck;
  } catch (error) {
    console.error('❌ EasyPay number validation error:', error);
    return false;
  }
}

// Calculate Luhn Modulus 10 check digit (excluding the leading 9)
function calculateLuhnCheckDigit(number) {
  let sum = 0;
  let shouldDouble = true;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  const mod10 = sum % 10;
  return mod10 === 0 ? '0' : String(10 - mod10);
}

// Extract receiver ID from EasyPay number
function extractReceiverId(easyPayNumber) {
  if (!validateEasyPayNumber(easyPayNumber)) return null;
  return easyPayNumber.substring(1, 5);
}

// Extract account number from EasyPay number
function extractAccountNumber(easyPayNumber) {
  if (!validateEasyPayNumber(easyPayNumber)) return null;
  return easyPayNumber.substring(5, 13);
}

// Extract check digit from EasyPay number
function extractCheckDigit(easyPayNumber) {
  if (!validateEasyPayNumber(easyPayNumber)) return null;
  return easyPayNumber.slice(-1);
}

// Parse EasyPay number into components
function parseEasyPayNumber(easyPayNumber) {
  if (!validateEasyPayNumber(easyPayNumber)) return null;
  return {
    receiverId: extractReceiverId(easyPayNumber),
    accountNumber: extractAccountNumber(easyPayNumber),
    checkDigit: extractCheckDigit(easyPayNumber),
    fullNumber: easyPayNumber
  };
}

// Generate a valid 14-digit EasyPay number for testing
function generateTestEasyPayNumber(receiverId = '2021', accountNumber = '12345678') {
  if (!/^\d{4}$/.test(receiverId)) throw new Error('Receiver ID must be 4 digits');
  if (!/^\d{1,8}$/.test(accountNumber)) throw new Error('Account number must be 1-8 digits');
  const paddedAccount = accountNumber.padStart(8, '0');
  const checkDigit = calculateLuhnCheckDigit(receiverId + paddedAccount);
  return `9${receiverId}${paddedAccount}${checkDigit}`;
}

module.exports = {
  validateEasyPayNumber,
  extractReceiverId,
  extractAccountNumber,
  extractCheckDigit,
  parseEasyPayNumber,
  generateTestEasyPayNumber,
  calculateLuhnCheckDigit
};