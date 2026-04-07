'use strict';

/**
 * @module routes/disbursementClient
 * @description Client management routes for the disbursement platform.
 * Handles CRUD, KYB document lifecycle, fee configuration, and beneficiary file parsing.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const multer = require('multer');
const controller = require('../controllers/disbursementClientController');
const authenticateToken = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls', '.xml'];
    const ext = '.' + (file.originalname.split('.').pop() || '').toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error(`Unsupported file type "${ext}". Accepted: ${allowed.join(', ')}`));
  },
});

const standardLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  validate: { trustProxy: false },
});

const strictLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  validate: { trustProxy: false },
});

/* ------------------------------------------------------------------ */
/*  Client CRUD                                                       */
/* ------------------------------------------------------------------ */

router.get('/',
  authenticateToken,
  standardLimit,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('kyb_status').optional().isString(),
  ],
  controller.listClients.bind(controller),
);

router.get('/:clientId',
  authenticateToken,
  standardLimit,
  param('clientId').isInt({ min: 1 }),
  controller.getClient.bind(controller),
);

router.post('/',
  authenticateToken,
  strictLimit,
  [
    body('client_code')
      .notEmpty().withMessage('client_code is required')
      .isAlphanumeric().withMessage('client_code must be alphanumeric')
      .isLength({ max: 20 }).withMessage('client_code max 20 characters'),
    body('company_name')
      .notEmpty().withMessage('company_name is required')
      .isLength({ max: 255 }).withMessage('company_name max 255 characters'),
    body('contact_email')
      .notEmpty().withMessage('contact_email is required')
      .isEmail().withMessage('contact_email must be a valid email'),
    body('entity_type')
      .optional()
      .isIn(['company', 'sole_proprietor', 'trust', 'partnership', 'npo'])
      .withMessage('Invalid entity_type'),
    body('registration_number').optional().isString().isLength({ max: 50 }),
    body('contact_name').optional().isString().isLength({ max: 255 }),
    body('contact_phone').optional().isString().isLength({ max: 20 }),
    body('white_label_slug').optional().isString().isLength({ max: 50 }),
    body('float_limit').optional().isDecimal(),
  ],
  controller.createClient.bind(controller),
);

router.patch('/:clientId',
  authenticateToken,
  strictLimit,
  [
    param('clientId').isInt({ min: 1 }),
    body('company_name').optional().isString().isLength({ max: 255 }),
    body('contact_name').optional().isString().isLength({ max: 255 }),
    body('contact_email').optional().isEmail().withMessage('contact_email must be a valid email'),
    body('contact_phone').optional().isString().isLength({ max: 20 }),
    body('status')
      .optional()
      .isIn(['pending', 'active', 'suspended', 'closed'])
      .withMessage('Invalid status'),
    body('float_limit').optional().isDecimal(),
    body('white_label_slug').optional().isString().isLength({ max: 50 }),
    body('white_label_config').optional().isObject(),
    body('notification_channels').optional().isObject(),
  ],
  controller.updateClient.bind(controller),
);

/* ------------------------------------------------------------------ */
/*  KYB Document Management                                           */
/* ------------------------------------------------------------------ */

router.post('/:clientId/kyb-documents',
  authenticateToken,
  strictLimit,
  param('clientId').isInt({ min: 1 }),
  upload.single('document'),
  controller.uploadKybDocument.bind(controller),
);

router.patch('/:clientId/kyb-documents/:docId',
  authenticateToken,
  strictLimit,
  [
    param('clientId').isInt({ min: 1 }),
    param('docId').isInt({ min: 1 }),
    body('status')
      .notEmpty().withMessage('status is required')
      .isIn(['verified', 'rejected']).withMessage('status must be verified or rejected'),
    body('rejection_reason').optional().isString().isLength({ max: 1000 }),
  ],
  controller.reviewKybDocument.bind(controller),
);

/* ------------------------------------------------------------------ */
/*  Fee Configuration                                                 */
/* ------------------------------------------------------------------ */

router.get('/:clientId/fees',
  authenticateToken,
  standardLimit,
  param('clientId').isInt({ min: 1 }),
  controller.listFees.bind(controller),
);

router.post('/:clientId/fees',
  authenticateToken,
  strictLimit,
  [
    param('clientId').isInt({ min: 1 }),
    body('rail')
      .notEmpty().withMessage('rail is required')
      .isIn(['eft', 'payshap', 'wallet']).withMessage('rail must be eft, payshap, or wallet'),
    body('fee_type')
      .notEmpty().withMessage('fee_type is required')
      .isIn(['flat', 'percentage', 'flat_plus_percentage']).withMessage('Invalid fee_type'),
    body('flat_fee_cents')
      .notEmpty().withMessage('flat_fee_cents is required')
      .isInt({ min: 0 }).withMessage('flat_fee_cents must be a non-negative integer'),
    body('percentage_fee')
      .notEmpty().withMessage('percentage_fee is required')
      .isFloat({ min: 0 }).withMessage('percentage_fee must be >= 0'),
    body('min_fee_cents').optional().isInt({ min: 0 }),
    body('max_fee_cents').optional().isInt({ min: 0 }),
  ],
  controller.setFee.bind(controller),
);

/* ------------------------------------------------------------------ */
/*  Beneficiary File Upload (parse only, no run creation)             */
/* ------------------------------------------------------------------ */

router.post('/:clientId/upload-beneficiaries',
  authenticateToken,
  strictLimit,
  param('clientId').isInt({ min: 1 }),
  upload.single('file'),
  controller.uploadBeneficiaryFile.bind(controller),
);

module.exports = router;
