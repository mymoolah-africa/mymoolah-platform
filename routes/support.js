const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const authenticateToken = require('../middleware/auth');

/**
 * Support Routes
 * AI-powered support chat functionality
 */

// Health check - no auth required
router.get('/health', supportController.healthCheck);

// Get FAQ - no auth required
router.get('/faq', supportController.getFAQ);

// Process chat message - no auth required (for initial support)
router.post('/chat', supportController.processChatMessage);

// Get user context - requires auth
router.get('/context', authenticateToken, supportController.getUserContext);

// Submit feedback - requires auth
router.post('/feedback', authenticateToken, supportController.submitFeedback);

// Get support statistics - requires admin auth
router.get('/stats', authenticateToken, supportController.getSupportStats);

module.exports = router;