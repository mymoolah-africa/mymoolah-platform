const axios = require('axios');

/**
 * Peach Payments API client (sandbox-ready)
 *
 * Required env vars:
 *  - PEACH_BASE_AUTH (e.g., https://sandbox-dashboard.peachpayments.com)
 *  - PEACH_BASE_CHECKOUT (e.g., https://testsecure.peachpayments.com)
 *  - PEACH_CLIENT_ID
 *  - PEACH_CLIENT_SECRET
 *  - PEACH_MERCHANT_ID
 *  - PEACH_ENTITY_ID_PSH (PayShap-enabled entity)
 *  - PEACH_ENABLE_TEST_MODE=true|false
 */

function getConfig() {
  const {
    PEACH_BASE_AUTH,
    PEACH_BASE_CHECKOUT,
    PEACH_CLIENT_ID,
    PEACH_CLIENT_SECRET,
    PEACH_MERCHANT_ID,
    PEACH_ENTITY_ID_PSH,
    PEACH_ENABLE_TEST_MODE,
  } = process.env;

  if (!PEACH_BASE_AUTH || !PEACH_BASE_CHECKOUT || !PEACH_CLIENT_ID || !PEACH_CLIENT_SECRET || !PEACH_MERCHANT_ID || !PEACH_ENTITY_ID_PSH) {
    throw new Error('Peach Payments configuration missing. Please set required environment variables.');
  }

  return {
    authBase: PEACH_BASE_AUTH,
    checkoutBase: PEACH_BASE_CHECKOUT,
    clientId: PEACH_CLIENT_ID,
    clientSecret: PEACH_CLIENT_SECRET,
    merchantId: PEACH_MERCHANT_ID,
    entityIdPayShap: PEACH_ENTITY_ID_PSH,
    enableTestMode: String(PEACH_ENABLE_TEST_MODE || 'false').toLowerCase() === 'true',
    referer: process.env.MYMOOLAH_REFERER || 'https://www.mymoolah.africa',
  };
}

// Export getConfig for use in controllers
module.exports.getConfig = getConfig;

async function getAccessToken() {
  const cfg = getConfig();
  const url = `${cfg.authBase}/api/oauth/token`;
  const { data } = await axios.post(url, {
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    merchantId: cfg.merchantId,
  }, { timeout: 15000 });
  const token = data && (data.token || data.access_token);
  if (!token) {
    throw new Error('Failed to obtain Peach access token');
  }
  return token;
}

async function createPayShapDebit({ amount, currency = 'ZAR', debtorPhone, debtorAccountNumber, merchantTransactionId, description }) {
  const cfg = getConfig();
  const token = await getAccessToken();

  const url = `${cfg.checkoutBase}/v1/payments?entityId=${encodeURIComponent(cfg.entityIdPayShap)}`;

  // Body fields based on Payments API pattern with PayShap sandbox testing
  const body = {
    amount: Number(amount).toFixed(2),
    currency,
    paymentBrand: 'PAYSHAP',
    paymentType: 'DB',
    merchantTransactionId,
    // Enable sandbox simulator ONLY for Payments API when test mode is on
    ...(cfg.enableTestMode ? { 'customParameters[enableTestMode]': 'true' } : {}),
    // Consumer alias / phone number for sandbox simulator testing
    'customer[ip]': '127.0.0.1',
    descriptor: description || 'PayShap RPP',
  };

  // Handle both PayShap proxy (mobile number) and direct bank account
  if (debtorPhone) {
    // PayShap proxy/alias (mobile number)
    body['customer[mobile]'] = debtorPhone;
  } else if (debtorAccountNumber) {
    // Direct bank account number
    body['customer[accountNumber]'] = debtorAccountNumber;
  }

  const headers = { Authorization: `Bearer ${token}` };
  const { data } = await axios.post(url, body, { headers, timeout: 20000 });
  return data;
}

/**
 * Create a PayShap RTP (Request to Pay) request
 * This initiates an inbound payment request to a creditor
 * Using Checkout V2 API which has better RTP support
 * ENHANCED: Now supports MSISDN reference for automatic wallet allocation
 */
async function createPayShapRtp({ amount, currency = 'ZAR', description, creditorPhone, creditorAccountNumber, bankCode, bankName, msisdnReference }) {
  const cfg = getConfig();
  const token = await getAccessToken();
  
  // Use Checkout V2 API for RTP
  const url = `${cfg.checkoutBase}/v2/checkout`;
  
  const body = {
    authentication: { entityId: cfg.entityIdPayShap },
    amount: Number(amount).toFixed(2),
    currency,
    // Focus PayShap; force method in UI
    defaultPaymentMethod: 'PAYSHAP',
    forceDefaultMethod: true,
    shopperResultUrl: cfg.referer,
    merchantTransactionId: `PSH-RTP-${Date.now()}`,
    nonce: `${Date.now()}${Math.floor(Math.random()*100000)}`,
    // 🆕 NEW: MSISDN reference for automatic wallet allocation
    ...(msisdnReference && { 
      customParameters: { 
        msisdnReference: msisdnReference
      } 
    })
  };

  // Handle both PayShap proxy (mobile number) and direct bank account
  if (creditorPhone) {
    // PayShap proxy/alias (mobile number)
    body.customer = { mobile: creditorPhone };
  } else if (creditorAccountNumber) {
    // Direct bank account number
    body.customer = { accountNumber: creditorAccountNumber };
    if (bankCode) {
      body.customer.bankCode = bankCode;
    }
    if (bankName) {
      body.customer.bankName = bankName;
    }
  }

  const headers = { Authorization: `Bearer ${token}`, Referer: cfg.referer };
  const { data } = await axios.post(url, body, { headers, timeout: 20000 });
  return data;
}

module.exports = {
  getAccessToken,
  createPayShapDebit,
  createPayShapRtp,
  /**
   * Create a Checkout V2 session for PayShap and return the API payload.
   * This uses Bearer JWT minted by the auth service and returns a redirectUrl.
   */
  async createCheckoutPayShap({ amount, currency = 'ZAR', description, shopperResultUrl = 'http://localhost:3001/health', debtorPhone, debtorAccountNumber }) {
    const cfg = getConfig();
    const token = await getAccessToken();
    const url = `${cfg.checkoutBase}/v2/checkout`;
    const body = {
      authentication: { entityId: cfg.entityIdPayShap },
      amount: Number(amount).toFixed(2),
      currency,
      // Focus PayShap; force method in UI
      defaultPaymentMethod: 'PAYSHAP',
      forceDefaultMethod: true,
      shopperResultUrl: cfg.referer,
      merchantTransactionId: `PSH-RPP-${Date.now()}`,
      nonce: `${Date.now()}${Math.floor(Math.random()*100000)}`,
    };

    // Handle both PayShap proxy (mobile number) and direct bank account
    if (debtorPhone) {
      // PayShap proxy/alias (mobile number)
      body.customer = { mobile: debtorPhone };
    } else if (debtorAccountNumber) {
      // Direct bank account number
      body.customer = { accountNumber: debtorAccountNumber };
    }

    const headers = { Authorization: `Bearer ${token}`, Referer: cfg.referer };
    const { data } = await axios.post(url, body, { headers, timeout: 20000 });
    return data;
  }
};


