'use strict';

/**
 * SBSA PayShap API Client
 * RPP (Rapid Payments) and RTP (Request to Pay) - ISO 20022 Pain.001/Pain.013
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

const axios = require('axios');
const crypto = require('crypto');
const { getToken } = require('./pingAuthService');

const SCOPES = {
  RPP_POST: 'rpp.payments.post',
  RPP_GET: 'rpp.payments.get',
  RTP_POST: 'rpp.requestToPay.post',
  RTP_GET: 'rpp.requestToPay.get',
};

function guid26() {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 26);
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
  };
}

async function buildHeaders(scope, options = {}) {
  const token = await getToken(scope);
  const ibmClientId = process.env.SBSA_IBM_CLIENT_ID;
  const ibmClientSecret = process.env.SBSA_IBM_CLIENT_SECRET;
  const callbackBase = process.env.SBSA_CALLBACK_BASE_URL;

  if (!ibmClientId || !ibmClientSecret) {
    throw new Error('SBSA IBM API Gateway credentials not configured');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-IBM-Client-Id': ibmClientId,
    'X-IBM-Client-Secret': ibmClientSecret,
    'Session-Ip': options.sessionIp || '0.0.0.0',
    'X-fapi-interaction-id': options.fapiInteractionId || guid26(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (callbackBase) {
    headers['X-Callback-Url'] = options.callbackUrl || `${callbackBase}/api/v1/standardbank/callback`;
    headers['X-Realtime-Callback-Url'] = options.realtimeCallbackUrl || `${callbackBase}/api/v1/standardbank/realtime-callback`;
  }

  return headers;
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
  const headers = await buildHeaders(scope);

  const response = await axios.post(url, pain001, {
    headers,
    timeout: 30000,
  });

  return { status: response.status, data: response.data };
}

/**
 * RPP: Get payment status
 * @param {string} originalMessageId - msgId from Pain.001
 * @returns {Promise<{ status: number, data: Object }>}
 */
async function getPaymentStatus(originalMessageId) {
  const { rpp } = getBaseUrls();
  const url = `${rpp}/api/payments/initiation/${encodeURIComponent(originalMessageId)}`;
  const headers = await buildHeaders(SCOPES.RPP_GET);

  const response = await axios.get(url, {
    headers,
    timeout: 15000,
  });

  return { status: response.status, data: response.data };
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
  const headers = await buildHeaders(scope);

  const response = await axios.post(url, pain013, {
    headers,
    timeout: 30000,
  });

  return { status: response.status, data: response.data };
}

/**
 * RTP: Get Request to Pay status
 * @param {string} originalMessageId - msgId from Pain.013
 * @returns {Promise<{ status: number, data: Object }>}
 */
async function getRequestToPayStatus(originalMessageId) {
  const { rtp } = getBaseUrls();
  const url = `${rtp}/api/requestToPay/initiation/${encodeURIComponent(originalMessageId)}`;
  const headers = await buildHeaders(SCOPES.RTP_GET);

  const response = await axios.get(url, {
    headers,
    timeout: 15000,
  });

  return { status: response.status, data: response.data };
}

module.exports = {
  initiatePayment,
  getPaymentStatus,
  initiateRequestToPay,
  getRequestToPayStatus,
  SCOPES,
  guid26,
};
