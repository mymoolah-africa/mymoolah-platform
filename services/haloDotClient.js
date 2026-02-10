'use strict';

/**
 * Halo Dot Client
 * Wrapper for Halo Dot Intent API (tap-to-deposit).
 * Docs: https://halo-dot-developer-docs.gitbook.io/halo-dot/readme/transaction-app2app-integration-guide
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-10
 */

const https = require('https');
const http = require('http');

const env = process.env.HALO_DOT_ENV || 'qa';
const merchantId = process.env.HALO_DOT_MERCHANT_ID;
const apiKey = process.env.HALO_DOT_API_KEY;
const kernelBaseUrl = process.env.HALO_DOT_KERNEL_BASE_URL || `https://kernelserver.${env}.haloplus.io`;
const authBaseUrl = process.env.HALO_DOT_AUTH_BASE_URL || `https://authserver.${env}.haloplus.io`;

function isConfigured() {
  return Boolean(merchantId && apiKey);
}

/**
 * Create intent transaction via Halo Dot API.
 * @param {Object} params
 * @param {string} params.merchantId - Merchant/Integrator ID
 * @param {string} params.paymentReference - MSISDN (user mobile) for Standard Bank T-PPP allocation
 * @param {string} params.amount - Amount e.g. "100.01"
 * @param {string} params.timestamp - ISO 8601
 * @param {string} params.currencyCode - e.g. "ZAR"
 * @returns {Promise<{ consumerTransactionId: string, jwt: string }>}
 */
async function createIntentTransaction({ merchantId: mId, paymentReference, amount, timestamp, currencyCode }) {
  if (!isConfigured()) {
    throw Object.assign(new Error('Halo Dot is not configured'), { code: 'HALO_NOT_CONFIGURED' });
  }

  const url = new URL(`${kernelBaseUrl}/consumer/intentTransaction`);
  const amountNum = Number(amount);
  if (isNaN(amountNum)) {
    throw Object.assign(new Error('Amount must be a valid number'), { code: 'HALO_API_ERROR' });
  }
  const body = JSON.stringify({
    merchantId: String(mId || merchantId),
    paymentReference: String(paymentReference),
    amount: amountNum,
    timestamp: String(timestamp),
    currencyCode: String(currencyCode || 'ZAR'),
  });

  const response = await makeRequest({
    method: 'POST',
    url: url.toString(),
    body,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  if (response.statusCode !== 200) {
    const errMsg = (response.body && (response.body.message || response.body.error)) || `HTTP ${response.statusCode}`;
    throw Object.assign(new Error(`Halo Intent API error: ${errMsg}`), {
      code: 'HALO_API_ERROR',
      statusCode: response.statusCode,
      body: response.body,
    });
  }

  const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
  return {
    consumerTransactionId: data.consumerTransactionId || data.consumerTransactionID,
    jwt: data.jwt || data.token,
  };
}

/**
 * Get deep link for Halo.Go/Halo.Link (optional).
 * @param {Object} params - Same as createIntentTransaction
 * @returns {Promise<{ deepLink: string }>}
 */
async function getDeepLink(params) {
  if (!isConfigured()) {
    throw Object.assign(new Error('Halo Dot is not configured'), { code: 'HALO_NOT_CONFIGURED' });
  }

  const url = new URL(`${kernelBaseUrl}/consumer/qrCode`);
  const amountNum = Number(params.amount);
  const body = JSON.stringify({
    merchantId: String(params.merchantId || merchantId),
    paymentReference: String(params.paymentReference),
    amount: isNaN(amountNum) ? 0 : amountNum,
    timestamp: String(params.timestamp),
    currencyCode: String(params.currencyCode || 'ZAR'),
  });

  const response = await makeRequest({
    method: 'POST',
    url: url.toString(),
    body,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  if (response.statusCode !== 200) {
    throw Object.assign(new Error(`Halo QR/DeepLink API error: ${response.statusCode}`), {
      code: 'HALO_API_ERROR',
      statusCode: response.statusCode,
    });
  }

  const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
  return { deepLink: data.deepLink || data.url || data.link || '' };
}

function makeRequest({ method, url, body, headers }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const req = (isHttps ? https : http).request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body || '') },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsedBody;
          try {
            parsedBody = data ? JSON.parse(data) : {};
          } catch {
            parsedBody = data;
          }
          resolve({ statusCode: res.statusCode, body: parsedBody });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Halo API request timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

module.exports = {
  isConfigured,
  createIntentTransaction,
  getDeepLink,
  env,
  merchantId,
};
