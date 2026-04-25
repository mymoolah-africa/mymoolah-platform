const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const { requireKYCVerification } = require('../middleware/kycMiddleware');
const walletBankPaymentService = require('../services/walletBankPaymentService');

const router = express.Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  return next();
}

function handleError(res, err) {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Could not process wallet to bank payment. Please try again.' : err.message,
    error: statusCode >= 500 ? 'WALLET_BANK_PAYMENT_FAILED' : err.message,
  });
}

router.post('/quote', [
  authMiddleware,
  requireKYCVerification,
  body('beneficiaryAccountId').isInt({ min: 1 }).withMessage('Bank beneficiary account is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least R1'),
  body('rail').optional().isIn(['eft', 'payshap']).withMessage('Rail must be eft or payshap'),
  validateRequest,
], async (req, res) => {
  try {
    const quote = await walletBankPaymentService.quoteWalletBankPayment({
      userId: req.user.id,
      beneficiaryAccountId: Number(req.body.beneficiaryAccountId),
      amount: Number(req.body.amount),
      rail: req.body.rail || 'eft',
    });
    return res.json({ success: true, data: quote });
  } catch (err) {
    console.error('Wallet-bank quote error:', err.message);
    return handleError(res, err);
  }
});

router.post('/submit', [
  authMiddleware,
  requireKYCVerification,
  body('beneficiaryAccountId').isInt({ min: 1 }).withMessage('Bank beneficiary account is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least R1'),
  body('rail').optional().isIn(['eft', 'payshap']).withMessage('Rail must be eft or payshap'),
  body('reference').optional({ nullable: true }).isString().isLength({ max: 80 }).withMessage('Reference must be 80 characters or less'),
  validateRequest,
], async (req, res) => {
  try {
    const payload = {
      userId: req.user.id,
      beneficiaryAccountId: Number(req.body.beneficiaryAccountId),
      amount: Number(req.body.amount),
      reference: req.body.reference,
    };
    const result = req.body.rail === 'payshap'
      ? await walletBankPaymentService.submitPayshapPayment(payload)
      : await walletBankPaymentService.submitEftPayment(payload);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('Wallet-bank submit error:', err.message);
    return handleError(res, err);
  }
});

module.exports = router;
