const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const requireKycVerified = require('../middleware/requireKycVerified');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Conditional KYC enforcement for bank transfers only
const requireKycIfBankTransfer = async (req, res, next) => {
  try {
    const method = (req.body && req.body.paymentMethodId) || '';
    if (String(method) === 'sa_bank_transfer') {
      return requireKycVerified()(req, res, next);
    }
    return next();
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error enforcing KYC requirement' });
  }
};

// POST /api/v1/send-money/resolve-recipient
router.post('/resolve-recipient', [
  body('identifier')
    .isLength({ min: 1 })
    .withMessage('Recipient identifier is required'),
  validateRequest
], async (req, res) => {
  try {
    const { identifier } = req.body;
    
    // Detect input type
    const detectInputType = (input) => {
      const cleanInput = input.trim();
      
      // Phone number patterns (SA format)
      const phonePattern = /^(\+27|27|0)?[6-8][0-9]{8}$/;
      if (phonePattern.test(cleanInput.replace(/\s/g, ''))) {
        return 'phone';
      }
      
      // Account number pattern (8-12 digits only)
      const accountPattern = /^[0-9]{8,12}$/;
      if (accountPattern.test(cleanInput)) {
        return 'account';
      }
      
      // Username pattern (4-32 chars, letters/numbers/periods/underscores)
      const usernamePattern = /^[a-zA-Z0-9._]{4,32}$/;
      if (usernamePattern.test(cleanInput)) {
        return 'username';
      }
      
      return 'unknown';
    };

    const type = detectInputType(identifier);
    const methods = [];

    // 1. Check MyMoolah internal wallet
    const hasMyMoolahWallet = Math.random() > 0.6; // 40% chance
    if (hasMyMoolahWallet || type === 'username') {
      methods.push({
        id: 'mymoolah_internal',
        name: 'MyMoolah Wallet',
        description: 'Instant transfer to MyMoolah user',
        estimatedTime: 'Instant',
        fee: 'Free',
        feeAmount: 0,
        available: true,
        preferred: true,
        badge: 'FREE • INSTANT'
      });
    }

    // 2. Check SA bank account (dtMercury)
    const hasBankAccount = type === 'account' || (type === 'phone' && Math.random() > 0.3);
    if (hasBankAccount) {
      methods.push({
        id: 'sa_bank_transfer',
        name: 'Bank Transfer',
        description: 'Send to any South African bank account',
        estimatedTime: '2-5 minutes',
        fee: 'R2.50',
        feeAmount: 2.50,
        available: true,
        preferred: false,
        badge: 'R2.50 • 2-5 MIN'
      });
    }

    // 3. ATM cash pickup (always available for phone numbers)
    if (type === 'phone') {
      methods.push({
        id: 'atm_cash_pickup',
        name: 'ATM Cash Pickup',
        description: 'Recipient collects cash at partner ATMs',
        estimatedTime: '15 minutes',
        fee: 'R5.00',
        feeAmount: 5.00,
        available: true,
        preferred: false,
        badge: 'R5.00 • 15 MIN'
      });
    }

    return res.json({
      success: true,
      data: {
        identifier,
        type,
        availableMethods: methods,
        recipientName: hasMyMoolahWallet ? 'John Doe' : undefined,
        recipientInfo: hasBankAccount ? 'Standard Bank' : undefined
      }
    });
  } catch (error) {
    console.error('Error resolving recipient:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve recipient'
    });
  }
});

// POST /api/v1/send-money/quote
router.post('/quote', [
  body('paymentMethodId')
    .isIn(['mymoolah_internal', 'sa_bank_transfer', 'atm_cash_pickup'])
    .withMessage('Invalid payment method'),
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least R1'),
  body('recipient')
    .isLength({ min: 1 })
    .withMessage('Recipient is required'),
  validateRequest
], async (req, res) => {
  try {
    const { paymentMethodId, amount, recipient } = req.body;
    
    // Calculate fees based on payment method
    let fee = 0;
    let estimatedTime = 'Instant';
    
    switch (paymentMethodId) {
      case 'mymoolah_internal':
        fee = 0;
        estimatedTime = 'Instant';
        break;
      case 'sa_bank_transfer':
        fee = 2.50;
        estimatedTime = '2-5 minutes';
        break;
      case 'atm_cash_pickup':
        fee = 5.00;
        estimatedTime = '15 minutes';
        break;
    }
    
    const totalAmount = amount + fee;
    const reference = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    
    return res.json({
      success: true,
      data: {
        paymentMethodId,
        amount: parseFloat(amount),
        fee,
        totalAmount,
        estimatedTime,
        reference
      }
    });
  } catch (error) {
    console.error('Error generating quote:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate quote'
    });
  }
});

// POST /api/v1/send-money/transfer
router.post('/transfer', [
  authMiddleware,
  body('paymentMethodId')
    .isIn(['mymoolah_internal', 'sa_bank_transfer', 'atm_cash_pickup'])
    .withMessage('Invalid payment method'),
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least R1'),
  body('recipient')
    .isLength({ min: 1 })
    .withMessage('Recipient is required'),
  body('reference')
    .isLength({ min: 1 })
    .withMessage('Reference is required'),
  validateRequest,
  requireKycIfBankTransfer
], async (req, res) => {
  try {
    const { paymentMethodId, amount, recipient, reference } = req.body;
    const userId = req.user.id;
    
    // Simulate transfer processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate transaction ID
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    
    return res.json({
      success: true,
      message: 'Transfer initiated successfully',
      data: {
        transactionId,
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
      }
    });
  } catch (error) {
    console.error('Error processing transfer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process transfer'
    });
  }
});

// GET /api/v1/send-money/status/:transactionId
router.get('/status/:transactionId', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Simulate status check
    const statuses = ['processing', 'completed', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return res.json({
      success: true,
      data: {
        transactionId,
        status: randomStatus,
        completedAt: randomStatus === 'completed' ? new Date().toISOString() : null
      }
    });
  } catch (error) {
    console.error('Error checking transfer status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check transfer status'
    });
  }
});

module.exports = router; 