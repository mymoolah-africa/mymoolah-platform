const express = require('express');
const router = express.Router();
const sweepController = require('../controllers/sweepController');
const authenticateToken = require('../middleware/auth');

/**
 * 🚀 MyMoolah Codebase Sweep Routes
 * API endpoints for managing the automated codebase analysis system
 */

// All routes require authentication
router.use(authenticateToken);

/**
 * 🔄 POST /api/v1/sweep/force
 * Force immediate codebase sweep
 * 
 * @body {} (no body required)
 * @returns {Object} Sweep results and discovered capabilities
 */
router.post('/force', sweepController.forceSweep);

/**
 * 📊 GET /api/v1/sweep/status
 * Get current sweep status and discovered capabilities
 * 
 * @returns {Object} Current sweep status and capabilities
 */
router.get('/status', sweepController.getSweepStatus);

/**
 * 🚀 POST /api/v1/sweep/start
 * Start the automated sweep scheduler
 * 
 * @returns {Object} Scheduler status
 */
router.post('/start', sweepController.startScheduler);

/**
 * ⏹️ POST /api/v1/sweep/stop
 * Stop the automated sweep scheduler
 * 
 * @returns {Object} Scheduler status
 */
router.post('/stop', sweepController.stopScheduler);

module.exports = router;
