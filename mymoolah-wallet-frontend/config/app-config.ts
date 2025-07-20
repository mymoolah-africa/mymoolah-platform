/**
 * MyMoolah Application Configuration
 * Central configuration for demo/production modes
 */

export const APP_CONFIG = {
  // Demo vs Production Mode
  DEMO_MODE: true, // Set to false for production launch
  
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
  
  // API Configuration
  API: {
    baseUrl: 'https://api.mymoolah.demo', // Replace with production URL
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
      allowedSpecialChars: '!@#$%^&*(),.?":{}|<>'
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
 * Validate if given credentials match any demo account
 */
export const validateDemoCredentials = (identifier: string, password: string): boolean => {
  if (!isDemoMode()) {
    return false;
  }
  
  // Check primary credentials (backward compatibility)
  const primary = APP_CONFIG.DEMO_CREDENTIALS;
  if ((identifier === primary.phoneNumber || identifier === primary.phoneNumber.replace(/\s/g, '')) && 
      password === primary.password) {
    return true;
  }
  
  // Check all demo accounts
  return APP_CONFIG.DEMO_CREDENTIALS.accounts.some(account => 
    account.identifier === identifier && account.password === password
  );
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
 * Phone Numbers (South African format):
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
 */

/**
 * Production Launch Checklist - UPDATED FOR COMPLEX PASSWORD SYSTEM
 * TODO: Before production launch:
 * 1. Set DEMO_MODE to false
 * 2. Set ENVIRONMENT to 'production'
 * 3. Update API baseUrl to production endpoint
 * 4. Update Mojaloop configuration
 * 5. Enable analytics
 * 6. Update launch statistics
 * 7. Test multi-input authentication without demo credentials
 * 8. Verify complex password validation in production
 * 9. Test all three identifier types (phone/account/username)
 * 10. Verify South African phone number validation
 */
export const PRODUCTION_CHECKLIST = [
  'Set DEMO_MODE to false',
  'Set ENVIRONMENT to production',
  'Update API endpoints',
  'Configure Mojaloop production settings',
  'Enable analytics and monitoring',
  'Update launch statistics',
  'Remove demo credentials access',
  'Test complete multi-input authentication flow',
  'Verify complex password validation in production',
  'Test phone number validation (SA format)',
  'Test account number validation (8-12 digits)',
  'Test username validation (4-32 chars)',
  'Verify security settings and password requirements',
  'Performance testing on low-cost devices',
  'Test real-time validation feedback'
];