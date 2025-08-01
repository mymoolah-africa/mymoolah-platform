const express = require('express');
const multer = require('multer');
const router = express.Router();
const kycController = require('../controllers/kycController');
const authenticateToken = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
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
  { name: 'identityDocument', maxCount: 1 },
  { name: 'addressDocument', maxCount: 1 }
]), async (req, res) => {
  try {
    await kycController.uploadDocuments(req, res);
  } catch (error) {
    console.error('❌ Error in KYC upload-documents route:', error);
    res.status(500).json({
      error: 'UPLOAD_ROUTE_ERROR',
      message: 'Error processing upload'
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
    const UserModel = require('../models/User');
    const userModel = new UserModel();
    await userModel.updateKYCStatus(userId, status);

    // Get updated user data
    const updatedUser = await userModel.getUserById(userId);
    
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