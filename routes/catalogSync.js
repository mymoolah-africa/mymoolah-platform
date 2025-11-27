'use strict';

const express = require('express');
const router = express.Router();
const CatalogSyncController = require('../controllers/catalogSyncController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const catalogSyncController = new CatalogSyncController();

// Custom IP extraction function (avoids trust proxy validation)
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
};

// Rate limiting for catalog sync operations
const catalogSyncLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many catalog sync requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
});

// Apply rate limiting to all routes
router.use(catalogSyncLimit);

/**
 * @route GET /api/v1/catalog-sync/status
 * @desc Get catalog synchronization service status
 * @access Public
 */
router.get('/status', catalogSyncController.getStatus.bind(catalogSyncController));

/**
 * @route GET /api/v1/catalog-sync/health
 * @desc Health check for catalog synchronization service
 * @access Public
 */
router.get('/health', catalogSyncController.healthCheck.bind(catalogSyncController));

/**
 * @route GET /api/v1/catalog-sync/stats
 * @desc Get synchronization statistics
 * @access Admin only
 */
router.get('/stats', auth, catalogSyncController.getSyncStats.bind(catalogSyncController));

/**
 * @route POST /api/v1/catalog-sync/sweep
 * @desc Trigger manual daily sweep
 * @access Admin only
 */
router.post('/sweep', auth, catalogSyncController.triggerDailySweep.bind(catalogSyncController));

/**
 * @route POST /api/v1/catalog-sync/update
 * @desc Trigger manual frequent update
 * @access Admin only
 */
router.post('/update', auth, catalogSyncController.triggerFrequentUpdate.bind(catalogSyncController));

/**
 * @route POST /api/v1/catalog-sync/start
 * @desc Start catalog synchronization service
 * @access Admin only
 */
router.post('/start', auth, catalogSyncController.startService.bind(catalogSyncController));

/**
 * @route POST /api/v1/catalog-sync/stop
 * @desc Stop catalog synchronization service
 * @access Admin only
 */
router.post('/stop', auth, catalogSyncController.stopService.bind(catalogSyncController));

module.exports = router;





