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
    console.log('🔍 Multer fileFilter called for:', file.fieldname, file.originalname, file.mimetype);
    
    // Only accept image files for OCR processing
    if (file.mimetype.startsWith('image/')) {
      console.log('✅ File accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('❌ File rejected:', file.originalname, 'MIME type:', file.mimetype);
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
  console.log('🎯 KYC UPLOAD ROUTE HIT - REAL VALIDATION');
  console.log('🎯 KYC UPLOAD ROUTE HIT - REAL VALIDATION');
  console.log('🎯 KYC UPLOAD ROUTE HIT - REAL VALIDATION');
  
  try {
    console.log('🚀 KYC upload-documents ROUTE HIT');
    console.log('🔍 KYC upload-documents route called');
    console.log('📁 Files received:', req.files);
    console.log('📝 Body received:', req.body);
    console.log('👤 User:', req.user);
    
    // Test KYC service import
    console.log('🔍 Testing KYC service import...');
    const KYCService = require('../services/kycService');
    console.log('✅ KYCService imported successfully');
    console.log('🔍 KYCService type:', typeof KYCService);
    console.log('🔍 KYCService.processKYCSubmission:', typeof KYCService.processKYCSubmission);
    
    // Test kycController import
    console.log('🔍 Testing kycController import...');
    console.log('🔍 kycController type:', typeof kycController);
    console.log('🔍 kycController.uploadDocuments:', typeof kycController.uploadDocuments);
    
    // Call the real KYC controller to test actual validation
    console.log('🔍 Calling kycController.uploadDocuments...');
    const result = await kycController.uploadDocuments(req, res);
    console.log('✅ kycController.uploadDocuments completed');
    console.log('🔍 Result:', result);
    
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

// Get KYC status
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
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

module.exports = router;