// mymoolah-wallet-frontend/utils/validation.ts

export function validatePhoneNumber(phone: string): boolean {
  const normalized = phone.replace(/\s/g, '');
  return /^(\+27|27|0)?[6-8][0-9]{8}$/.test(normalized);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string) {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isValid:
      minLength &&
      hasUppercase &&
      hasLowercase &&
      hasNumber &&
      hasSpecialChar,
  };
}

export function validateName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100;
}