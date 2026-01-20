/**
 * Ad Routes for Watch to Earn
 * 
 * API routes for ad viewing and engagement.
 * Includes authentication, rate limiting, and idempotency middleware.
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const authenticateToken = require('../middleware/auth');
const { idempotencyMiddleware } = require('../middleware/idempotency');
const rateLimit = require('express-rate-limit');

// Extract client IP (for rate limiting)
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[0];
  }
  return req.ip || req.connection.remoteAddress;
};

// Rate limiter for ad views (fraud prevention)
// Max 5 ads per hour per user
const adViewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 ads per hour
  message: {
    success: false,
    error: 'Maximum 5 ads per hour. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false
  },
  keyGenerator: (req) => `${req.user.id}-ad-views`,
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.STAGING === 'true',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Maximum 5 ads per hour. Please try again later.',
      retryAfter: 3600 // 1 hour in seconds
    });
  }
});

// Rate limiter for engagements (more lenient)
// Max 10 engagements per day per user
const adEngagementLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 engagements per day
  message: {
    success: false,
    error: 'Maximum 10 engagements per day. Please try again tomorrow.',
    retryAfter: '24 hours'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false
  },
  keyGenerator: (req) => `${req.user.id}-ad-engagements`,
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.STAGING === 'true',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Maximum 10 engagements per day. Please try again tomorrow.',
      retryAfter: 86400 // 24 hours in seconds
    });
  }
});

// Routes
router.get('/available', authenticateToken, adController.getAvailableAds);
router.post('/:id/start', authenticateToken, adController.startView);
router.post('/:id/complete', authenticateToken, adViewLimiter, idempotencyMiddleware, adController.completeView);
router.post('/:id/engage', authenticateToken, adEngagementLimiter, idempotencyMiddleware, adController.recordEngagement);
router.get('/history', authenticateToken, adController.getViewHistory);

module.exports = router;
