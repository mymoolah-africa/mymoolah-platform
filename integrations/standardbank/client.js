'use strict';

/**
 * SBSA PayShap API Client
 * RPP (Rapid Payments) and RTP (Request to Pay) - ISO 20022 Pain.001/Pain.013
 * Proxy Resolution (PBPX) - resolve mobile number to bank account before payment
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-21
 */

const axios = require('axios');
const crypto = require('crypto');
const { getToken } = require('./pingAuthService');

const SCOPES = {
  RPP_POST: 'rpp.payments.post',
  RPP_GET: 'rpp.payments.get',
  RTP_POST: 'rpp.requestToPay.post',
  RTP_GET: 'rpp.requestToPay.get',
  PROXY_GET: 'rpp.proxyResolution.get',
};

function guid26() {
  // SBSA requires standard UUID v4 format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
  // matching Postman {{$guid}} — do NOT strip hyphens or truncate
  return crypto.randomUUID();
}

function getBaseUrls() {
  const env = process.env.STANDARDBANK_ENVIRONMENT || 'uat';
  const isUat = env === 'uat';
  return {
    rpp: process.env.SBSA_RPP_BASE_URL || (isUat
      ? 'https://api-gatewaynp.standardbank.co.za/npextorg/extnonprod/rapid-payments'
      : 'https://api-gateway.standardbank.co.za/sbsa/ext-prod/rapid-payments'),
    rtp: process.env.SBSA_RTP_BASE_URL || (isUat
      ? 'https://api-gatewaynp.standardbank.co.za/npextorg/extnonprod/request-to-pay'
      : 'https://api-gateway.standardbank.co.za/sbsa/ext-prod/request-to-pay'),
    proxy: process.env.SBSA_PROXY_BASE_URL || (isUat
      ? 'https://api-gatewaynp.standardbank.co.za/npextorg/extnonprod/proxy-resolution'
      : 'https://api-gateway.standardbank.co.za/sbsa/ext-prod/proxy-resolution'),
  };
}

/**
 * Build common SBSA API headers.
 * @param {string} scope - OAuth scope string
 * @param {Object} options
 * @param {string} [options.callbackType] - 'rpp' or 'rtp' — determines callback URL paths
 * @param {string} [options.sessionIp]
 * @param {string} [options.fapiInteractionId]
 */
async function buildHeaders(scope, options = {}) {
  const token = await getToken(scope);
  const ibmClientId = process.env.SBSA_IBM_CLIENT_ID;
  const ibmClientSecret = process.env.SBSA_IBM_CLIENT_SECRET;
  const callbackBase = process.env.SBSA_CALLBACK_BASE_URL;

  if (!ibmClientId || !ibmClientSecret) {
    throw new Error('SBSA IBM API Gateway credentials not configured (SBSA_IBM_CLIENT_ID, SBSA_IBM_CLIENT_SECRET)');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-IBM-Client-Id': ibmClientId,
    'X-IBM-Client-Secret': ibmClientSecret,
    'Session-Ip': options.sessionIp || '0.0.0.0',
    'x-fapi-interaction-id': options.fapiInteractionId || guid26(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (callbackBase) {
    if (options.callbackType === 'rtp') {
      headers['X-Callback-Url'] = `${callbackBase}/api/v1/standardbank/rtp-callback`;
      headers['X-Realtime-Callback-Url'] = `${callbackBase}/api/v1/standardbank/rtp-realtime-callback`;
    } else {
      headers['X-Callback-Url'] = `${callbackBase}/api/v1/standardbank/callback`;
      headers['X-Realtime-Callback-Url'] = `${callbackBase}/api/v1/standardbank/realtime-callback`;
    }
  }

  return headers;
}

/**
 * Wrap axios errors with structured SBSA error context.
 */
function wrapAxiosError(err, context) {
  if (err.response) {
    const status = err.response.status;
    const body = err.response.data;
    const msg = (typeof body === 'object' ? JSON.stringify(body) : String(body)) || err.message;
    const wrapped = new Error(`SBSA ${context} failed [${status}]: ${msg}`);
    wrapped.sbsaStatus = status;
    wrapped.sbsaBody = body;
    throw wrapped;
  }
  throw new Error(`SBSA ${context} network error: ${err.message}`);
}

/**
 * RPP: Initiate payment (Pain.001)
 * @param {Object} pain001 - Pain.001 JSON payload
 * @returns {Promise<{ status: number, data: Object }>} 202 + Pain.002
 */
async function initiatePayment(pain001) {
  const { rpp } = getBaseUrls();
  const url = `${rpp}/api/payments/initiation`;
  const scope = `${SCOPES.RPP_POST} ${SCOPES.RPP_GET}`;
  const headers = await buildHeaders(scope, { callbackType: 'rpp' });

  try {
    const response = await axios.post(url, pain001, { headers, timeout: 30000 });
    return { status: response.status, data: response.data };
  } catch (err) {
    wrapAxiosError(err, 'RPP initiation');
  }
}

/**
 * RPP: Get payment status
 * @param {string} originalMessageId - msgId from Pain.001
 * @returns {Promise<{ status: number, data: Object }>}
 */
async function getPaymentStatus(originalMessageId) {
  const { rpp } = getBaseUrls();
  const url = `${rpp}/api/payments/initiation/${encodeURIComponent(originalMessageId)}`;
  const headers = await buildHeaders(SCOPES.RPP_GET, { callbackType: 'rpp' });

  try {
    const response = await axios.get(url, { headers, timeout: 15000 });
    return { status: response.status, data: response.data };
  } catch (err) {
    wrapAxiosError(err, 'RPP status');
  }
}

/**
 * RTP: Initiate Request to Pay (Pain.013)
 * @param {Object} pain013 - Pain.013 JSON payload
 * @returns {Promise<{ status: number, data: Object }>} 202 + Pain.014
 */
async function initiateRequestToPay(pain013) {
  const { rtp } = getBaseUrls();
  const url = `${rtp}/api/requestToPay/initiation`;
  const scope = `${SCOPES.RTP_POST} ${SCOPES.RTP_GET}`;
  const headers = await buildHeaders(scope, { callbackType: 'rtp' });

  try {
    const response = await axios.post(url, pain013, { headers, timeout: 30000 });
    return { status: response.status, data: response.data };
  } catch (err) {
    wrapAxiosError(err, 'RTP initiation');
  }
}

/**
 * RTP: Get Request to Pay status
 * @param {string} originalMessageId - msgId from Pain.013
 * @returns {Promise<{ status: number, data: Object }>}
 */
async function getRequestToPayStatus(originalMessageId) {
  const { rtp } = getBaseUrls();
  const url = `${rtp}/api/requestToPay/initiation/${encodeURIComponent(originalMessageId)}`;
  const headers = await buildHeaders(SCOPES.RTP_GET, { callbackType: 'rtp' });

  try {
    const response = await axios.get(url, { headers, timeout: 15000 });
    return { status: response.status, data: response.data };
  } catch (err) {
    wrapAxiosError(err, 'RTP status');
  }
}

module.exports = {
  initiatePayment,
  getPaymentStatus,
  initiateRequestToPay,
  getRequestToPayStatus,
  SCOPES,
  guid26,
};
