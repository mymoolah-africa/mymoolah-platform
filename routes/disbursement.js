'use strict';

/**
 * Disbursement Routes
 * Admin-portal-only routes for the SBSA H2H wage/salary disbursement feature.
 * Protected by JWT + portalAuth middleware.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

const express    = require('express');
const router     = express.Router();
const { body, query, param } = require('express-validator');
const controller = require('../controllers/disbursementController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit  = require('express-rate-limit');

const standardLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  validate: { trustProxy: false },
});

const strictLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  validate: { trustProxy: false },
});

// Beneficiary validation for createRun
const beneficiaryValidation = [
  body('beneficiaries')
    .isArray({ min: 1, max: 10000 })
    .withMessage('beneficiaries must be an array of 1–10,000 items'),
  body('beneficiaries.*.name')
    .notEmpty().withMessage('Each beneficiary must have a name')
    .isLength({ max: 140 }).withMessage('Name too long (max 140 chars)'),
  body('beneficiaries.*.accountNumber')
    .notEmpty().withMessage('Account number is required')
    .matches(/^\d{6,20}$/).withMessage('Account number must be 6–20 digits'),
  body('beneficiaries.*.branchCode')
    .notEmpty().withMessage('Branch code is required')
    .matches(/^\d{6}$/).withMessage('Branch code must be 6 digits'),
  body('beneficiaries.*.amount')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than R 0.00'),
  body('rail')
    .optional()
    .isIn(['eft', 'rtc']).withMessage('rail must be eft or rtc'),
  body('payPeriod')
    .optional()
    .matches(/^\d{4}-\d{2}$/).withMessage('payPeriod must be YYYY-MM format'),
];

/**
 * @route GET /api/v1/disbursements
 * @desc  List disbursement runs (paginated)
 * @access Admin portal users
 */
router.get('/',
  authenticateToken,
  standardLimit,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
  ],
  controller.listRuns
);

/**
 * @route GET /api/v1/disbursements/:id
 * @desc  Get a single run with all payment lines
 * @access Admin portal users
 */
router.get('/:id',
  authenticateToken,
  standardLimit,
  param('id').isInt({ min: 1 }),
  controller.getRun
);

/**
 * @route GET /api/v1/disbursements/:id/payments
 * @desc  List payment lines for a run
 * @access Admin portal users
 */
router.get('/:id/payments',
  authenticateToken,
  standardLimit,
  param('id').isInt({ min: 1 }),
  query('status').optional().isString(),
  controller.listPayments
);

/**
 * @route POST /api/v1/disbursements
 * @desc  Maker creates a new disbursement run
 * @access Admin portal — maker role
 */
router.post('/',
  authenticateToken,
  strictLimit,
  beneficiaryValidation,
  controller.createRun
);

/**
 * @route POST /api/v1/disbursements/:id/submit
 * @desc  Maker submits a draft run for checker approval
 * @access Admin portal — maker role
 */
router.post('/:id/submit',
  authenticateToken,
  strictLimit,
  param('id').isInt({ min: 1 }),
  controller.submitForApproval
);

/**
 * @route POST /api/v1/disbursements/:id/approve
 * @desc  Checker approves a run → Pain.001 submitted to SBSA
 * @access Admin portal — checker role (must differ from maker)
 */
router.post('/:id/approve',
  authenticateToken,
  strictLimit,
  param('id').isInt({ min: 1 }),
  controller.approveRun
);

/**
 * @route POST /api/v1/disbursements/:id/reject
 * @desc  Checker rejects a run
 * @access Admin portal — checker role
 */
router.post('/:id/reject',
  authenticateToken,
  strictLimit,
  [
    param('id').isInt({ min: 1 }),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  controller.rejectRun
);

/**
 * @route POST /api/v1/disbursements/:id/resubmit-failed
 * @desc  Maker creates a resubmission run for failed payments
 * @access Admin portal — maker role
 */
router.post('/:id/resubmit-failed',
  authenticateToken,
  strictLimit,
  [
    param('id').isInt({ min: 1 }),
    body('corrections').optional().isArray(),
    body('corrections.*.paymentId').optional().isInt({ min: 1 }),
    body('corrections.*.correctedAccountNumber').optional().matches(/^\d{6,20}$/),
    body('corrections.*.correctedBranchCode').optional().matches(/^\d{6}$/),
  ],
  controller.resubmitFailed
);

module.exports = router;
