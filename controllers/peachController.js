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
      description 
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

    // Persist request first
    const record = await PeachPayment.create({
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
        paymentType: 'payshap_rpp',
        paymentMethod,
        partyAlias,
        businessContext,
        amount,
        currency
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
      description 
    } = req.body || {};

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

    // Persist request first
    const record = await PeachPayment.create({
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

    // For RTP, use the dedicated PayShap RTP API
    const response = await peachClient.createPayShapRtp({ 
      amount, 
      currency, 
      description: description || 'PayShap RTP Request',
      creditorPhone,
      creditorAccountNumber,
      bankCode,
      bankName
    });

    const peachRef = response.checkoutId || response.id || null;
    const status = 'pending'; // RTP starts as pending until accepted
    const resultCode = null;
    const resultDesc = 'RTP request created';

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
        paymentType: 'payshap_rtp',
        paymentMethod,
        partyAlias,
        businessContext,
        amount,
        currency
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


