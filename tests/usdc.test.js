/**
 * USDC Send Feature - Unit Tests
 * 
 * Tests for:
 * - Solana address validation
 * - Fee calculation
 * - Limit validation
 * - Compliance rule evaluation
 */

const { isValidSolanaAddress, detectKnownPattern } = require('../utils/solanaAddressValidator');

describe('USDC Send Feature', () => {
  describe('Solana Address Validation', () => {
    it('should validate a correct Solana address', () => {
      // Valid Solana mainnet address (example)
      const validAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
      const result = isValidSolanaAddress(validAddress);
      
      expect(result.valid).toBe(true);
    });

    it('should reject null or undefined address', () => {
      expect(isValidSolanaAddress(null).valid).toBe(false);
      expect(isValidSolanaAddress(undefined).valid).toBe(false);
      expect(isValidSolanaAddress('').valid).toBe(false);
    });

    it('should reject addresses that are too short', () => {
      const shortAddress = 'abc123';
      const result = isValidSolanaAddress(shortAddress);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('32-44 characters');
    });

    it('should reject addresses with invalid characters', () => {
      // Contains invalid Base58 characters (0, O, I, l)
      const invalidAddress = '0000000000000000000000000000000000000000';
      const result = isValidSolanaAddress(invalidAddress);
      
      expect(result.valid).toBe(false);
    });

    it('should detect system program addresses', () => {
      const systemProgram = '11111111111111111111111111111111';
      const result = isValidSolanaAddress(systemProgram);
      const pattern = detectKnownPattern(systemProgram);
      
      expect(result.valid).toBe(true);
      expect(pattern).toBeDefined();
      expect(pattern.type).toBe('program');
      expect(pattern.warning).toContain('do not send');
    });

    it('should trim whitespace from addresses', () => {
      const addressWithSpaces = '  7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV  ';
      const result = isValidSolanaAddress(addressWithSpaces);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Fee Calculation', () => {
    // Mock the service for testing
    const UsdcTransactionService = require('../services/usdcTransactionService');
    
    it('should calculate 7.5% platform fee correctly', () => {
      const zarAmount = 1000; // R1,000
      const exchangeRate = 18.5; // R18.50 per USDC
      
      const result = UsdcTransactionService.calculateAmounts(zarAmount, exchangeRate);
      
      expect(result.platformFeeCents).toBe(7500); // R75 (7.5% of R1,000)
      expect(result.platformFeeZar).toBe(75);
    });

    it('should extract VAT from platform fee', () => {
      const zarAmount = 1000; // R1,000
      const exchangeRate = 18.5;
      
      const result = UsdcTransactionService.calculateAmounts(zarAmount, exchangeRate);
      
      // VAT = 15/115 of platform fee
      // Platform fee = R75
      // VAT = R75 * (15/115) = R9.78 ≈ R9.78 (978 cents)
      expect(result.platformFeeVatCents).toBeGreaterThan(970);
      expect(result.platformFeeVatCents).toBeLessThan(990);
    });

    it('should calculate net amount to VALR correctly', () => {
      const zarAmount = 1000; // R1,000
      const exchangeRate = 18.5;
      
      const result = UsdcTransactionService.calculateAmounts(zarAmount, exchangeRate);
      
      // Net = R1,000 - R75 fee = R925
      expect(result.netToValrZar).toBe(925);
      expect(result.netToValrCents).toBe(92500);
    });

    it('should calculate USDC amount using exchange rate', () => {
      const zarAmount = 925; // Net after fee
      const exchangeRate = 18.5; // R18.50 per USDC
      
      const result = UsdcTransactionService.calculateAmounts(1000, exchangeRate);
      
      // USDC = R925 / 18.5 = 50 USDC
      expect(result.usdcAmount).toBeCloseTo(50, 1);
    });

    it('should estimate network fee for Solana', () => {
      const zarAmount = 1000;
      const exchangeRate = 18.5;
      
      const result = UsdcTransactionService.calculateAmounts(zarAmount, exchangeRate);
      
      // Network fee ~$0.00025 * R18.5 = R0.0046 ≈ R0.01
      expect(result.networkFeeZar).toBeGreaterThan(0);
      expect(result.networkFeeZar).toBeLessThan(1); // Should be less than R1
    });
  });

  describe('Transaction Limits', () => {
    it('should enforce per-transaction limit of R5,000', () => {
      const service = require('../services/usdcTransactionService');
      expect(service.limits.perTxn).toBe(5000);
    });

    it('should enforce daily limit of R15,000', () => {
      const service = require('../services/usdcTransactionService');
      expect(service.limits.daily).toBe(15000);
    });

    it('should enforce monthly limit of R50,000', () => {
      const service = require('../services/usdcTransactionService');
      expect(service.limits.monthly).toBe(50000);
    });

    it('should have new beneficiary daily limit of R5,000', () => {
      const service = require('../services/usdcTransactionService');
      expect(service.limits.newBeneficiaryDaily).toBe(5000);
    });
  });

  describe('Compliance - Blocked Countries', () => {
    const service = require('../services/usdcTransactionService');
    
    it('should block sanctioned countries (OFAC)', () => {
      expect(service.blockedCountries).toContain('CU'); // Cuba
      expect(service.blockedCountries).toContain('IR'); // Iran
      expect(service.blockedCountries).toContain('KP'); // North Korea
      expect(service.blockedCountries).toContain('SY'); // Syria
      expect(service.blockedCountries).toContain('RU'); // Russia
    });

    it('should block occupied Ukraine regions', () => {
      expect(service.blockedCountries).toContain('UA-43'); // Crimea
      expect(service.blockedCountries).toContain('UA-14'); // Donetsk
      expect(service.blockedCountries).toContain('UA-09'); // Luhansk
    });

    it('should identify high-risk countries', () => {
      expect(service.highRiskCountries).toContain('AF'); // Afghanistan
      expect(service.highRiskCountries).toContain('VE'); // Venezuela
      expect(service.highRiskCountries).toContain('MM'); // Myanmar
    });
  });

  describe('VALR Service', () => {
    const valrService = require('../services/valrService');
    
    it('should be properly configured for production', () => {
      expect(valrService.baseUrl).toBe('https://api.valr.com');
      expect(valrService.timeout).toBe(30000); // 30 seconds
      expect(valrService.maxRetries).toBe(3);
    });

    it('should have circuit breaker configured', () => {
      expect(valrService.circuitBreakerThreshold).toBe(5);
      expect(valrService.circuitBreakerResetTime).toBe(300000); // 5 minutes
    });

    it('should generate correct HMAC-SHA512 signature', () => {
      // Test data from VALR documentation
      const timestamp = '1558014486185';
      const verb = 'GET';
      const path = '/v1/account/balances';
      const apiSecret = '4961b74efac86b25cce8fbe4c9811c4c7a787b7a5996660afcc2e287ad864363';
      
      // Temporarily override secret for test
      const originalSecret = valrService.apiSecret;
      valrService.apiSecret = apiSecret;
      
      const signature = valrService.signRequest(timestamp, verb, path, '');
      
      // Restore original secret
      valrService.apiSecret = originalSecret;
      
      expect(signature).toBe('9d52c181ed69460b49307b7891f04658e938b21181173844b5018b2fe783a6d4c62b8e67a03de4d099e7437ebfabe12c56233b73c6a0cc0f7ae87e05f6289928');
    });
  });

  describe('Configuration Validation', () => {
    it('should require Tier 2 KYC', () => {
      const service = require('../services/usdcTransactionService');
      expect(service.minKycTier).toBe(2);
    });

    it('should have 7.5% fee configured', () => {
      const service = require('../services/usdcTransactionService');
      expect(service.feePercent).toBe(7.5);
    });

    it('should have 60-second quote expiry', () => {
      const service = require('../services/usdcTransactionService');
      expect(service.quoteExpirySeconds).toBe(60);
    });
  });
});

// Export for integration tests
module.exports = {
  testAddresses: {
    valid: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
    systemProgram: '11111111111111111111111111111111',
    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    invalid: 'not-a-valid-address'
  }
};
