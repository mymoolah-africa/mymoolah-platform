'use strict';

/**
 * SBSA Proxy Resolution Client (PBPX)
 * Resolves a mobile number (MSISDN) to a bank account before initiating RPP/RTP.
 * This is the correct banking-grade pre-validation step — never skip for PBPX payments.
 *
 * GET {proxy_base_url}/{proxyId}
 * proxyId = UUID returned from a prior proxy registration, or the E.164 mobile number
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-21
 */

const axios = require('axios');
const crypto = require('crypto');
const { getToken } = require('./pingAuthService');

const PROXY_SCOPE = 'rpp.proxyResolution.get';

function guid26() {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 26);
}

function getProxyBaseUrl() {
  const env = process.env.STANDARDBANK_ENVIRONMENT || 'uat';
  const isUat = env === 'uat';
  return (
    process.env.SBSA_PROXY_BASE_URL ||
    (isUat
      ? 'https://api-gatewaynp.standardbank.co.za/npextorg/extnonprod/proxy-resolution'
      : 'https://api-gateway.standardbank.co.za/sbsa/ext-prod/proxy-resolution')
  );
}

/**
 * Resolve a proxy (mobile number or proxy UUID) to a bank account.
 *
 * @param {string} proxyId - E.164 mobile number (e.g. +27832502098) or proxy UUID
 * @returns {Promise<{
 *   resolved: boolean,
 *   accountNumber?: string,
 *   bankCode?: string,
 *   accountName?: string,
 *   rawResponse?: Object
 * }>}
 */
async function resolveProxy(proxyId) {
  if (!proxyId || typeof proxyId !== 'string') {
    throw new Error('proxyId is required for proxy resolution');
  }

  const ibmClientId = process.env.SBSA_IBM_CLIENT_ID;
  const ibmClientSecret = process.env.SBSA_IBM_CLIENT_SECRET;

  if (!ibmClientId || !ibmClientSecret) {
    throw new Error('SBSA IBM API Gateway credentials not configured');
  }

  const token = await getToken(PROXY_SCOPE);
  const baseUrl = getProxyBaseUrl();
  const url = `${baseUrl}/${encodeURIComponent(proxyId)}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-IBM-Client-Id': ibmClientId,
    'X-IBM-Client-Secret': ibmClientSecret,
    'x-fapi-interaction-id': guid26(),
    'Session-Ip': '0.0.0.0',
    Accept: 'application/json',
  };

  try {
    const response = await axios.get(url, { headers, timeout: 15000 });
    const data = response.data;

    // Extract resolved account details from SBSA response
    const accountNumber =
      data?.accountNumber ||
      data?.CdtrAcct?.Id?.Item?.Id ||
      data?.cdtrAcct?.id?.othr?.id ||
      null;

    const bankCode =
      data?.bankCode ||
      data?.CdtrAgt?.FinInstnId?.Othr?.Id ||
      data?.cdtrAgt?.finInstnId?.othr?.id ||
      null;

    const accountName =
      data?.accountName ||
      data?.Cdtr?.Nm ||
      data?.cdtr?.nm ||
      null;

    return {
      resolved: !!accountNumber,
      accountNumber,
      bankCode,
      accountName,
      rawResponse: data,
    };
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      if (status === 404) {
        return { resolved: false, rawResponse: err.response.data };
      }
      const body = err.response.data;
      const msg = typeof body === 'object' ? JSON.stringify(body) : String(body);
      const wrapped = new Error(`SBSA proxy resolution failed [${status}]: ${msg}`);
      wrapped.sbsaStatus = status;
      wrapped.sbsaBody = body;
      throw wrapped;
    }
    throw new Error(`SBSA proxy resolution network error: ${err.message}`);
  }
}

/**
 * Normalize a South African mobile number to E.164 format for proxy lookup.
 * @param {string} mobile - e.g. '0832502098', '27832502098', '+27832502098'
 * @returns {string} E.164 e.g. '+27832502098'
 */
function normalizeProxyMobile(mobile) {
  if (!mobile || typeof mobile !== 'string') throw new Error('Invalid mobile number');
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('27') && digits.length === 11) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+27${digits.slice(1)}`;
  throw new Error(`Cannot normalize mobile to E.164: ${mobile}`);
}

module.exports = {
  resolveProxy,
  normalizeProxyMobile,
};
