const express = require('express');
const router = express.Router();
const SupportController = require('../controllers/supportController');
const authenticateToken = require('../middleware/auth');

/**
 * 🏦 Banking-Grade Support Routes
 * Mojaloop & ISO20022 Compliant
 */

// 🎯 Process Support Chat Message
router.post('/chat', authenticateToken, SupportController.processChatMessage);

// 📊 Get Support Service Health Status
router.get('/health', authenticateToken, SupportController.getHealthStatus);

// 📊 Get Performance Metrics
router.get('/metrics', authenticateToken, SupportController.getPerformanceMetrics);

module.exports = router;