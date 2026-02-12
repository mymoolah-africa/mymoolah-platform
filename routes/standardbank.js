'use strict';

/**
 * Standard Bank PayShap Routes
 * RPP (Rapid Payments) and RTP (Request to Pay)
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const standardbankController = require('../controllers/standardbankController');

const rawBodyMiddleware = express.raw({ type: 'application/json', limit: '10mb' });

const parseJsonBody = (req, res, next) => {
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf8'));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
  next();
};

// RPP initiation (Send Money)
router.post('/payshap/rpp', auth, standardbankController.initiatePayShapRpp);

// RTP initiation (Request Money)
router.post('/payshap/rtp', auth, standardbankController.initiatePayShapRtp);

// Callbacks (no auth - validated via x-GroupHeader-Hash)
router.post('/callback', rawBodyMiddleware, parseJsonBody, standardbankController.handleRppCallback);
router.post('/realtime-callback', rawBodyMiddleware, parseJsonBody, standardbankController.handleRppRealtimeCallback);
router.post('/rtp-callback', rawBodyMiddleware, parseJsonBody, standardbankController.handleRtpCallback);
router.post('/rtp-realtime-callback', rawBodyMiddleware, parseJsonBody, standardbankController.handleRtpRealtimeCallback);

module.exports = router;
