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
    console.error('KYC list error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve KYC records',
      errorCode: 'KYC_STATUS_FAILED',
      message: 'Could not load KYC records. Please try again.'
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
    console.error('KYC upload error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to upload document',
      errorCode: 'KYC_UPLOAD_FAILED',
      message: 'Could not process your document upload. Please try again.'
    });
  }
});

// Upload both KYC documents (identity and address)
router.post('/upload-documents', authenticateToken, upload.fields([
  { name: 'identityDocument', maxCount: 1 },
  { name: 'addressDocument', maxCount: 1 }
]), async (req, res) => {

  try {
    
    // Test KYC service import
    const KYCService = require('../services/kycService');
    
    // Test kycController import
    
    
    // Call the real KYC controller to test actual validation
    
    const result = await kycController.uploadDocuments(req, res);
    
    
  } catch (error) {
    console.error('KYC upload-documents error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to upload documents',
      errorCode: 'KYC_UPLOAD_FAILED',
      message: 'Could not process your document upload. Please try again.'
    });
  }
});

// Alias for frontend compatibility
router.post('/upload-document', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    await kycController.uploadDocument(req, res);
  } catch (error) {
    console.error('KYC upload-document error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to upload document',
      errorCode: 'KYC_UPLOAD_FAILED',
      message: 'Could not process your document upload. Please try again.'
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
    console.error('KYC status error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get KYC status',
      errorCode: 'KYC_STATUS_FAILED',
      message: 'Could not retrieve your KYC status. Please try again.'
    });
  }
});

// Manual KYC verification (admin/support only)
router.post('/manual-verify', authenticateToken, async (req, res) => {
  try {
    await kycController.manualVerifyKYC(req, res);
  } catch (error) {
    console.error('KYC manual verification error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to verify KYC',
      errorCode: 'KYC_VERIFICATION_FAILED',
      message: 'Could not complete manual verification. Please try again.'
    });
  }
});

// Get accepted document types
router.get('/accepted-documents/:documentType', async (req, res) => {
  try {
    await kycController.getAcceptedDocuments(req, res);
  } catch (error) {
    console.error('KYC accepted documents error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get accepted documents',
      errorCode: 'KYC_STATUS_FAILED',
      message: 'Could not load accepted document types. Please try again.'
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
    console.error('KYC status update error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update KYC status',
      errorCode: 'KYC_STATUS_FAILED',
      message: 'Could not update your KYC status. Please try again.'
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
      await u.update({ kycStatus: 'not_started', kyc_tier: null, idNumber: null, idType: null, idVerified: false });
    }

    return res.json({ success: true, message: 'KYC reset completed', data: { userId: targetUserId, deleted } });
  } catch (error) {
    console.error('KYC reset error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to reset KYC', errorCode: 'KYC_VERIFICATION_FAILED', message: 'Could not reset KYC state. Please try again.' });
  }
});

module.exports = router;