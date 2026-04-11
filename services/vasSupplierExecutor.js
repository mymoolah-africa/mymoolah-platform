'use strict';

/**
 * VAS Supplier Executor — Universal Purchase Dispatcher
 *
 * Registry-based dispatcher: given a supplier code and VAS type, calls the
 * correct supplier API and returns a normalised result. Designed to be
 * passed as `purchaseFn` to `supplierFailoverService.executeWithFailover()`.
 *
 * Adding a new supplier:
 *   1. Create a handler function: async (variant, opts) => normalisedResult
 *   2. Register it: executor.register('NEW_SUPPLIER', 'electricity', handler)
 *
 * Normalised result shape:
 *   { token, supplierTransactionId, supplierResponse }
 */

class VasSupplierExecutor {
  constructor() {
    this.handlers = new Map();
  }

  _key(supplierCode, vasType) {
    return `${(supplierCode || '').toUpperCase()}::${(vasType || '').toLowerCase()}`;
  }

  register(supplierCode, vasType, handlerFn) {
    this.handlers.set(this._key(supplierCode, vasType), handlerFn);
  }

  hasHandler(supplierCode, vasType) {
    return this.handlers.has(this._key(supplierCode, vasType));
  }

  isSupplierEnabled(supplierCode) {
    const code = (supplierCode || '').toUpperCase();
    if (code === 'MOBILEMART') return process.env.MOBILEMART_LIVE_INTEGRATION === 'true';
    if (code === 'FLASH') return process.env.FLASH_LIVE_INTEGRATION === 'true';
    return !!process.env[`${code}_LIVE_INTEGRATION`];
  }

  async execute(variant, supplierCode, vasType, opts) {
    const key = this._key(supplierCode, vasType);
    const handler = this.handlers.get(key);

    if (!handler) {
      throw Object.assign(
        new Error(`No purchase handler registered for ${supplierCode}/${vasType}`),
        { code: 'NO_HANDLER', isBusinessError: true }
      );
    }

    if (!this.isSupplierEnabled(supplierCode)) {
      throw Object.assign(
        new Error(`Supplier ${supplierCode} is not enabled (${supplierCode}_LIVE_INTEGRATION !== true)`),
        { code: 'SUPPLIER_DISABLED', isBusinessError: true }
      );
    }

    return handler(variant, opts);
  }
}

const executor = new VasSupplierExecutor();

// ---------------------------------------------------------------------------
// ELECTRICITY — MobileMart (prevend + purchase)
// ---------------------------------------------------------------------------
executor.register('MOBILEMART', 'electricity', async (variant, opts) => {
  const { meterNumber, amount, supplierProductCode } = opts;
  const MobileMartAuthService = require('./mobilemartAuthService');
  const mobileMartService = new MobileMartAuthService();

  let merchantProductId = supplierProductCode || variant?.supplierProductId || null;

  if (!merchantProductId) {
    console.log('📞 MobileMart: No variant — fetching utility products from API...');
    const productsResponse = await mobileMartService.makeAuthenticatedRequest('GET', '/utility/products');
    const products = productsResponse.products || productsResponse || [];
    const utilityProduct = products[0];
    if (!utilityProduct || !utilityProduct.merchantProductId) {
      throw new Error('No utility products available from MobileMart');
    }
    merchantProductId = utilityProduct.merchantProductId;
    console.log(`✅ Found utility product: ${utilityProduct.name || 'Electricity'} (${merchantProductId})`);
  } else {
    console.log(`📞 MobileMart: Using merchantProductId=${merchantProductId}`);
  }

  const prevendRequestId = `PRE_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const prevendParams = new URLSearchParams({
    merchantProductId,
    requestId: prevendRequestId,
    meterNumber,
    amount: amount.toString()
  });
  console.log(`📞 MobileMart Prevend: ${prevendParams.toString()}`);
  const prevendResponse = await mobileMartService.makeAuthenticatedRequest('GET', `/utility/prevend?${prevendParams.toString()}`);
  console.log('✅ MobileMart Prevend Response:', JSON.stringify(prevendResponse, null, 2));

  const prevendTransactionId = prevendResponse.transactionId || prevendResponse.prevendTransactionId;
  if (!prevendTransactionId) throw new Error('MobileMart prevend did not return transactionId');

  const purchasePayload = {
    requestId: `ELEC_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    prevendTransactionId,
    tenderType: 'CreditCard'
  };
  console.log('📞 MobileMart Purchase Request:', JSON.stringify(purchasePayload, null, 2));
  const purchaseResponse = await mobileMartService.makeAuthenticatedRequest('POST', '/utility/purchase', purchasePayload);
  console.log('✅ MobileMart Purchase Response:', JSON.stringify(purchaseResponse, null, 2));

  let electricityToken = 'TOKEN_PENDING';
  if (purchaseResponse.additionalDetails && Array.isArray(purchaseResponse.additionalDetails.tokens)) {
    const tokenValues = purchaseResponse.additionalDetails.tokens.map(t => {
      if (typeof t === 'string') return t;
      if (typeof t === 'object') return t.token || t.value || t.tokenValue || t.pin || JSON.stringify(t);
      return String(t);
    });
    electricityToken = tokenValues.join(' ');
  } else {
    electricityToken = purchaseResponse.additionalDetails?.receiptNumber ||
                       purchaseResponse.additionalDetails?.reference || 'TOKEN_PENDING';
  }

  return {
    token: electricityToken,
    supplierTransactionId: purchaseResponse.transactionId,
    supplierResponse: purchaseResponse,
    supplier: 'MOBILEMART'
  };
});

// ---------------------------------------------------------------------------
// ELECTRICITY — Flash (lookup + purchase)
// ---------------------------------------------------------------------------
executor.register('FLASH', 'electricity', async (variant, opts) => {
  const { meterNumber, amount, beneficiary, supplierProductCode } = opts;
  const FlashAuthService = require('./flashAuthService');
  const flashService = new FlashAuthService();
  const flashServiceProvider = ((beneficiary?.metadata?.meterType) || 'ESKOM').toUpperCase().replace(/\s+/g, '_');

  console.log(`📞 Flash: Looking up meter (provider=${flashServiceProvider})...`);
  const lookupResponse = await flashService.makeAuthenticatedRequest('POST', '/prepaid-utilities/lookup', {
    meterNumber,
    serviceProvider: flashServiceProvider
  });
  console.log('✅ Flash Meter Lookup Response:', JSON.stringify(lookupResponse, null, 2));

  if (!lookupResponse.isValid) {
    throw Object.assign(new Error('Meter number not found or invalid'), { code: 'METER_INVALID', isBusinessError: true });
  }

  const purchasePayload = {
    reference: `ELEC_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    accountNumber: process.env.FLASH_ACCOUNT_NUMBER || 'FLASH001234',
    meterNumber,
    amount: Math.round(amount * 100),
    productCode: supplierProductCode || variant?.supplierProductId || 1,
    serviceProvider: flashServiceProvider,
    metadata: { source: 'ElectricityOverlay', userId: opts.userId, beneficiaryId: opts.beneficiaryId }
  };

  console.log('📞 Flash Purchase Request:', JSON.stringify(purchasePayload, null, 2));
  const purchaseResponse = await flashService.makeAuthenticatedRequest('POST', '/prepaid-utilities/purchase', purchasePayload);
  console.log('✅ Flash Purchase Response:', JSON.stringify(purchaseResponse, null, 2));

  const electricityToken = purchaseResponse.token ||
                           purchaseResponse.tokenNumber ||
                           purchaseResponse.pin ||
                           purchaseResponse.serialNumber ||
                           purchaseResponse.additionalDetails?.token || 'TOKEN_PENDING';

  return {
    token: electricityToken,
    supplierTransactionId: purchaseResponse.transactionId || purchaseResponse.reference,
    supplierResponse: purchaseResponse,
    supplier: 'FLASH'
  };
});

// ---------------------------------------------------------------------------
// BILLS — MobileMart (bill payment via Fulcrum)
// ---------------------------------------------------------------------------
executor.register('MOBILEMART', 'bill_payment', async (variant, opts) => {
  const { merchantProductId, meterNumber, amount, beneficiary, billerName } = opts;
  const MobileMartAuthService = require('./mobilemartAuthService');
  const mobileMartService = new MobileMartAuthService();

  let resolvedProductId = merchantProductId || variant?.supplierProductId;

  if (!resolvedProductId) {
    console.log('📞 MobileMart: supplierProductId not in catalog, fetching products from API...');
    const productsResponse = await mobileMartService.makeAuthenticatedRequest('GET', '/bill-payment/products');
    const products = productsResponse.products || productsResponse || [];
    const bn = (billerName || '').toLowerCase();
    const firstWord = bn.replace(/[^a-z0-9]+.*$/, '');
    const billProduct = products.find(p => {
      const pn = (p.productName || p.contentCreator || '').toLowerCase();
      return pn.includes(bn) || bn.includes(pn) || pn.includes(firstWord);
    });
    if (!billProduct?.merchantProductId) throw new Error(`No MobileMart product found for biller "${billerName}"`);
    resolvedProductId = billProduct.merchantProductId;
  }
  console.log(`✅ Resolved merchantProductId: ${resolvedProductId} for biller: ${billerName}`);

  const accountNumber = meterNumber || beneficiary?.identifier;
  const prevendRequestId = `BILLPRE_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const prevendParams = new URLSearchParams({
    merchantProductId: resolvedProductId,
    requestId: prevendRequestId,
    accountNumber,
    amount: amount.toString()
  });

  console.log(`📞 MobileMart Bill Payment Prevend: ${prevendParams.toString()}`);
  const prevendResponse = await mobileMartService.makeAuthenticatedRequest('GET', `/v2/bill-payment/prevend?${prevendParams.toString()}`);
  if (typeof prevendResponse === 'string' && prevendResponse.trim().startsWith('<')) {
    throw new Error('MobileMart prevend returned HTML instead of JSON');
  }
  const prevendTransactionId = prevendResponse?.transactionId || prevendResponse?.prevendTransactionId;
  if (!prevendTransactionId) throw new Error('MobileMart prevend did not return transactionId');

  const payPayload = {
    requestId: `BILLPAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    prevendTransactionId,
    tenderType: 'CreditCard',
    amount: parseFloat(amount)
  };
  console.log('📞 MobileMart Bill Payment Request:', JSON.stringify(payPayload, null, 2));
  const payResponse = await mobileMartService.makeAuthenticatedRequest('POST', '/v2/bill-payment/pay', payPayload);
  console.log('✅ MobileMart Bill Payment Response:', JSON.stringify(payResponse, null, 2));

  return {
    token: payResponse.reference || payResponse.receiptNumber || payResponse.transactionId || 'RECEIPT_PENDING',
    supplierTransactionId: payResponse.transactionId,
    supplierResponse: payResponse,
    supplier: 'MOBILEMART'
  };
});

// ---------------------------------------------------------------------------
// AIRTIME — MobileMart (pinless topup)
// ---------------------------------------------------------------------------
executor.register('MOBILEMART', 'airtime', async (variant, opts) => {
  const { mobileNumber, amount, supplierProductCode } = opts;
  const MobileMartAuthService = require('./mobilemartAuthService');
  const mobileMartService = new MobileMartAuthService();

  const resolvedProductId = supplierProductCode || variant?.supplierProductId;
  if (!resolvedProductId) throw new Error('No merchantProductId for airtime');

  const requestId = `AIR_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const purchasePayload = {
    merchantProductId: resolvedProductId,
    requestId,
    recipientMsisdn: mobileNumber,
    amount: amount.toString()
  };

  console.log('📞 MobileMart Airtime:', JSON.stringify(purchasePayload, null, 2));
  const purchaseResponse = await mobileMartService.makeAuthenticatedRequest('POST', '/products/purchase', purchasePayload);
  console.log('✅ MobileMart Airtime Response:', JSON.stringify(purchaseResponse, null, 2));

  return {
    token: purchaseResponse.pin || purchaseResponse.voucher || null,
    supplierTransactionId: purchaseResponse.transactionId,
    supplierResponse: purchaseResponse,
    supplier: 'MOBILEMART'
  };
});

// Data uses the same MobileMart pinless API as airtime
const mmAirtimeHandler = executor.handlers.get('MOBILEMART::airtime');
executor.register('MOBILEMART', 'data', mmAirtimeHandler);

module.exports = executor;
