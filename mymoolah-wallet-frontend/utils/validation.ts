// Validation utilities for MyMoolah Treasury Platform

export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  const text = String(phone);
  if (text.startsWith('+') && /^\+27[6-8]\d{8}$/.test(text)) return true;
  const clean = text.replace(/\D/g, '');
  if (/^27[6-8]\d{8}$/.test(clean)) return true;
  if (/^0[6-8]\d{8}$/.test(clean)) return true;
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
  const raw = String(msisdn).trim();
  const digits = raw.replace(/\D/g, '');
  let e164: string | undefined;
  if (/^0[6-8]\d{8}$/.test(digits)) {
    e164 = `+27${digits.slice(1)}`;
  } else if (/^27[6-8]\d{8}$/.test(digits)) {
    e164 = `+${digits}`;
  } else if (raw.startsWith('+') && /^\+27[6-8]\d{8}$/.test(raw)) {
    e164 = raw;
  }
  if (!e164) {
    errors.push('Invalid South African mobile number');
    return { isValid: false, errors };
  }
  return { isValid: true, errors: [], formatted: e164 };
};

/**
 * Format MSISDN for display
 * @param msisdn - The mobile number to format
 * @returns Formatted mobile number (078 123 4567)
 */
export const formatMsisdn = (msisdn: string): string => {
  if (!msisdn) return '';
  const s = String(msisdn);
  const e164 = s.startsWith('+') ? s : (s.replace(/\D/g, '').startsWith('27') ? `+${s.replace(/\D/g, '')}` : s);
  if (/^\+27[6-8]\d{8}$/.test(e164)) {
    const local = `0${e164.slice(3)}`;
    return `${local.substring(0, 3)} ${local.substring(3, 6)} ${local.substring(6)}`;
  }
  return msisdn;
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
