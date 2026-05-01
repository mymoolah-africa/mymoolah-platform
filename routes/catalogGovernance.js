'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const ProductCatalogGovernanceService = require('../services/productCatalogGovernanceService');

const router = express.Router();
const service = new ProductCatalogGovernanceService();

const standardLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  validate: { trustProxy: false },
});

const strictLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  validate: { trustProxy: false },
});

function requireCatalogAccess(req, res, next) {
  const role = req.user?.role;
  if (role === 'admin' || role === 'manager' || req.user?.isAdmin) return next();
  return res.status(403).json({
    success: false,
    error: 'Catalog governance access denied',
    errorCode: 'CATALOG_GOVERNANCE_ACCESS_DENIED',
  });
}

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    details: errors.array(),
  });
}

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    success: false,
    error: error.statusCode ? error.message : 'Catalog governance request failed',
    errorCode: error.code || 'CATALOG_GOVERNANCE_ERROR',
    details: error.details,
  });
}

router.use(authenticateToken, requireCatalogAccess);

router.get('/mappings',
  standardLimit,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('reviewStatus').optional().isString().isLength({ max: 40 }),
    query('publishStatus').optional().isString().isLength({ max: 40 }),
    query('productType').optional().isString().isLength({ max: 50 }),
    query('category').optional().isString().isLength({ max: 80 }),
    query('riskTier').optional().isString().isLength({ max: 30 }),
    query('supplierCode').optional().isString().isLength({ max: 50 }),
    query('q').optional().isString().isLength({ max: 100 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const result = await service.listMappings(req.query);
      return res.json({ success: true, data: result });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

router.get('/mappings/:id',
  standardLimit,
  param('id').isInt({ min: 1 }),
  handleValidation,
  async (req, res) => {
    try {
      const mapping = await service.getMapping(req.params.id);
      return res.json({ success: true, data: mapping });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

router.patch('/mappings/:id',
  strictLimit,
  [
    param('id').isInt({ min: 1 }),
    body('canonicalName').optional({ nullable: true }).isString().isLength({ max: 255 }),
    body('canonicalBrand').optional({ nullable: true }).isString().isLength({ max: 255 }),
    body('category').optional({ nullable: true }).isString().isLength({ max: 80 }),
    body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
    body('iconKey').optional({ nullable: true }).isString().isLength({ max: 80 }),
    body('logoKey').optional({ nullable: true }).isString().isLength({ max: 120 }),
    body('riskTier').optional({ nullable: true }).isIn(['low', 'medium', 'high']),
    body('metadata').optional({ nullable: true }).isObject(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const mapping = await service.updateMapping(req.params.id, req.body, req.user);
      return res.json({ success: true, data: mapping });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

router.post('/mappings/:id/submit',
  strictLimit,
  param('id').isInt({ min: 1 }),
  handleValidation,
  async (req, res) => {
    try {
      const mapping = await service.submitForApproval(req.params.id, req.user);
      return res.json({ success: true, data: mapping });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

router.post('/mappings/:id/approve',
  strictLimit,
  param('id').isInt({ min: 1 }),
  handleValidation,
  async (req, res) => {
    try {
      const mapping = await service.approve(req.params.id, req.user);
      return res.json({ success: true, data: mapping });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

router.post('/mappings/:id/reject',
  strictLimit,
  [
    param('id').isInt({ min: 1 }),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const mapping = await service.reject(req.params.id, req.body.reason, req.user);
      return res.json({ success: true, data: mapping });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

router.post('/mappings/:id/suspend',
  strictLimit,
  [
    param('id').isInt({ min: 1 }),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const mapping = await service.setLifecycleStatus(req.params.id, 'suspend', req.body.reason, req.user);
      return res.json({ success: true, data: mapping });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

router.post('/mappings/:id/retire',
  strictLimit,
  [
    param('id').isInt({ min: 1 }),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const mapping = await service.setLifecycleStatus(req.params.id, 'retire', req.body.reason, req.user);
      return res.json({ success: true, data: mapping });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

router.post('/backfill',
  strictLimit,
  [
    body('productType').optional().isIn(['voucher', 'airtime', 'data', 'electricity', 'bill_payment']),
    body('limit').optional().isInt({ min: 1, max: 5000 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const result = await service.ensureMappingsForActiveVariants({
        productType: req.body.productType,
        limit: req.body.limit,
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

module.exports = router;
