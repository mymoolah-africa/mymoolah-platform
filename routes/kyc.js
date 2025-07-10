const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kycController');

// GET /api/v1/kyc - List all KYC records
router.get('/', kycController.getAllKyc);

// Submit KYC document
router.post('/submit', kycController.submitKyc);

// Get KYC status for a user
router.get('/status/:userId', kycController.getKycStatus);

// Admin: Update KYC status
router.post('/review', kycController.updateKycStatus);

module.exports = router;