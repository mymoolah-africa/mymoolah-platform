const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/kyc/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'), false);
    }
  }
});

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// GET /api/v1/kyc/status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Simulate KYC status check
    const statuses = ['pending', 'documents_uploaded', 'processing', 'verified', 'rejected'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    const kycData = {
      status: randomStatus,
      progress: randomStatus === 'pending' ? 0 : 
                randomStatus === 'documents_uploaded' ? 25 :
                randomStatus === 'processing' ? 75 :
                randomStatus === 'verified' ? 100 : 0,
      documents: {
        identity: randomStatus !== 'pending' ? 'uploaded' : 'pending',
        address: randomStatus === 'verified' ? 'uploaded' : 'pending',
        selfie: randomStatus === 'verified' ? 'uploaded' : 'pending'
      },
      submittedAt: randomStatus !== 'pending' ? new Date().toISOString() : null,
      verifiedAt: randomStatus === 'verified' ? new Date().toISOString() : null,
      rejectionReason: randomStatus === 'rejected' ? 'Document quality too low' : null
    };
    
    return res.json({
      success: true,
      data: kycData
    });
  } catch (error) {
    console.error('Error checking KYC status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check KYC status'
    });
  }
});

// POST /api/v1/kyc/upload-document
router.post('/upload-document', [
  authMiddleware,
  upload.single('document'),
  body('documentType')
    .isIn(['identity', 'address', 'selfie'])
    .withMessage('Document type must be identity, address, or selfie'),
  validateRequest
], async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Simulate document processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        documentType,
        filename: req.file.filename,
        uploadedAt: new Date().toISOString(),
        status: 'uploaded'
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  }
});

// POST /api/v1/kyc/submit
router.post('/submit', [
  authMiddleware,
  body('firstName')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('nationality')
    .isLength({ min: 2, max: 50 })
    .withMessage('Nationality must be between 2 and 50 characters'),
  body('address')
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters'),
  body('city')
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  body('postalCode')
    .isLength({ min: 4, max: 10 })
    .withMessage('Postal code must be between 4 and 10 characters'),
  validateRequest
], async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, dateOfBirth, nationality, address, city, postalCode } = req.body;
    
    // Simulate KYC submission processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return res.json({
      success: true,
      message: 'KYC submitted successfully',
      data: {
        status: 'processing',
        submittedAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    });
  } catch (error) {
    console.error('Error submitting KYC:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit KYC'
    });
  }
});

// GET /api/v1/kyc/requirements
router.get('/requirements', authMiddleware, async (req, res) => {
  try {
    const requirements = {
      documents: [
        {
          type: 'identity',
          name: 'Identity Document',
          description: 'Valid South African ID book, passport, or driver\'s license',
          required: true,
          acceptedFormats: ['JPG', 'PNG', 'PDF'],
          maxSize: '10MB'
        },
        {
          type: 'address',
          name: 'Proof of Address',
          description: 'Recent utility bill, bank statement, or municipal account',
          required: true,
          acceptedFormats: ['JPG', 'PNG', 'PDF'],
          maxSize: '10MB'
        },
        {
          type: 'selfie',
          name: 'Selfie with ID',
          description: 'Photo of yourself holding your identity document',
          required: true,
          acceptedFormats: ['JPG', 'PNG'],
          maxSize: '10MB'
        }
      ],
      personalInfo: [
        {
          field: 'firstName',
          name: 'First Name',
          required: true,
          type: 'text'
        },
        {
          field: 'lastName',
          name: 'Last Name',
          required: true,
          type: 'text'
        },
        {
          field: 'dateOfBirth',
          name: 'Date of Birth',
          required: true,
          type: 'date'
        },
        {
          field: 'nationality',
          name: 'Nationality',
          required: true,
          type: 'text'
        },
        {
          field: 'address',
          name: 'Residential Address',
          required: true,
          type: 'textarea'
        },
        {
          field: 'city',
          name: 'City',
          required: true,
          type: 'text'
        },
        {
          field: 'postalCode',
          name: 'Postal Code',
          required: true,
          type: 'text'
        }
      ]
    };
    
    return res.json({
      success: true,
      data: requirements
    });
  } catch (error) {
    console.error('Error getting KYC requirements:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get KYC requirements'
    });
  }
});

module.exports = router;