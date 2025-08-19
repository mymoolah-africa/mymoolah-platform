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
