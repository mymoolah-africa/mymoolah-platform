const { PeachPayment } = require('../models');
const peachClient = require('../integrations/peach/client');

exports.initiatePayShapRpp = async (req, res) => {
  try {
    const { amount, currency = 'ZAR', debtorPhone, description } = req.body || {};
    if (!amount) {
      return res.status(400).json({ success: false, message: 'amount is required' });
    }

    const merchantTransactionId = `PSH-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    // Persist request first
    const record = await PeachPayment.create({
      type: 'payshap_rpp',
      merchantTransactionId,
      amount,
      currency,
      partyAlias: debtorPhone,
      status: 'initiated',
      rawRequest: { amount, currency, debtorPhone, description },
    });

    // For sandbox and quick wiring, prefer Checkout V2 (Bearer JWT, redirect flow)
    const response = await peachClient.createCheckoutPayShap({ amount, currency, description });

    // Map minimal fields
    const peachRef = response.checkoutId || response.id || null;
    const status = 'processing';
    const resultCode = null;
    const resultDesc = 'created via checkout';

    await record.update({
      peachReference: peachRef,
      status,
      resultCode: resultCode || null,
      resultDescription: resultDesc || null,
      rawResponse: response,
    });

    return res.status(201).json({
      success: true,
      data: {
        merchantTransactionId,
        peachReference: peachRef,
        status,
        redirectUrl: response.redirectUrl,
        checkoutId: response.checkoutId,
      }
    });
  } catch (error) {
    console.error('❌ PayShap RPP initiation error:', error.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Failed to initiate PayShap payment', details: error.response?.data || error.message });
  }
};


