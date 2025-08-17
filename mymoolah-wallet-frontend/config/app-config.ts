/**
 * MyMoolah Application Configuration
 * Central configuration for demo/production modes
 */

// Allow overriding API base via Vite env (Codespaces, local, etc.)
const API_BASE_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL)
  ? (import.meta as any).env.VITE_API_BASE_URL
  : 'http://localhost:3001';

export const APP_CONFIG = {
  // Demo vs Production Mode - FIXED FOR REAL BACKEND TESTING
  DEMO_MODE: false, // Set to false for production backend testing
  
  // Environment Settings
  ENVIRONMENT: 'development' as 'development' | 'production',
  
  // Demo Credentials (only used in demo mode) - UPDATED FOR COMPLEX PASSWORD SYSTEM
  DEMO_CREDENTIALS: {
    // Primary Demo Account - South African Phone Number
    phoneNumber: '27821234567',
    password: 'Demo123!',
    
    // Alternative Demo Accounts for Multi-Input Testing
    accounts: [
      {
        identifier: '27821234567',        // SA Phone Number
        password: 'Demo123!',
        type: 'phone' as const,
        description: 'Primary phone number account'
      },
      {
        identifier: '27721234567',        // Alternative SA Phone Number  
        password: 'Test456#',
        type: 'phone' as const,
        description: 'Secondary phone number account'
      },
      {
        identifier: '123456789',          // 9-digit Account Number
        password: 'Account789$',
        type: 'account' as const,
        description: 'Primary account number'
      },
      {
        identifier: '987654321012',       // 12-digit Account Number
        password: 'Secure456&',
        type: 'account' as const,
        description: 'Extended account number'
      },
      {
        identifier: 'demo_user',          // Username
        password: 'User123@',
        type: 'username' as const,
        description: 'Primary username account'
      },
      {
        identifier: 'john.doe',           // Username with period
        password: 'MyPass789!',
        type: 'username' as const,
        description: 'Alternative username account'
      }
    ]
  },
  
  // Launch Statistics (used in production mode)
  LAUNCH_STATS: {
    userCount: '50K+',
    networkType: 'Global Network',
    awardTitle: 'Award Winning'
  },
  
  // Feature Flags
  FEATURES: {
    showDemoCredentials: true,
    enableBiometrics: false,
    enableNotifications: true,
    enableAnalytics: false // Set to true for production
  },
  
  // API Configuration - reads from VITE_API_BASE_URL when provided
  API: {
    baseUrl: API_BASE_URL,
    timeout: 10000,
    retryAttempts: 3
  },
  
  // Mojaloop Configuration
  MOJALOOP: {
    participantId: 'mymoolah-demo',
    apiVersion: 'v1.1',
    baseUrl: 'https://mojaloop-api.demo' // Replace with production URL
  },
  
  // Security Settings - UPDATED FOR COMPLEX PASSWORD SYSTEM
  SECURITY: {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 3,
    // Updated password requirements (removed pinLength)
    passwordRequirements: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true,
      allowedSpecialChars: '!@#$%^&*(),.?\":{}|<>'
    },
    // Multi-input authentication settings
    authentication: {
      supportedTypes: ['phone', 'account', 'username'],
      phoneFormats: ['+27XXXXXXXXX', '27XXXXXXXXX', '0XXXXXXXXX'],
      accountNumberLength: { min: 8, max: 12 },
      usernameLength: { min: 4, max: 32 },
      usernameAllowedChars: 'letters, numbers, periods, underscores'
    },
    enableEncryption: true
  },
  
  // Performance Settings (optimized for low-cost Android devices)
  PERFORMANCE: {
    enableAnimations: true,
    imageOptimization: true,
    lazyLoading: true,
    cacheTimeout: 5 * 60 * 1000 // 5 minutes
  }
};

// SA Mobile Number normalization helper - FIXES THE LOGIN ISSUE
const normalizeSAMobileNumber = (phoneNumber: string): string => {
  const cleanNumber = phoneNumber.replace(/\s/g, '');
  
  // Convert to 27XXXXXXXXX format
  if (cleanNumber.startsWith('+27')) {
    return cleanNumber.slice(1); // Remove +
  } else if (cleanNumber.startsWith('0')) {
    return '27' + cleanNumber.slice(1); // Replace 0 with 27
  } else if (cleanNumber.startsWith('27')) {
    return cleanNumber; // Already correct format
  }
  
  return cleanNumber;
};

/**
 * Helper function to check if app is in demo mode
 */
export const isDemoMode = () => APP_CONFIG.DEMO_MODE;

/**
 * Helper function to check if app is in production
 */
export const isProduction = () => APP_CONFIG.ENVIRONMENT === 'production';

/**
 * Get primary demo credentials (only in demo mode) - BACKWARD COMPATIBILITY
 */
export const getDemoCredentials = () => {
  if (!isDemoMode()) {
    throw new Error('Demo credentials not available in production mode');
  }
  return APP_CONFIG.DEMO_CREDENTIALS;
};

/**
 * Get all demo accounts for testing multi-input authentication
 */
export const getAllDemoAccounts = () => {
  if (!isDemoMode()) {
    throw new Error('Demo credentials not available in production mode');
  }
  return APP_CONFIG.DEMO_CREDENTIALS.accounts;
};

/**
 * Get demo account by identifier type
 */
export const getDemoAccountByType = (type: 'phone' | 'account' | 'username') => {
  if (!isDemoMode()) {
    throw new Error('Demo credentials not available in production mode');
  }
  return APP_CONFIG.DEMO_CREDENTIALS.accounts.find(account => account.type === type);
};

/**
 * Validate if given credentials match any demo account - FIXED FOR PHONE NUMBER NORMALIZATION
 */
export const validateDemoCredentials = (identifier: string, password: string): boolean => {
  if (!isDemoMode()) {
    return false;
  }
  
  // Normalize input for phone number comparison
  const normalizedInput = normalizeSAMobileNumber(identifier);
  
  // Check primary credentials (backward compatibility)
  const primary = APP_CONFIG.DEMO_CREDENTIALS;
  const normalizedPrimary = normalizeSAMobileNumber(primary.phoneNumber);
  
  if (normalizedInput === normalizedPrimary && password === primary.password) {
    return true;
  }
  
  // Check all demo accounts with normalization for phone numbers
  return APP_CONFIG.DEMO_CREDENTIALS.accounts.some(account => {
    if (account.type === 'phone') {
      // For phone numbers, normalize both stored and input values before comparison
      const normalizedStored = normalizeSAMobileNumber(account.identifier);
      return normalizedStored === normalizedInput && account.password === password;
    } else {
      // For non-phone types (account numbers, usernames), use exact match
      return account.identifier === identifier && account.password === password;
    }
  });
};

/**
 * Get password requirements for validation
 */
export const getPasswordRequirements = () => APP_CONFIG.SECURITY.passwordRequirements;

/**
 * Get authentication settings
 */
export const getAuthenticationSettings = () => APP_CONFIG.SECURITY.authentication;

/**
 * Get launch statistics for production mode
 */
export const getLaunchStats = () => APP_CONFIG.LAUNCH_STATS;

/**
 * Demo Credentials Quick Reference (for development)
 * ================================================
 * 
 * BACKEND TESTING MODE (DEMO_MODE = false):
 * - All registration/login calls go to real backend
 * - API Base URL: http://localhost:3001
 * - Phone numbers normalized to 27XXXXXXXXX format
 * 
 * LOGIN (SA Mobile Numbers Only):
 * - 27821234567 / Demo123!
 * - 27721234567 / Test456#
 * 
 * REGISTRATION (Multi-Input Support):
 * Phone Numbers:
 * - 27821234567 / Demo123!
 * - 27721234567 / Test456#
 * 
 * Account Numbers:
 * - 123456789 / Account789$
 * - 987654321012 / Secure456&
 * 
 * Usernames:
 * - demo_user / User123@
 * - john.doe / MyPass789!
 * 
 * All passwords meet complex requirements:
 * ✓ 8+ characters
 * ✓ Uppercase letter
 * ✓ Lowercase letter  
 * ✓ Number
 * ✓ Special character
 * 
 * REAL BACKEND TESTING:
 * ✓ Register: "Andre Botes" / "andre@mymoolah.africa" / "0825571055" → API CALL
 * ✓ Register: "John Doe" / "john@test.com" / "27821234567" → API CALL
 * ✓ Login: Real users created in database → API CALL
 */

/**
 * Production Launch Checklist - UPDATED FOR BACKEND TESTING
 * TODO: Before production launch:
 * 1. ✅ Set DEMO_MODE to false (DONE for backend testing)
 * 2. Set ENVIRONMENT to 'production'
 * 3. ✅ Update API baseUrl to local backend (DONE for testing)
 * 4. Update Mojaloop configuration
 * 5. Enable analytics
 * 6. Update launch statistics
 * 7. ✅ Test real backend authentication (ENABLED)
 * 8. ✅ Verify complex password validation in production (READY)
 * 9. ✅ Test all three identifier types (phone/account/username) (READY)
 * 10. ✅ Verify South African phone number validation (READY)
 * 11. ✅ Test phone number normalization with backend (READY)
 */
export const PRODUCTION_CHECKLIST = [
  '✅ Set DEMO_MODE to false (DONE for backend testing)',
  'Set ENVIRONMENT to production',
  '✅ Update API endpoints (DONE for local testing)',
  'Configure Mojaloop production settings',
  'Enable analytics and monitoring',
  'Update launch statistics',
  '✅ Enable real backend authentication (DONE)',
  '✅ Test complete multi-input authentication flow (READY)',
  '✅ Verify complex password validation in production (READY)',
  '✅ Test phone number validation (SA format) (READY)',
  '✅ Test account number validation (8-12 digits) (READY)',
  '✅ Test username validation (4-32 chars) (READY)',
  '✅ Verify security settings and password requirements (READY)',
  'Performance testing on low-cost devices',
  '✅ Test real-time validation feedback (READY)',
  '✅ Test phone number normalization consistency (READY)'
];