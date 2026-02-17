'use strict';

const express = require('express');
const router = express.Router();
const CatalogSyncController = require('../controllers/catalogSyncController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const catalogSyncController = new CatalogSyncController();

// Helper function to extract client IP from X-Forwarded-For header
// Cloud Run has exactly 1 proxy hop (Google Cloud Load Balancer)
// Format: X-Forwarded-For: client-ip, proxy-ip
// We want the first IP (client IP)
const getClientIP = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client-ip, proxy-ip"
    // Cloud Run has 1 proxy, so we take the first IP
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0] || req.ip || req.connection.remoteAddress;
  }
  return req.ip || req.connection.remoteAddress;
};

// Rate limiting for catalog sync operations
// With trust proxy disabled, we manually extract IP from X-Forwarded-For header
// This prevents express-rate-limit from throwing ValidationError
const catalogSyncLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many catalog sync requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false // Disable validation - we handle proxy manually
  },
  keyGenerator: (req) => getClientIP(req),
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

/**
 * @route POST /api/v1/catalog-sync/refresh-best-offers
 * @desc Refresh vas_best_offers table (one product per denomination, highest commission)
 * @access Admin only (or public if no auth - for script/cron use)
 */
router.post('/refresh-best-offers', auth, catalogSyncController.refreshBestOffers.bind(catalogSyncController));

module.exports = router;





