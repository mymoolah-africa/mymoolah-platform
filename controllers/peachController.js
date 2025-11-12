const db = require('../models');
const PeachPayment = db.PeachPayment;
const peachClient = require('../integrations/peach/client');

/**
 * Peach Payments Controller
 * Supports multiple payment methods including PayShap, cards, and other payment services
 */

/**
 * Health check for Peach Payments integration
 */
exports.healthCheck = async (req, res) => {
  try {
    const paymentCount = await PeachPayment.count();
    const recentPayments = await PeachPayment.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'type', 'amount', 'status', 'createdAt']
    });

    res.json({
      success: true,
      data: {
        service: 'Peach Payments',
        status: 'operational',
        timestamp: new Date().toISOString(),
        stats: {
          totalPayments: paymentCount,
          recentPayments: recentPayments.length
        },
        features: {
          payshap: 'PayShap RPP & RTP',
          cards: 'Credit/Debit Cards',
          eft: 'Electronic Funds Transfer',
          checkout: 'Checkout V2',
          paymentLinks: 'Payment Links API'
        },
        config: {
          baseAuth: process.env.PEACH_BASE_AUTH,
          baseCheckout: process.env.PEACH_BASE_CHECKOUT,
          testMode: process.env.PEACH_ENABLE_TEST_MODE === 'true',
          merchantId: process.env.PEACH_MERCHANT_ID ? 'configured' : 'missing',
          entityId: process.env.PEACH_ENTITY_ID_PSH ? 'configured' : 'missing'
        }
      }
    });
  } catch (error) {
    console.error('Peach health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
};

/**
 * Initiate PayShap RPP payment (outbound)
 * Supports both PayShap proxy (mobile number) and direct bank account numbers
 */
exports.initiatePayShapRpp = async (req, res) => {
  try {
    const { 
      amount, 
      currency = 'ZAR', 
      debtorPhone, 
      debtorAccountNumber,
      bankCode,
      bankName,
      businessContext = 'wallet',
      clientId,
      employeeId,
      description,
      testMode = false,
      dryRun = false
    } = req.body || {};

    if (!amount) {
      return res.status(400).json({ success: false, message: 'amount is required' });
    }

    // Validate payment method
    if (!debtorPhone && !debtorAccountNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either debtorPhone (PayShap proxy) or debtorAccountNumber (bank account) is required' 
      });
    }

    // Determine payment method
    const paymentMethod = debtorPhone ? 'proxy' : 'account_number';
    const partyAlias = debtorPhone || debtorAccountNumber;

    const merchantTransactionId = `PSH-RPP-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    // Persist request first (skip when dryRun)
    let record = null;
    if (!dryRun) {
      record = await PeachPayment.create({
        type: 'payshap_rpp',
        merchantTransactionId,
        amount,
        currency,
        paymentMethod,
        partyAlias,
        bankCode,
        bankName,
        businessContext,
        clientId,
        employeeId,
        status: 'initiated',
        rawRequest: { 
          amount, 
          currency, 
          debtorPhone, 
          debtorAccountNumber,
          bankCode,
          bankName,
          businessContext,
          clientId,
          employeeId,
          description 
        },
      });
    }

    // For sandbox and quick wiring, prefer Checkout V2 (Bearer JWT, redirect flow)
    const response = await peachClient.createCheckoutPayShap({ 
      amount, 
      currency, 
      description,
      debtorPhone,
      debtorAccountNumber
    });

    // Map minimal fields
    const peachRef = response.checkoutId || response.id || null;
    const status = 'processing';
    const resultCode = null;
    const resultDesc = 'created via checkout';

    if (!dryRun && record) {
      await record.update({
        peachReference: peachRef,
        status,
        resultCode: resultCode || null,
        resultDescription: resultDesc || null,
        rawResponse: response,
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        merchantTransactionId,
        peachReference: peachRef,
        status,
        redirectUrl: response.redirectUrl,
        checkoutId: response.checkoutId,
        paymentType: 'payshap_rpp',
        paymentMethod,
        partyAlias,
        businessContext,
        amount,
        currency,
        dryRun
      }
    });
  } catch (error) {
    console.error('❌ PayShap RPP initiation error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to initiate PayShap payment', 
      details: error.response?.data || error.message 
    });
  }
};

/**
 * Initiate PayShap RTP payment (inbound request)
 * Supports both PayShap proxy (mobile number) and direct bank account numbers
 * ENHANCED: Now uses user's MSISDN as reference for automatic wallet allocation
 */
exports.initiatePayShapRtp = async (req, res) => {
  try {
    const { 
      amount, 
      currency = 'ZAR', 
      creditorPhone, 
      creditorAccountNumber,
      bankCode,
      bankName,
      businessContext = 'wallet',
      clientId,
      employeeId,
      description,
      testMode = false,
      testMsisdn = null,
      dryRun = false,
      overrideMsisdn = null
    } = req.body || {};

    // 🧪 TEST MODE: Allow testing without authentication
    let userMsisdn;
    if (overrideMsisdn) {
      userMsisdn = overrideMsisdn;
      console.log('🧪 DRY RUN OVERRIDE: Using override MSISDN:', userMsisdn);
    } else if (testMode && testMsisdn) {
      userMsisdn = testMsisdn;
      console.log('🧪 TEST MODE: Using test MSISDN:', userMsisdn);
    } else {
      // Production mode: Get user's MSISDN for automatic wallet allocation
      userMsisdn = req.user?.phoneNumber;
    }
    
    if (!userMsisdn) {
      return res.status(400).json({ 
        success: false, 
        message: 'User MSISDN not found. Please ensure your phone number is registered for automatic wallet allocation.',
        errorCode: 'MSISDN_NOT_FOUND'
      });
    }

    // 🆕 NEW: Validate MSISDN format (South African standard)
    const msisdnRegex = /^0[6-8][0-9]{8}$/;
    if (!msisdnRegex.test(userMsisdn)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid MSISDN format. Expected: 0[6-8]XXXXXXXX',
        errorCode: 'INVALID_MSISDN_FORMAT'
      });
    }

    if (!amount) {
      return res.status(400).json({ success: false, message: 'amount is required' });
    }

    // Validate payment method
    if (!creditorPhone && !creditorAccountNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either creditorPhone (PayShap proxy) or creditorAccountNumber (bank account) is required' 
      });
    }

    // Determine payment method
    const paymentMethod = creditorPhone ? 'proxy' : 'account_number';
    const partyAlias = creditorPhone || creditorAccountNumber;

    const merchantTransactionId = `PSH-RTP-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    // Persist request first (skip when dryRun)
    let record = null;
    if (!dryRun) {
      record = await PeachPayment.create({
        type: 'payshap_rtp',
        merchantTransactionId,
        amount,
        currency,
        paymentMethod,
        partyAlias,
        bankCode,
        bankName,
        businessContext,
        clientId,
        employeeId,
        status: 'initiated',
        rawRequest: { 
          amount, 
          currency, 
          creditorPhone, 
          creditorAccountNumber,
          bankCode,
          bankName,
          businessContext,
          clientId,
          employeeId,
          description 
        },
      });
    }

    // 🆕 ENHANCED: For RTP, use the dedicated PayShap RTP API with MSISDN reference
    const response = await peachClient.createPayShapRtp({ 
      amount, 
      currency, 
      description: description || `PayShap RTP Request - Reference: ${userMsisdn}`,
      creditorPhone,
      creditorAccountNumber,
      bankCode,
      bankName,
      // 🆕 NEW: Pass MSISDN reference for automatic wallet allocation
      msisdnReference: userMsisdn
    });

    const peachRef = response.checkoutId || response.id || null;
    const status = 'pending'; // RTP starts as pending until accepted
    const resultCode = null;
    const resultDesc = 'RTP request created';

    if (!dryRun && record) {
      await record.update({
        peachReference: peachRef,
        status,
        resultCode: resultCode || null,
        resultDescription: resultDesc || null,
        rawResponse: response,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'PayShap RTP request created successfully with MSISDN reference for automatic wallet allocation',
      data: {
        merchantTransactionId,
        peachReference: peachRef,
        status,
        redirectUrl: response.redirectUrl,
        checkoutId: response.checkoutId,
        paymentType: 'payshap_rtp',
        paymentMethod,
        partyAlias,
        businessContext,
        amount,
        currency,
        // 🆕 NEW: MSISDN reference information for automatic wallet allocation
        msisdnReference: userMsisdn,
        instructions: `Share your MSISDN (${userMsisdn}) with the payer. The bank will automatically route the payment to your wallet using this reference.`,
        automaticAllocation: true,
        allocationMethod: 'MSISDN Reference',
        dryRun
      }
    });
  } catch (error) {
    console.error('❌ PayShap RTP initiation error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to initiate PayShap RTP request', 
      details: error.response?.data || error.message 
    });
  }
};

/**
 * Get payment status by merchant transaction ID
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;
    
    const payment = await PeachPayment.findOne({
      where: { merchantTransactionId }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          type: payment.type,
          merchantTransactionId: payment.merchantTransactionId,
          peachReference: payment.peachReference,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          resultCode: payment.resultCode,
          resultDescription: payment.resultDescription,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment status',
      message: error.message
    });
  }
};

/**
 * Get user's payment history
 */
exports.getUserPayments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status, type } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;

    const { count, rows: payments } = await PeachPayment.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'type', 'merchantTransactionId', 'peachReference',
        'amount', 'currency', 'status', 'resultCode', 'resultDescription',
        'createdAt', 'updatedAt'
      ]
    });

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user payments',
      message: error.message
    });
  }
};

/**
 * Cancel a pending payment
 */
exports.cancelPayment = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;
    
    const payment = await PeachPayment.findOne({
      where: { merchantTransactionId }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'pending' && payment.status !== 'initiated') {
      return res.status(400).json({
        success: false,
        message: 'Payment cannot be cancelled in current status'
      });
    }

    await payment.update({
      status: 'cancelled',
      resultDescription: 'Payment cancelled by user'
    });

    res.json({
      success: true,
      data: {
        message: 'Payment cancelled successfully',
        payment: {
          merchantTransactionId: payment.merchantTransactionId,
          status: payment.status,
          updatedAt: payment.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Cancel payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel payment',
      message: error.message
    });
  }
};

/**
 * Get available payment methods
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'payshap_rpp',
        name: 'PayShap RPP',
        description: 'Rapid Payments Programme - Outbound payments',
        icon: '💳',
        supported: true,
        fees: 'R2.00-R3.00 per transaction',
        processingTime: '3-6 minutes'
      },
      {
        id: 'payshap_rtp',
        name: 'PayShap RTP',
        description: 'Request to Pay - Inbound payment requests',
        icon: '📱',
        supported: true,
        fees: 'R2.00-R3.00 per transaction',
        processingTime: '3-6 minutes'
      },
      {
        id: 'card',
        name: 'Credit/Debit Cards',
        description: 'Visa, Mastercard, American Express',
        icon: '💳',
        supported: true,
        fees: '2.5% + R1.00',
        processingTime: 'Instant'
      },
      {
        id: 'eft',
        name: 'Electronic Funds Transfer',
        description: 'Direct bank transfers',
        icon: '🏦',
        supported: true,
        fees: 'R5.00 per transaction',
        processingTime: '1-3 business days'
      }
    ];

    res.json({
      success: true,
      data: {
        paymentMethods,
        count: paymentMethods.length
      }
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment methods',
      message: error.message
    });
  }
};

/**
 * 🆕 NEW: Request Money via PayShap RTP with MSISDN reference
 * This is specifically for the Request Money functionality
 * Uses the user's MSISDN as reference for automatic wallet allocation
 */
exports.requestMoneyViaPayShap = async (req, res) => {
  try {
    const { 
      amount, 
      currency = 'ZAR', 
      payerName,
      payerMobileNumber,
      payerAccountNumber,
      payerBankName,
      description,
      testMode = false,
      testMsisdn = null,
      dryRun = false,
      overrideMsisdn = null
    } = req.body || {};

    // 🧪 TEST MODE: Allow testing without authentication
    let userMsisdn;
    if (overrideMsisdn) {
      userMsisdn = overrideMsisdn;
      console.log('🧪 DRY RUN OVERRIDE: Using override MSISDN:', userMsisdn);
    } else if (testMode && testMsisdn) {
      userMsisdn = testMsisdn;
      console.log('🧪 TEST MODE: Using test MSISDN:', userMsisdn);
    } else {
      // Production mode: Get user's MSISDN for automatic wallet allocation
      userMsisdn = req.user?.phoneNumber;
    }
    
    if (!userMsisdn) {
      return res.status(400).json({ 
        success: false, 
        message: 'User MSISDN not found. Please ensure your phone number is registered for automatic wallet allocation.',
        errorCode: 'MSISDN_NOT_FOUND'
      });
    }

    // Validate MSISDN format (South African standard)
    const msisdnRegex = /^0[6-8][0-9]{8}$/;
    if (!msisdnRegex.test(userMsisdn)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid MSISDN format. Expected: 0[6-8]XXXXXXXX',
        errorCode: 'INVALID_MSISDN_FORMAT'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount must be greater than 0',
        errorCode: 'INVALID_AMOUNT'
      });
    }

    if (!payerName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payer name is required',
        errorCode: 'MISSING_PAYER_NAME'
      });
    }

    // Validate payment method
    if (!payerMobileNumber && !payerAccountNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either payer mobile number (PayShap proxy) or payer account number (bank account) is required',
        errorCode: 'MISSING_PAYER_DETAILS'
      });
    }

    // Determine payment method
    const paymentMethod = payerMobileNumber ? 'proxy' : 'account_number';
    const partyAlias = payerMobileNumber || payerAccountNumber;

    const merchantTransactionId = `REQ-MONEY-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    // Persist request first (skip when dryRun)
    let record = null;
    if (!dryRun) {
      record = await PeachPayment.create({
        type: 'request_money_payshap',
        merchantTransactionId,
        amount,
        currency,
        paymentMethod,
        partyAlias,
        bankCode: payerBankName ? getBankCode(payerBankName) : null,
        bankName: payerBankName || null,
        businessContext: 'request_money',
        clientId: testMode ? 'TEST_USER' : req.user?.id,
        status: 'pending',
        rawRequest: { 
          amount, 
          currency, 
          payerName,
          payerMobileNumber, 
          payerAccountNumber,
          payerBankName,
          userMsisdn,
          description 
        },
      });
    }

    // Create PayShap RTP request with MSISDN reference
    const response = await peachClient.createPayShapRtp({ 
      amount, 
      currency, 
      description: description || `Money Request from ${payerName} - Reference: ${userMsisdn}`,
      creditorPhone: payerMobileNumber,
      creditorAccountNumber: payerAccountNumber,
      bankCode: payerBankName ? getBankCode(payerBankName) : null,
      bankName: payerBankName,
      msisdnReference: userMsisdn
    });

    const peachRef = response.checkoutId || response.id || null;
    const status = 'pending'; // RTP starts as pending until accepted
    const resultCode = null;
    const resultDesc = 'Money request created with MSISDN reference';

    if (!dryRun && record) {
      await record.update({
        peachReference: peachRef,
        status,
        resultCode: resultCode || null,
        resultDescription: resultDesc || null,
        rawResponse: response,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Money request sent successfully with MSISDN reference for automatic wallet allocation',
      data: {
        merchantTransactionId,
        peachReference: peachRef,
        status,
        redirectUrl: response.redirectUrl,
        checkoutId: response.checkoutId,
        paymentType: 'request_money_payshap',
        paymentMethod,
        partyAlias,
        businessContext: 'request_money',
        amount,
        currency,
        // 🆕 NEW: MSISDN reference information for automatic wallet allocation
        msisdnReference: userMsisdn,
        instructions: `Share your MSISDN (${userMsisdn}) with ${payerName}. The bank will automatically route the payment to your wallet using this reference.`,
        automaticAllocation: true,
        allocationMethod: 'MSISDN Reference',
        payerName,
        requestId: merchantTransactionId,
        dryRun
      }
    });

  } catch (error) {
    console.error('❌ Request Money via PayShap error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create money request', 
      details: error.response?.data || error.message 
    });
  }
};

/**
 * 🏦 Helper function to get bank code for South African banks
 */
function getBankCode(bankName) {
  const bankCodes = {
    'ABSA Bank': '632005',
    'African Bank': '430000',
    'Bidvest Bank': '462005',
    'Capitec Bank': '470010',
    'Discovery Bank': '679000',
    'First National Bank (FNB)': '250655',
    'Investec Bank': '580105',
    'Nedbank': '198765',
    'Standard Bank': '051001',
    'TymeBank': '678910'
  };

  return bankCodes[bankName] || '';
}

/**
 * Get PayShap test scenarios and phone numbers
 */
exports.getPayShapTestScenarios = async (req, res) => {
  try {
    const testScenarios = [
      {
        scenario: 'Payment successful',
        phoneNumber: '+27-711111200',
        resultCode: '000.100.110',
        description: 'Standard successful payment flow',
        status: 'success'
      },
      {
        scenario: 'Transaction declined',
        phoneNumber: '+27-711111160',
        resultCode: '100.396.101',
        description: 'Payment declined by user or bank',
        status: 'declined',
        note: 'Does not appear in Dashboard'
      },
      {
        scenario: 'Transaction expired',
        phoneNumber: '+27-711111140',
        resultCode: '100.396.104',
        description: 'Payment request expired',
        status: 'expired',
        note: 'Does not appear in Dashboard'
      },
      {
        scenario: 'Unexpected communication error',
        phoneNumber: '+27-711111107',
        resultCode: '900.100.100',
        description: 'Communication error with connector',
        status: 'error'
      }
    ];

    res.json({
      success: true,
      data: {
        testScenarios,
        count: testScenarios.length,
        sandboxInfo: {
          entityId: process.env.PEACH_ENTITY_ID_PSH,
          testMode: process.env.PEACH_ENABLE_TEST_MODE === 'true',
          note: 'Use these phone numbers in sandbox environment to test specific scenarios'
        }
      }
    });
  } catch (error) {
    console.error('Get PayShap test scenarios error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test scenarios',
      message: error.message
    });
  }
};

/**
 * 🆕 UAT: Handle Peach Payments webhook
 * Receives webhook notifications from Peach Payments
 * For UAT: Basic implementation without signature validation (to be added when Peach provides details)
 */
exports.handleWebhook = async (req, res) => {
  try {
    const webhookPayload = req.body;
    const headers = req.headers;
    
    console.log('📥 Peach Payments Webhook Received:');
    console.log('   Headers:', JSON.stringify(headers, null, 2));
    console.log('   Payload:', JSON.stringify(webhookPayload, null, 2));
    
    // TODO: Validate webhook signature when Peach provides validation method
    // For UAT: Log signature header if present
    if (headers['x-peach-signature'] || headers['x-signature'] || headers['signature']) {
      console.log('   ⚠️  Signature present but not validated (awaiting validation method from Peach)');
    }
    
    // Extract payment identifiers from webhook
    // Peach may send different formats, try common fields
    const merchantTransactionId = webhookPayload.merchantTransactionId || 
                                  webhookPayload.id ||
                                  webhookPayload.checkoutId;
    
    const checkoutId = webhookPayload.checkoutId || 
                       webhookPayload.id || 
                       webhookPayload.paymentId;
    
    const resultCode = webhookPayload.result?.code || 
                      webhookPayload.resultCode || 
                      webhookPayload.code;
    
    const resultDescription = webhookPayload.result?.description || 
                             webhookPayload.resultDescription || 
                             webhookPayload.description ||
                             webhookPayload.message;
    
    const status = webhookPayload.status || 
                   webhookPayload.paymentStatus ||
                   (resultCode === '000.100.110' || resultCode?.startsWith('000.') ? 'success' : 
                    resultCode?.startsWith('100.') ? 'failed' : 'processing');
    
    // Find payment record
    let payment = null;
    if (merchantTransactionId) {
      payment = await PeachPayment.findOne({
        where: { merchantTransactionId }
      });
    }
    
    if (!payment && checkoutId) {
      payment = await PeachPayment.findOne({
        where: { peachReference: checkoutId }
      });
    }
    
    if (!payment) {
      console.log('   ⚠️  Payment record not found for webhook');
      // Still return 200 to prevent retries for unknown payments
      return res.status(200).json({
        success: true,
        message: 'Webhook received but payment not found (may be from different environment)'
      });
    }
    
    // Update payment record
    const updateData = {
      status: status,
      resultCode: resultCode || null,
      resultDescription: resultDescription || null,
      webhookReceivedAt: new Date(),
      rawResponse: {
        ...(payment.rawResponse || {}),
        webhook: webhookPayload,
        webhookHeaders: headers,
        webhookReceivedAt: new Date().toISOString()
      }
    };
    
    await payment.update(updateData);
    
    console.log(`   ✅ Payment updated: ${payment.merchantTransactionId} → ${status}`);
    
    // TODO: Apply ledger effects when status is 'success'
    // For UAT: Log that ledger effects should be applied
    if (status === 'success' || resultCode === '000.100.110') {
      console.log('   💰 Payment successful - Ledger effects should be applied (not implemented for UAT)');
      // In production: credit wallet, debit float, post ledger entries
    }
    
    // Always return 200 to acknowledge webhook receipt
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
      paymentId: payment.merchantTransactionId,
      status: status
    });
    
  } catch (error) {
    console.error('❌ Peach webhook error:', error);
    // Still return 200 to prevent retries on our errors
    // Log error for investigation
    res.status(200).json({
      success: false,
      message: 'Webhook received but processing failed',
      error: error.message
    });
  }
};

/**
 * 🆕 UAT: Poll payment status from Peach Payments
 * Attempts to check payment status via Checkout V2 status endpoint
 */
exports.pollPaymentStatus = async (req, res) => {
  try {
    const { checkoutId, merchantTransactionId } = req.body;
    
    if (!checkoutId && !merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Either checkoutId or merchantTransactionId is required'
      });
    }
    
    // Find payment record
    let payment = null;
    if (merchantTransactionId) {
      payment = await PeachPayment.findOne({
        where: { merchantTransactionId }
      });
    } else if (checkoutId) {
      payment = await PeachPayment.findOne({
        where: { peachReference: checkoutId }
      });
    }
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Try to get status from Peach Payments API
    // Note: This endpoint may need to be confirmed with Peach
    const token = await peachClient.getAccessToken();
    const cfg = peachClient.getConfig();
    
    const axios = require('axios');
    const statusId = checkoutId || payment.peachReference;
    
    if (!statusId) {
      return res.status(400).json({
        success: false,
        message: 'No checkout ID available for status check'
      });
    }
    
    // Try Checkout V2 status endpoint (common pattern)
    try {
      const statusUrl = `${cfg.checkoutBase}/v2/checkouts/${statusId}/payment`;
      const response = await axios.get(statusUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const peachStatus = response.data;
      
      // Update payment record
      const status = peachStatus.result?.code === '000.100.110' ? 'success' :
                     peachStatus.result?.code?.startsWith('100.') ? 'failed' :
                     peachStatus.status || payment.status;
      
      await payment.update({
        status: status,
        resultCode: peachStatus.result?.code || null,
        resultDescription: peachStatus.result?.description || null,
        rawResponse: {
          ...(payment.rawResponse || {}),
          statusCheck: peachStatus,
          statusCheckedAt: new Date().toISOString()
        }
      });
      
      return res.json({
        success: true,
        data: {
          merchantTransactionId: payment.merchantTransactionId,
          status: status,
          resultCode: peachStatus.result?.code,
          resultDescription: peachStatus.result?.description,
          peachData: peachStatus
        }
      });
      
    } catch (apiError) {
      console.error('Status check API error:', apiError.response?.data || apiError.message);
      
      // Return current database status if API call fails
      return res.json({
        success: true,
        data: {
          merchantTransactionId: payment.merchantTransactionId,
          status: payment.status,
          resultCode: payment.resultCode,
          resultDescription: payment.resultDescription,
          note: 'Status from database (API check failed - endpoint may need confirmation)',
          apiError: apiError.response?.data || apiError.message
        }
      });
    }
    
  } catch (error) {
    console.error('Poll payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to poll payment status',
      message: error.message
    });
  }
};


