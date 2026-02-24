/**
 * Yellow Card Service
 *
 * Integration with Yellow Card Payments API for MoolahMove international disbursements.
 * Yellow Card converts USDC (Solana) to local fiat and pays out to mobile money
 * or bank accounts across 20+ African countries.
 *
 * API Docs: https://docs.yellowcard.engineering
 * Contact:  paymentsapi@yellowcard.io
 *
 * Status: SKELETON — awaiting Yellow Card KYB approval and sandbox credentials.
 *         All methods are structured and ready; replace TODO comments with live calls
 *         once credentials are received.
 *
 * Authentication: HMAC-SHA256
 *   Headers:
 *     X-YC-Timestamp: Unix timestamp in milliseconds
 *     X-YC-Signature: HMAC-SHA256(secret, timestamp + METHOD + path + body)
 *     X-YC-Key: API key
 *
 * Banking-Grade Features:
 *   - HMAC-SHA256 request signing (same pattern as VALR HMAC-SHA512)
 *   - Retry logic with exponential backoff (3 attempts)
 *   - Circuit breaker (5 failures → 5 minute cooldown)
 *   - 30 second request timeout
 *   - Webhook signature verification
 *   - Comprehensive structured logging
 */

const crypto = require('crypto');
const axios = require('axios');

class YellowCardService {
  constructor() {
    this.baseUrl = process.env.YELLOW_CARD_API_URL || 'https://sandbox.yellowcard.engineering';
    this.apiKey = process.env.YELLOW_CARD_API_KEY;
    this.apiSecret = process.env.YELLOW_CARD_API_SECRET;
    this.webhookSecret = process.env.YELLOW_CARD_WEBHOOK_SECRET;
    this.timeout = 30000;
    this.maxRetries = 3;
    this.circuitBreakerThreshold = 5;
    this.circuitBreakerResetTime = 300000; // 5 minutes
    this.failureCount = 0;
    this.circuitOpen = false;
    this.lastFailureTime = null;
  }

  /**
   * Check if Yellow Card credentials are configured
   */
  isConfigured() {
    return !!(this.apiKey && this.apiSecret);
  }

  /**
   * Generate HMAC-SHA256 signature for Yellow Card API request
   *
   * @param {string} timestamp - Unix timestamp in milliseconds
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} path - API path (e.g., /channels)
   * @param {string} body - Request body as JSON string (empty string for GET)
   * @returns {string} HMAC-SHA256 hex signature
   */
  signRequest(timestamp, method, path, body = '') {
    if (!this.apiSecret || typeof this.apiSecret !== 'string') {
      const err = new Error('Yellow Card API secret not configured');
      err.code = 'YELLOWCARD_NOT_CONFIGURED';
      throw err;
    }
    const payload = `${timestamp}${method.toUpperCase()}${path}${body}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Make an authenticated request to the Yellow Card API
   *
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {Object|null} data - Request body (null for GET)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(method, path, data = null, options = {}) {
    if (!this.isConfigured()) {
      const err = new Error('Yellow Card API credentials not configured. Contact paymentsapi@yellowcard.io to get sandbox credentials.');
      err.code = 'YELLOWCARD_NOT_CONFIGURED';
      throw err;
    }

    // Circuit breaker check
    if (this.circuitOpen) {
      if (Date.now() - this.lastFailureTime > this.circuitBreakerResetTime) {
        this.circuitOpen = false;
        this.failureCount = 0;
        console.log('[YellowCard] Circuit breaker reset');
      } else {
        const err = new Error('Yellow Card service temporarily unavailable (circuit breaker open)');
        err.code = 'YELLOWCARD_CIRCUIT_OPEN';
        throw err;
      }
    }

    const timestamp = Date.now().toString();
    const body = data ? JSON.stringify(data) : '';
    const signature = this.signRequest(timestamp, method, path, body);

    const headers = {
      'X-YC-Key': this.apiKey,
      'X-YC-Signature': signature,
      'X-YC-Timestamp': timestamp,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios({
          method,
          url: `${this.baseUrl}${path}`,
          headers,
          data: data || undefined,
          timeout: options.timeout || this.timeout,
        });

        this.failureCount = 0;
        return response.data;

      } catch (error) {
        lastError = error;

        console.error('[YellowCard] Request failed', {
          attempt,
          path,
          method,
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });

        if (attempt === this.maxRetries || !this.isRetryableError(error)) {
          break;
        }

        const backoffMs = 1000 * Math.pow(2, attempt);
        await this.sleep(backoffMs);
      }
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.circuitBreakerThreshold) {
      this.circuitOpen = true;
      console.error('[YellowCard] Circuit breaker opened', {
        failureCount: this.failureCount,
        threshold: this.circuitBreakerThreshold,
      });
    }

    throw lastError;
  }

  isRetryableError(error) {
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED' ||
      error.response?.status === 503 ||
      error.response?.status === 429 ||
      error.response?.status === 502
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================
  // CHANNELS
  // ============================================================

  /**
   * Get available payment channels for a country
   *
   * Used to populate the MoolahMove beneficiary form with available
   * mobile money and bank transfer options per country.
   *
   * GET /channels?country=MW
   *
   * @param {string} countryCode - ISO 2-letter country code (e.g., 'MW', 'KE')
   * @returns {Promise<Array>} Array of channel objects
   *
   * Response shape (per channel):
   * {
   *   id: 'mw-airtel-mobile',
   *   name: 'Airtel Money',
   *   type: 'mobile_money',    // or 'bank_transfer'
   *   country: 'MW',
   *   currency: 'MWK',
   *   minAmount: 100,
   *   maxAmount: 500000,
   *   processingTime: '< 5 minutes'
   * }
   */
  async getChannels(countryCode) {
    // TODO (Phase 2): Replace with live API call once sandbox credentials received
    // const data = await this.makeRequest('GET', `/channels?country=${countryCode}`);
    // return data.channels || data;

    // Phase 0/1 fallback — static channel list (matches AddAccountModal.tsx)
    const STATIC_CHANNELS = {
      MW: [
        { id: 'mw-airtel-mobile', name: 'Airtel Money', type: 'mobile_money', country: 'MW', currency: 'MWK' },
        { id: 'mw-tnm-mobile', name: 'TNM Mpamba', type: 'mobile_money', country: 'MW', currency: 'MWK' },
        { id: 'mw-bank', name: 'Bank Transfer', type: 'bank_transfer', country: 'MW', currency: 'MWK' },
      ],
      KE: [
        { id: 'ke-mpesa-mobile', name: 'M-Pesa', type: 'mobile_money', country: 'KE', currency: 'KES' },
        { id: 'ke-airtel-mobile', name: 'Airtel Money', type: 'mobile_money', country: 'KE', currency: 'KES' },
        { id: 'ke-bank', name: 'Bank Transfer', type: 'bank_transfer', country: 'KE', currency: 'KES' },
      ],
      ZW: [
        { id: 'zw-ecocash-mobile', name: 'EcoCash', type: 'mobile_money', country: 'ZW', currency: 'ZWL' },
        { id: 'zw-onemoney-mobile', name: 'OneMoney', type: 'mobile_money', country: 'ZW', currency: 'ZWL' },
        { id: 'zw-bank', name: 'Bank Transfer', type: 'bank_transfer', country: 'ZW', currency: 'ZWL' },
      ],
      ZM: [
        { id: 'zm-airtel-mobile', name: 'Airtel Money', type: 'mobile_money', country: 'ZM', currency: 'ZMW' },
        { id: 'zm-mtn-mobile', name: 'MTN MoMo', type: 'mobile_money', country: 'ZM', currency: 'ZMW' },
        { id: 'zm-bank', name: 'Bank Transfer', type: 'bank_transfer', country: 'ZM', currency: 'ZMW' },
      ],
      TZ: [
        { id: 'tz-mpesa-mobile', name: 'M-Pesa', type: 'mobile_money', country: 'TZ', currency: 'TZS' },
        { id: 'tz-airtel-mobile', name: 'Airtel Money', type: 'mobile_money', country: 'TZ', currency: 'TZS' },
        { id: 'tz-tigo-mobile', name: 'Tigo Pesa', type: 'mobile_money', country: 'TZ', currency: 'TZS' },
        { id: 'tz-bank', name: 'Bank Transfer', type: 'bank_transfer', country: 'TZ', currency: 'TZS' },
      ],
      UG: [
        { id: 'ug-mtn-mobile', name: 'MTN MoMo', type: 'mobile_money', country: 'UG', currency: 'UGX' },
        { id: 'ug-airtel-mobile', name: 'Airtel Money', type: 'mobile_money', country: 'UG', currency: 'UGX' },
        { id: 'ug-bank', name: 'Bank Transfer', type: 'bank_transfer', country: 'UG', currency: 'UGX' },
      ],
      NG: [
        { id: 'ng-bank', name: 'Bank Transfer', type: 'bank_transfer', country: 'NG', currency: 'NGN' },
      ],
      GH: [
        { id: 'gh-mtn-mobile', name: 'MTN MoMo', type: 'mobile_money', country: 'GH', currency: 'GHS' },
        { id: 'gh-vodafone-mobile', name: 'Vodafone Cash', type: 'mobile_money', country: 'GH', currency: 'GHS' },
        { id: 'gh-bank', name: 'Bank Transfer', type: 'bank_transfer', country: 'GH', currency: 'GHS' },
      ],
      RW: [
        { id: 'rw-mtn-mobile', name: 'MTN MoMo', type: 'mobile_money', country: 'RW', currency: 'RWF' },
        { id: 'rw-airtel-mobile', name: 'Airtel Money', type: 'mobile_money', country: 'RW', currency: 'RWF' },
        { id: 'rw-bank', name: 'Bank Transfer', type: 'bank_transfer', country: 'RW', currency: 'RWF' },
      ],
    };

    return STATIC_CHANNELS[countryCode] || [];
  }

  // ============================================================
  // RATES
  // ============================================================

  /**
   * Get current conversion rate for a channel
   *
   * GET /rates?channelId=mw-airtel-mobile&amount=27.12&currency=USDC
   *
   * @param {string} channelId - Yellow Card channel ID
   * @param {number} usdcAmount - USDC amount to convert
   * @returns {Promise<Object>} Rate data
   *
   * Response shape:
   * {
   *   channelId: 'mw-airtel-mobile',
   *   usdcAmount: 27.12,
   *   localAmount: 35420,
   *   localCurrency: 'MWK',
   *   rate: 1306.5,              // MWK per USDC
   *   expiresAt: '2026-02-24T10:01:00Z'
   * }
   */
  async getRate(channelId, usdcAmount) {
    // TODO (Phase 2): Replace with live API call
    // const data = await this.makeRequest('GET', `/rates?channelId=${channelId}&amount=${usdcAmount}&currency=USDC`);
    // return data;

    // Phase 0/1: Return placeholder rate (will be replaced with live call)
    throw new Error('Yellow Card rate API not yet configured. Complete KYB at paymentsapi@yellowcard.io to get sandbox credentials.');
  }

  // ============================================================
  // DISBURSEMENTS
  // ============================================================

  /**
   * Create a disbursement (cash-out to recipient)
   *
   * POST /disbursements
   *
   * This is the core MoolahMove payout call. Yellow Card will:
   * 1. Debit USDC from MMTP's treasury wallet
   * 2. Convert to local fiat at current rate
   * 3. Disburse to recipient's mobile money or bank account
   *
   * @param {Object} params - Disbursement parameters
   * @param {string} params.sequenceId - Our transaction ID (idempotency key, max 64 chars)
   * @param {string} params.channelId - Yellow Card channel ID (e.g., 'mw-airtel-mobile')
   * @param {number} params.usdcAmount - USDC amount to disburse
   * @param {string} params.recipientName - Recipient full name
   * @param {string} params.recipientAccount - Mobile number or bank account
   * @param {string} params.recipientCountry - ISO 2-letter country code
   * @param {string} params.senderName - Sender full name (Travel Rule)
   * @param {string} params.senderIdNumber - Sender ID/passport number (Travel Rule)
   * @param {string} params.senderCountry - Sender country (Travel Rule)
   * @param {string} params.senderDob - Sender date of birth ISO (Travel Rule)
   * @param {string} params.purpose - Payment purpose (family_support|gift|payment|education|medical|other)
   * @returns {Promise<Object>} Disbursement response
   *
   * Response shape:
   * {
   *   id: 'YC-DISBURSEMENT-ID',
   *   sequenceId: 'MMTP-TXN-ID',
   *   status: 'pending',          // pending|processing|completed|failed
   *   channelId: 'mw-airtel-mobile',
   *   usdcAmount: 27.12,
   *   localAmount: 35420,
   *   localCurrency: 'MWK',
   *   createdAt: '2026-02-24T10:00:00Z'
   * }
   */
  async createDisbursement(params) {
    const {
      sequenceId,
      channelId,
      usdcAmount,
      recipientName,
      recipientAccount,
      recipientCountry,
      senderName,
      senderIdNumber,
      senderCountry,
      senderDob,
      purpose,
    } = params;

    const payload = {
      sequenceId,
      channelId,
      amount: usdcAmount.toString(),
      currency: 'USDC',
      reason: purpose || 'family_support',
      recipient: {
        name: recipientName,
        accountNumber: recipientAccount,
        country: recipientCountry,
      },
      // Travel Rule: sender KYC data (required by Yellow Card for compliance)
      customerDetails: {
        name: senderName,
        country: senderCountry,
        dob: senderDob,
        idNumber: senderIdNumber,
      },
    };

    // TODO (Phase 2): Replace with live API call
    // const data = await this.makeRequest('POST', '/disbursements', payload);
    // return data;

    // Phase 0/1: Throw — not yet live
    throw new Error('Yellow Card disbursement API not yet configured. Complete KYB at paymentsapi@yellowcard.io to get sandbox credentials.');
  }

  /**
   * Get disbursement status
   *
   * GET /disbursements/:id
   *
   * @param {string} disbursementId - Yellow Card disbursement ID
   * @returns {Promise<Object>} Disbursement status
   */
  async getDisbursementStatus(disbursementId) {
    // TODO (Phase 2): Replace with live API call
    // const data = await this.makeRequest('GET', `/disbursements/${disbursementId}`);
    // return data;

    throw new Error('Yellow Card API not yet configured.');
  }

  // ============================================================
  // WEBHOOKS
  // ============================================================

  /**
   * Verify Yellow Card webhook signature
   *
   * Yellow Card signs webhooks with HMAC-SHA256 using the webhook secret.
   * Must be verified before processing any webhook payload.
   *
   * @param {string} timestamp - X-YC-Timestamp header value
   * @param {string} signature - X-YC-Signature header value
   * @param {string} rawBody - Raw request body string (before JSON.parse)
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(timestamp, signature, rawBody) {
    if (!this.webhookSecret) {
      console.error('[YellowCard] Webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}${rawBody}`)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse and validate a Yellow Card webhook event
   *
   * Webhook events:
   *   disbursement.pending    → Payment initiated
   *   disbursement.processing → Payment in progress
   *   disbursement.completed  → Recipient received funds ✓
   *   disbursement.failed     → Payment failed (retry or refund)
   *
   * @param {Object} headers - Request headers
   * @param {string} rawBody - Raw request body string
   * @returns {Object} Parsed event or throws on invalid signature
   */
  parseWebhookEvent(headers, rawBody) {
    const timestamp = headers['x-yc-timestamp'];
    const signature = headers['x-yc-signature'];

    if (!timestamp || !signature) {
      const err = new Error('Missing Yellow Card webhook headers');
      err.code = 'WEBHOOK_MISSING_HEADERS';
      throw err;
    }

    // Reject webhooks older than 5 minutes (replay attack prevention)
    const webhookAge = Date.now() - parseInt(timestamp, 10);
    if (webhookAge > 300000) {
      const err = new Error('Yellow Card webhook timestamp too old (replay attack prevention)');
      err.code = 'WEBHOOK_EXPIRED';
      throw err;
    }

    if (!this.verifyWebhookSignature(timestamp, signature, rawBody)) {
      const err = new Error('Yellow Card webhook signature verification failed');
      err.code = 'WEBHOOK_INVALID_SIGNATURE';
      throw err;
    }

    return JSON.parse(rawBody);
  }

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  /**
   * Check Yellow Card service health and configuration status
   *
   * @returns {Object} Health status
   */
  async healthCheck() {
    const configured = this.isConfigured();
    const isSandbox = this.baseUrl.includes('sandbox');

    return {
      configured,
      environment: isSandbox ? 'sandbox' : 'production',
      circuitOpen: this.circuitOpen,
      failureCount: this.failureCount,
      status: configured ? (this.circuitOpen ? 'degraded' : 'ready') : 'not_configured',
      message: configured
        ? (this.circuitOpen ? 'Circuit breaker open — service temporarily unavailable' : 'Yellow Card service ready')
        : 'Yellow Card credentials not configured. Contact paymentsapi@yellowcard.io',
    };
  }
}

module.exports = new YellowCardService();
