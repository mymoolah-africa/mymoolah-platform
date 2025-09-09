// Validation utilities for MyMoolah Treasury Platform

export const validatePhoneNumber = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // South African phone number validation
  if (cleanPhone.startsWith('27') && cleanPhone.length === 11) {
    return true;
  }
  
  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    return true;
  }
  
  return false;
};

/**
 * Validate MSISDN (Mobile Number) for beneficiary creation
 * Matches the same validation used in registration/login process
 * @param msisdn - The mobile number to validate
 * @returns Validation result with detailed feedback
 */
export const validateMsisdn = (msisdn: string): { isValid: boolean; errors: string[]; formatted?: string } => {
  const errors: string[] = [];
  
  if (!msisdn || typeof msisdn !== 'string') {
    errors.push('Mobile number is required');
    return { isValid: false, errors };
  }

  // Remove all non-digit characters
  const cleanNumber = msisdn.replace(/\D/g, '');
  
  // Check if it's a valid SA mobile number
  // SA mobile numbers start with 27 (country code) + 7 or 8 (mobile prefix) + 8 digits
  // Or just 7 or 8 + 8 digits (without country code)
  const saMobileRegex = /^(27)?[78]\d{8}$/;
  
  if (!saMobileRegex.test(cleanNumber)) {
    errors.push('Invalid South African mobile number format');
    return { isValid: false, errors };
  }

  // Format to standard SA format (0821234567)
  let formattedNumber: string;
  if (cleanNumber.startsWith('27')) {
    formattedNumber = '0' + cleanNumber.substring(2);
  } else {
    formattedNumber = cleanNumber;
  }

  // Additional validation checks
  if (formattedNumber.length !== 10) {
    errors.push('Mobile number must be 10 digits (including leading 0)');
    return { isValid: false, errors };
  }

  if (!formattedNumber.startsWith('0')) {
    errors.push('Mobile number must start with 0');
    return { isValid: false, errors };
  }

  const prefix = formattedNumber.substring(1, 2);
  if (!['6', '7', '8'].includes(prefix)) {
    errors.push('Mobile number must start with 06, 07, or 08');
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    formatted: formattedNumber
  };
};

/**
 * Format MSISDN for display
 * @param msisdn - The mobile number to format
 * @returns Formatted mobile number (078 123 4567)
 */
export const formatMsisdn = (msisdn: string): string => {
  const validation = validateMsisdn(msisdn);
  if (!validation.isValid || !validation.formatted) {
    return msisdn; // Return original if invalid
  }

  const formatted = validation.formatted;
  return `${formatted.substring(0, 3)} ${formatted.substring(3, 6)} ${formatted.substring(6, 8)} ${formatted.substring(8)}`;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateName = (name: string): boolean => {
  return name.length >= 2 && /^[a-zA-Z\s]+$/.test(name);
};

export const validateAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

export const validateAccountNumber = (accountNumber: string): boolean => {
  const cleanAccount = accountNumber.replace(/\D/g, '');
  return cleanAccount.length >= 8 && cleanAccount.length <= 20;
};
