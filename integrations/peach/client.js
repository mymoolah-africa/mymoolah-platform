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
  };
}

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

async function createPayShapDebit({ amount, currency = 'ZAR', debtorPhone, merchantTransactionId, description }) {
  const cfg = getConfig();
  const token = await getAccessToken();

  const url = `${cfg.checkoutBase}/v1/payments?entityId=${encodeURIComponent(cfg.entityIdPayShap)}`;

  // Body fields based on Payments API pattern. PayShap specifics may evolve; this is a sane starting point.
  const body = {
    amount: Number(amount).toFixed(2),
    currency,
    paymentBrand: 'PAYSHAP',
    paymentType: 'DB',
    merchantTransactionId,
    // Provide test toggle for sandbox simulator
    ...(cfg.enableTestMode ? { 'customParameters[enableTestMode]': 'true' } : {}),
    // Consumer alias / phone number used in sandbox simulator cases
    // (Peach may expect a specific parameter name; include a flexible customParameters passthrough too)
    'customer[mobile]': debtorPhone,
    'customer[ip]': '127.0.0.1',
    descriptor: description || 'PayShap RPP',
  };

  const headers = { Authorization: `Bearer ${token}` };
  const { data } = await axios.post(url, body, { headers, timeout: 20000 });
  return data;
}

module.exports = {
  getAccessToken,
  createPayShapDebit,
  /**
   * Create a Checkout V2 session for PayShap and return the API payload.
   * This uses Bearer JWT minted by the auth service and returns a redirectUrl.
   */
  async createCheckoutPayShap({ amount, currency = 'ZAR', description, shopperResultUrl = 'http://localhost:3001/health' }) {
    const cfg = getConfig();
    const token = await getAccessToken();
    const url = `${cfg.checkoutBase}/v2/checkout`;
    const body = {
      entityId: cfg.entityIdPayShap,
      amount: Number(amount).toFixed(2),
      currency,
      description: description || 'PayShap RPP',
      // Focus PayShap; force method in UI
      defaultPaymentMethod: 'PAYSHAP',
      forceDefaultMethod: true,
      shopperResultUrl,
      // Sandbox simulator toggle
      ...(cfg.enableTestMode ? { customParameters: { enableTestMode: 'true' } } : {})
    };
    const headers = { Authorization: `Bearer ${token}` };
    const { data } = await axios.post(url, body, { headers, timeout: 20000 });
    return data;
  }
};


