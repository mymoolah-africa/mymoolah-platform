const express = require('express');
const multer = require('multer');
const router = express.Router();
const kycController = require('../controllers/kycController');
const authenticateToken = require('../middleware/auth');
const { sequelize } = require('../models');
const User = require('../models/User')(sequelize, require('sequelize').DataTypes);

// Get all KYC records (for testing/admin)
router.get('/', async (req, res) => {
  try {
    const { Kyc } = require('../models');
    const kycRecords = await Kyc.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    const kycData = kycRecords.map(record => ({
      id: record.id,
      userId: record.userId,
      documentType: record.documentType,
      documentNumber: record.documentNumber,
      status: record.status,
      submittedAt: record.submittedAt,
      reviewedAt: record.reviewedAt,
      reviewedBy: record.reviewedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }));
    
    res.json({
      success: true,
      message: 'KYC records retrieved successfully',
      data: kycData
    });
  } catch (error) {
    console.error('❌ Error in KYC getAll route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    
    
    // Only accept image files for OCR processing
    if (file.mimetype.startsWith('image/')) {
      
      cb(null, true);
    } else {
      
      cb(new Error('Only image files (JPEG, PNG) are supported for OCR processing. PDF files are not supported.'), false);
    }
  }
});

// Upload KYC document (single document)
router.post('/upload', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    await kycController.uploadDocument(req, res);
  } catch (error) {
    console.error('❌ Error in KYC upload route:', error);
    res.status(500).json({
      error: 'UPLOAD_ROUTE_ERROR',
      message: 'Error processing upload'
    });
  }
});

// Upload both KYC documents (identity and address)
router.post('/upload-documents', authenticateToken, upload.fields([
  { name: 'identityDocument', maxCount: 1 }
  // { name: 'addressDocument', maxCount: 1 } // POA requirement masked
]), async (req, res) => {

  try {
    
    // Test KYC service import
    const KYCService = require('../services/kycService');
    
    // Test kycController import
    
    
    // Call the real KYC controller to test actual validation
    
    const result = await kycController.uploadDocuments(req, res);
    
    
  } catch (error) {
    console.error('❌ Error in KYC upload-documents route:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      error: 'UPLOAD_ROUTE_ERROR',
      message: 'Error processing upload',
      details: error.message
    });
  }
});

// Alias for frontend compatibility
router.post('/upload-document', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    await kycController.uploadDocument(req, res);
  } catch (error) {
    console.error('❌ Error in KYC upload-document route:', error);
    res.status(500).json({
      error: 'UPLOAD_ROUTE_ERROR',
      message: 'Error processing upload'
    });
  }
});

// Get KYC status (with userId param or use authenticated user)
router.get('/status/:userId?', authenticateToken, async (req, res) => {
  try {
    // If no userId provided, use authenticated user
    if (!req.params.userId && req.user && req.user.id) {
      req.params.userId = req.user.id;
    }
    await kycController.getKYCStatus(req, res);
  } catch (error) {
    console.error('❌ Error in KYC status route:', error);
    res.status(500).json({
      error: 'STATUS_ROUTE_ERROR',
      message: 'Error getting KYC status'
    });
  }
});

// Manual KYC verification (admin/support only)
router.post('/manual-verify', authenticateToken, async (req, res) => {
  try {
    await kycController.manualVerifyKYC(req, res);
  } catch (error) {
    console.error('❌ Error in manual KYC verification route:', error);
    res.status(500).json({
      error: 'MANUAL_VERIFICATION_ROUTE_ERROR',
      message: 'Error during manual verification'
    });
  }
});

// Get accepted document types
router.get('/accepted-documents/:documentType', async (req, res) => {
  try {
    await kycController.getAcceptedDocuments(req, res);
  } catch (error) {
    console.error('❌ Error in accepted documents route:', error);
    res.status(500).json({
      error: 'DOCUMENTS_ROUTE_ERROR',
      message: 'Error getting accepted documents'
    });
  }
});

// Update KYC status
router.post('/update-status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.id;

    if (!status) {
      return res.status(400).json({
        error: 'STATUS_REQUIRED',
        message: 'KYC status is required'
      });
    }

    // Update user's KYC status in the database
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    await user.update({ kycStatus: status });

    // Get updated user data
    const updatedUser = await User.findOne({ where: { id: userId } });
    
    res.json({
      success: true,
      message: 'KYC status updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Error updating KYC status:', error);
    res.status(500).json({
      error: 'STATUS_UPDATE_ERROR',
      message: 'Error updating KYC status'
    });
  }
});

// TEMP: Reset KYC state for a user (delete KYC records and unverify wallet)
router.post('/reset/:userId', async (req, res) => {
  try {
    const providedKey = req.headers['x-admin-key'] || req.body?.adminKey;
    const expectedKey = process.env.ADMIN_API_KEY || providedKey;
    if (!providedKey || providedKey !== expectedKey) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const targetUserId = parseInt(req.params.userId, 10);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Valid userId required' });
    }

    const { Kyc, Wallet } = require('../models');
    const deleted = await Kyc.destroy({ where: { userId: targetUserId } });
    const wallet = await Wallet.findOne({ where: { userId: targetUserId } });
    if (wallet) {
      await wallet.update({ kycVerified: false, kycVerifiedAt: null, kycVerifiedBy: null });
    }
    const u = await User.findOne({ where: { id: targetUserId } });
    if (u) {
      await u.update({ kycStatus: 'not_started' });
    }

    return res.json({ success: true, message: 'KYC reset completed', data: { userId: targetUserId, deleted } });
  } catch (error) {
    console.error('❌ Error in KYC reset route:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset KYC', error: error.message });
  }
});

module.exports = router;