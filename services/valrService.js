/**
 * VALR Service
 * 
 * Integration with VALR cryptocurrency exchange (FSP 53308)
 * Handles USDC purchases and withdrawals to Solana addresses
 * 
 * Banking-Grade Features:
 * - HMAC-SHA512 request signing
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Timeout handling (30s max)
 * - Comprehensive error handling
 * - Request/response logging
 */

const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

class ValrService {
  constructor() {
    this.baseUrl = process.env.VALR_API_URL || 'https://api.valr.com';
    this.apiKey = process.env.VALR_API_KEY;
    this.apiSecret = process.env.VALR_API_SECRET;
    this.timeout = 30000;  // 30 second timeout
    this.maxRetries = 3;
    this.circuitBreakerThreshold = 5;
    this.circuitBreakerResetTime = 300000;  // 5 minutes
    this.failureCount = 0;
    this.circuitOpen = false;
    this.lastFailureTime = null;
  }

  /**
   * Generate HMAC-SHA512 signature for VALR API request
   * 
   * @param {string} timestamp - Unix timestamp in milliseconds
   * @param {string} verb - HTTP method (GET, POST, etc.)
   * @param {string} path - API path (e.g., /v1/account/balances)
   * @param {string} body - Request body as JSON string
   * @returns {string} HMAC-SHA512 hex signature
   */
  signRequest(timestamp, verb, path, body = '') {
    const payload = `${timestamp}${verb.toUpperCase()}${path}${body}`;
    return crypto
      .createHmac('sha512', this.apiSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Make authenticated request to VALR API with retry logic and circuit breaker
   * 
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {Object} data - Request body
   * @param {Object} options - Additional options (timeout, etc.)
   * @returns {Promise<Object>} API response data
   */
  async makeRequest(method, path, data = null, options = {}) {
    // Circuit breaker check
    if (this.circuitOpen) {
      if (Date.now() - this.lastFailureTime > this.circuitBreakerResetTime) {
        this.circuitOpen = false;
        this.failureCount = 0;
        logger.info('[ValrService] Circuit breaker reset');
      } else {
        const error = new Error('VALR service temporarily unavailable (circuit breaker open)');
        error.code = 'CIRCUIT_BREAKER_OPEN';
        throw error;
      }
    }

    const timestamp = Date.now().toString();
    const body = data ? JSON.stringify(data) : '';
    const signature = this.signRequest(timestamp, method, path, body);

    const headers = {
      'X-VALR-API-KEY': this.apiKey,
      'X-VALR-SIGNATURE': signature,
      'X-VALR-TIMESTAMP': timestamp,
      'Content-Type': 'application/json'
    };

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info('[ValrService] Request', {
          method,
          path,
          attempt,
          timestamp
        });

        const response = await axios({
          method,
          url: `${this.baseUrl}${path}`,
          headers,
          data: data || undefined,
          timeout: options.timeout || this.timeout
        });

        // Success - reset failure count
        this.failureCount = 0;
        
        logger.info('[ValrService] Response', {
          method,
          path,
          status: response.status,
          attempt
        });

        return response.data;

      } catch (error) {
        lastError = error;
        
        // Log error with details
        logger.error('[ValrService] Request failed', {
          attempt,
          maxRetries: this.maxRetries,
          method,
          path,
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          code: error.code
        });

        // Check if retryable
        if (attempt === this.maxRetries || !this.isRetryableError(error)) {
          logger.error('[ValrService] Max retries reached or non-retryable error', {
            attempt,
            maxRetries: this.maxRetries,
            retryable: this.isRetryableError(error)
          });
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = 1000 * Math.pow(2, attempt - 1);
        logger.info('[ValrService] Retrying after backoff', { backoffMs, nextAttempt: attempt + 1 });
        await this.sleep(backoffMs);
      }
    }

    // All retries failed - update circuit breaker
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Open circuit breaker if threshold reached
    if (this.failureCount >= this.circuitBreakerThreshold) {
      this.circuitOpen = true;
      logger.error('[ValrService] Circuit breaker opened', {
        failureCount: this.failureCount,
        threshold: this.circuitBreakerThreshold,
        resetTimeMs: this.circuitBreakerResetTime
      });
    }

    // Enhance error with context
    const enhancedError = new Error(`VALR API request failed: ${lastError.message}`);
    enhancedError.originalError = lastError;
    enhancedError.status = lastError.response?.status;
    enhancedError.data = lastError.response?.data;
    enhancedError.code = lastError.code || 'VALR_API_ERROR';
    
    throw enhancedError;
  }

  /**
   * Check if error is retryable
   * 
   * @param {Error} error - Error from axios
   * @returns {boolean} True if should retry
   */
  isRetryableError(error) {
    // Network errors
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNREFUSED') {
      return true;
    }

    // Retryable HTTP status codes
    const retryableStatuses = [429, 502, 503, 504];
    if (error.response && retryableStatuses.includes(error.response.status)) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for backoff
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================
  // PUBLIC API METHODS
  // ============================================================

  /**
   * Get current market rate for USDC/ZAR
   * 
   * @param {string} pair - Currency pair (default: USDCZAR)
   * @returns {Promise<Object>} Rate data
   */
  async getMarketRate(pair = 'USDCZAR') {
    try {
      const data = await this.makeRequest('GET', `/v1/public/${pair}/marketsummary`);
      
      return {
        pair,
        bidPrice: parseFloat(data.bidPrice),
        askPrice: parseFloat(data.askPrice),
        midPrice: (parseFloat(data.bidPrice) + parseFloat(data.askPrice)) / 2,
        lastTrade: parseFloat(data.lastTradedPrice),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('[ValrService] Failed to get market rate', { pair, error: error.message });
      throw error;
    }
  }

  /**
   * Get instant buy quote for USDC
   * 
   * @param {string} pair - Currency pair (e.g., USDCZAR)
   * @param {number} zarAmount - Amount in ZAR to spend
   * @returns {Promise<Object>} Quote details
   */
  async getInstantQuote(pair, zarAmount) {
    try {
      const data = await this.makeRequest('POST', '/v1/simple/quote', {
        pair,
        payInCurrency: 'ZAR',
        payAmount: zarAmount.toFixed(2),
        side: 'BUY'
      });
      
      return {
        orderId: data.orderId,
        usdcAmount: parseFloat(data.receiveAmount),
        zarAmount: parseFloat(data.payAmount),
        rate: parseFloat(data.price),
        expiresAt: new Date(Date.now() + 60000),  // 60 second quote expiry
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('[ValrService] Failed to get instant quote', { 
        pair, 
        zarAmount, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Execute instant buy order
   * 
   * @param {string} orderId - Quote order ID from getInstantQuote
   * @param {string} idempotencyKey - Unique key for idempotent execution
   * @returns {Promise<Object>} Order execution result
   */
  async executeInstantOrder(orderId, idempotencyKey) {
    try {
      // Add idempotency key to prevent duplicate orders
      const data = await this.makeRequest('POST', '/v1/simple/order', {
        orderId,
        // VALR doesn't support idempotency key in body, but we log it
        _idempotencyKey: idempotencyKey
      });
      
      logger.info('[ValrService] Instant order executed', {
        orderId,
        idempotencyKey,
        status: data.status
      });
      
      return {
        orderId: data.orderId,
        status: data.status,
        usdcAmount: parseFloat(data.receiveAmount),
        zarAmount: parseFloat(data.payAmount),
        executedAt: new Date()
      };
    } catch (error) {
      logger.error('[ValrService] Failed to execute instant order', { 
        orderId,
        idempotencyKey,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Withdraw USDC to Solana address
   * 
   * @param {Object} params - Withdrawal parameters
   * @param {number} params.amount - USDC amount to withdraw
   * @param {string} params.address - Solana wallet address
   * @param {string} params.network - Network (must be 'solana')
   * @param {string} params.paymentReference - Unique reference
   * @returns {Promise<Object>} Withdrawal result
   */
  async withdrawUsdc(params) {
    const { amount, address, network, paymentReference } = params;
    
    // Validate network
    if (network !== 'solana') {
      throw new Error('Only Solana network is supported for USDC withdrawals');
    }

    try {
      const data = await this.makeRequest('POST', '/v1/wallet/crypto/USDC/withdraw', {
        amount: amount.toFixed(6),  // USDC has 6 decimals
        address,
        network: 'solana',
        paymentReference
      });
      
      logger.info('[ValrService] USDC withdrawal initiated', {
        withdrawalId: data.id,
        amount,
        address: address.substring(0, 8) + '...',  // Log partial address only
        paymentReference
      });
      
      return {
        id: data.id,
        status: data.status,
        txHash: data.transactionHash || null,
        confirmations: data.confirmationCount || 0,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('[ValrService] Failed to withdraw USDC', { 
        amount,
        address: address.substring(0, 8) + '...',
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get withdrawal status
   * 
   * @param {string} withdrawalId - VALR withdrawal ID
   * @returns {Promise<Object>} Withdrawal status
   */
  async getWithdrawalStatus(withdrawalId) {
    try {
      const data = await this.makeRequest('GET', `/v1/wallet/crypto/USDC/withdraw/${withdrawalId}`);
      
      return {
        id: data.id,
        status: data.status,
        txHash: data.transactionHash,
        confirmations: data.confirmationCount || 0,
        completedAt: data.completedTime ? new Date(data.completedTime) : null
      };
    } catch (error) {
      logger.error('[ValrService] Failed to get withdrawal status', { 
        withdrawalId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get VALR account balances
   * 
   * @returns {Promise<Array>} Account balances
   */
  async getAccountBalances() {
    try {
      const data = await this.makeRequest('GET', '/v1/account/balances');
      return data;
    } catch (error) {
      logger.error('[ValrService] Failed to get account balances', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check - verify VALR API is accessible
   * 
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      // Use public endpoint for health check (no auth required)
      const response = await axios.get(`${this.baseUrl}/v1/public/time`, {
        timeout: 5000
      });
      
      return {
        healthy: true,
        timestamp: response.data,
        circuitOpen: this.circuitOpen,
        failureCount: this.failureCount
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        circuitOpen: this.circuitOpen,
        failureCount: this.failureCount
      };
    }
  }

  /**
   * Check if VALR service is enabled and configured
   * 
   * @returns {boolean} True if properly configured
   */
  isConfigured() {
    return !!(this.apiKey && this.apiSecret);
  }

  /**
   * Get circuit breaker status
   * 
   * @returns {Object} Circuit breaker state
   */
  getCircuitBreakerStatus() {
    return {
      open: this.circuitOpen,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      threshold: this.circuitBreakerThreshold,
      resetTimeMs: this.circuitBreakerResetTime
    };
  }

  /**
   * Manually reset circuit breaker (admin/debugging use)
   */
  resetCircuitBreaker() {
    this.circuitOpen = false;
    this.failureCount = 0;
    this.lastFailureTime = null;
    logger.info('[ValrService] Circuit breaker manually reset');
  }
}

// Export singleton instance
module.exports = new ValrService();
