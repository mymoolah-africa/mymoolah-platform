'use strict';

/**
 * Client Portal Routes
 * Public + authenticated endpoints for disbursement client users.
 * Mounted at /api/v1/client-portal in server.js.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const authController = require('../controllers/disbursementClientAuthController');
const portalController = require('../controllers/disbursementClientPortalController');
const { authenticateClientPortal, requireClientRole } = require('../middleware/clientPortalAuth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls', '.xml'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

const standardLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  validate: { trustProxy: false },
});

const writeLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  validate: { trustProxy: false },
});

// ─── Public (unauthenticated) ────────────────────────────────────────────────

router.post('/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login,
);

// ─── Authenticated ───────────────────────────────────────────────────────────

router.get('/me',
  authenticateClientPortal,
  standardLimit,
  authController.getMe,
);

router.post('/change-password',
  authenticateClientPortal,
  writeLimit,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('New password must contain a number'),
  ],
  authController.changePassword,
);

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/summary',
  authenticateClientPortal,
  standardLimit,
  portalController.getSummary,
);

// ─── Runs ────────────────────────────────────────────────────────────────────

router.get('/runs',
  authenticateClientPortal,
  standardLimit,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
  ],
  portalController.listRuns,
);

router.get('/runs/:id',
  authenticateClientPortal,
  standardLimit,
  param('id').isInt({ min: 1 }),
  portalController.getRun,
);

router.post('/runs',
  authenticateClientPortal,
  requireClientRole(['maker', 'admin']),
  writeLimit,
  [
    body('beneficiaries')
      .isArray({ min: 1, max: 10000 })
      .withMessage('beneficiaries must be an array of 1-10,000 items'),
    body('beneficiaries.*.name')
      .notEmpty().withMessage('Each beneficiary must have a name')
      .isLength({ max: 140 }).withMessage('Name too long (max 140 chars)'),
    body('beneficiaries.*.accountNumber')
      .notEmpty().withMessage('Account number is required')
      .matches(/^\d{6,20}$/).withMessage('Account number must be 6-20 digits'),
    body('beneficiaries.*.branchCode')
      .notEmpty().withMessage('Branch code is required')
      .matches(/^\d{6}$/).withMessage('Branch code must be 6 digits'),
    body('beneficiaries.*.amount')
      .isFloat({ min: 0.01 }).withMessage('Amount must be greater than R 0.00'),
    body('rail')
      .optional()
      .isIn(['eft', 'rtc', 'payshap', 'wallet']).withMessage('rail must be eft, rtc, payshap, or wallet'),
    body('payPeriod')
      .optional()
      .matches(/^\d{4}-\d{2}$/).withMessage('payPeriod must be YYYY-MM format'),
  ],
  portalController.createRun,
);

router.post('/runs/:id/submit',
  authenticateClientPortal,
  requireClientRole(['maker', 'admin']),
  writeLimit,
  param('id').isInt({ min: 1 }),
  portalController.submitForApproval,
);

router.get('/runs/:id/results',
  authenticateClientPortal,
  standardLimit,
  param('id').isInt({ min: 1 }),
  portalController.downloadResults,
);

// ─── File Upload ─────────────────────────────────────────────────────────────

router.post('/upload-beneficiaries',
  authenticateClientPortal,
  requireClientRole(['maker', 'admin']),
  writeLimit,
  upload.single('file'),
  portalController.uploadBeneficiaries,
);

module.exports = router;
