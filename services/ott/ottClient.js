'use strict';

const crypto = require('crypto');
const axios = require('axios');

const DEFAULT_ENDPOINTS = {
  performPayout: '/api/purchase/v1/PerformPayout',
  getBalance: '/api/purchase/v1/GetBalance',
  verifyWebhook: '/api/purchase/v1/VerifyWH',
  getPaymentStatus: '/api/purchase/v1/GetPaymentStatus',
  getActiveProviders: '/api/purchase/v1/GetActiveProviders',
  resendSms: '/api/purchase/v1/ResendSMS',
  getUniversalBranchCodes: '/api/purchase/v1/GetUniversalBranchCodes',
  getCountryCodes: '/api/purchase/v1/GetCountryCodes',
  getActiveProviderLimits: '/api/purchase/v1/GetActiveProviderLimits',
};

const SENSITIVE_KEYS = [
  'password',
  'apiKey',
  'hash',
  'Authorization',
  'accountNumber',
  'mobile',
  'nationality',
  'surname',
  'middleName',
  'accountName',
  'webhookSecret',
];

function parseJsonEnv(name, fallback = {}) {
  const raw = process.env[name];
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    const err = new Error(`${name} must be valid JSON`);
    err.statusCode = 500;
    throw err;
  }
}

function getConfig() {
  const endpointOverrides = parseJsonEnv('OTT_ENDPOINTS_JSON', {});
  const hashParamOrder = parseJsonEnv('OTT_HASH_PARAM_ORDER_JSON', {});
  return {
    enabled: String(process.env.OTT_LIVE_INTEGRATION || '').toLowerCase() === 'true' ||
      String(process.env.OTT_TEST_INTEGRATION || '').toLowerCase() === 'true',
    baseUrl: process.env.OTT_API_BASE_URL || 'https://test-payoutapi.ott-mobile.com',
    username: process.env.OTT_API_USERNAME,
    password: process.env.OTT_API_PASSWORD,
    apiKey: process.env.OTT_API_KEY,
    webhookSecret: process.env.OTT_WEBHOOK_SECRET,
    hashFieldName: process.env.OTT_HASH_FIELD_NAME || 'hash',
    timeoutMs: Number(process.env.OTT_API_TIMEOUT_MS || 15000),
    endpoints: { ...DEFAULT_ENDPOINTS, ...endpointOverrides },
    hashParamOrder,
  };
}

function assertConfigured(config = getConfig()) {
  const missing = [];
  if (!config.enabled) {
    const err = new Error('OTT API integration is disabled');
    err.statusCode = 403;
    err.code = 'OTT_INTEGRATION_DISABLED';
    throw err;
  }
  if (!config.baseUrl) missing.push('OTT_API_BASE_URL');
  if (!config.username) missing.push('OTT_API_USERNAME');
  if (!config.password) missing.push('OTT_API_PASSWORD');
  if (!config.apiKey) missing.push('OTT_API_KEY');
  if (missing.length > 0) {
    const err = new Error(`OTT API credentials not configured: ${missing.join(', ')}`);
    err.statusCode = 503;
    err.code = 'OTT_NOT_CONFIGURED';
    throw err;
  }
}

function normaliseHashValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function buildRequestHash(payload, orderedParams, apiKey) {
  if (!Array.isArray(orderedParams) || orderedParams.length === 0) {
    const err = new Error('OTT hash parameter order is not configured for this endpoint');
    err.statusCode = 500;
    err.code = 'OTT_HASH_ORDER_MISSING';
    throw err;
  }
  if (!apiKey) {
    const err = new Error('OTT API key is required for request hashing');
    err.statusCode = 500;
    err.code = 'OTT_API_KEY_MISSING';
    throw err;
  }

  const preimage = orderedParams
    .map((param) => normaliseHashValue(payload[param]))
    .join('') + apiKey;

  return crypto.createHash('sha256').update(preimage, 'utf8').digest('hex');
}

function maskValue(key, value) {
  if (value === null || value === undefined) return value;
  const lowerKey = String(key).toLowerCase();
  if (!SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive.toLowerCase()))) {
    return value;
  }
  const stringValue = String(value);
  if (stringValue.length <= 4) return '****';
  return `${stringValue.slice(0, 2)}***${stringValue.slice(-2)}`;
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, maskValue(key, redact(entryValue))])
    );
  }
  return value;
}

class OttClient {
  constructor(config = getConfig()) {
    this.config = config;
    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
      auth: {
        username: config.username || '',
        password: config.password || '',
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  endpointPath(endpointKey) {
    const path = this.config.endpoints[endpointKey];
    if (!path) {
      const err = new Error(`OTT endpoint path is not configured: ${endpointKey}`);
      err.statusCode = 500;
      err.code = 'OTT_ENDPOINT_MISSING';
      throw err;
    }
    return path;
  }

  signedPayload(endpointKey, payload = {}) {
    const order = this.config.hashParamOrder[endpointKey];
    const hash = buildRequestHash(payload, order, this.config.apiKey);
    return {
      ...payload,
      [this.config.hashFieldName]: hash,
    };
  }

  async post(endpointKey, payload = {}, options = {}) {
    assertConfigured(this.config);
    const path = this.endpointPath(endpointKey);
    const body = options.skipHash ? payload : this.signedPayload(endpointKey, payload);

    try {
      const response = await this.http.post(path, body);
      return {
        status: response.status,
        data: response.data,
        endpointKey,
        request: redact(body),
      };
    } catch (error) {
      const err = new Error(error.response?.data?.message || error.message || 'OTT API request failed');
      err.statusCode = error.response?.status || 502;
      err.code = 'OTT_API_ERROR';
      err.endpointKey = endpointKey;
      err.responseData = redact(error.response?.data || {});
      err.request = redact(body);
      throw err;
    }
  }

  getBalance(payload = {}) {
    return this.post('getBalance', payload);
  }

  getActiveProviders(payload = {}) {
    return this.post('getActiveProviders', payload);
  }

  getActiveProviderLimits(payload = {}) {
    return this.post('getActiveProviderLimits', payload);
  }

  getCountryCodes(payload = {}) {
    return this.post('getCountryCodes', payload);
  }

  getUniversalBranchCodes(payload = {}) {
    return this.post('getUniversalBranchCodes', payload);
  }

  getPaymentStatus(payload = {}) {
    return this.post('getPaymentStatus', payload);
  }

  performPayout(payload = {}) {
    return this.post('performPayout', payload);
  }

  verifyWebhook(payload = {}) {
    return this.post('verifyWebhook', payload);
  }
}

module.exports = {
  OttClient,
  DEFAULT_ENDPOINTS,
  buildRequestHash,
  getConfig,
  redact,
};
