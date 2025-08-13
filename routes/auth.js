const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

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

const phoneRegex = /^(\+27|27|0)?[6-8][0-9]{8}$/;

// GET /api/v1/auth/profile
router.get('/profile', authMiddleware, authController.getProfile);

// GET /api/v1/auth/verify
router.get('/verify', authMiddleware, authController.verify);

// POST /api/v1/auth/refresh
router.post('/refresh', authMiddleware, authController.refreshToken);

// POST /api/v1/auth/register
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .custom(value => {
      const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!regex.test(value)) {
        throw new Error('Password must be at least 8 characters and contain a letter, a number, and a special character');
      }
      return true;
    }),
  body('phoneNumber')
    .matches(phoneRegex)
    .withMessage('Invalid South African mobile number'),
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  // ID type and number must be provided at registration so OCR can compare later
  body('idType')
    .isIn(['south_african_id', 'south_african_temporary_id', 'south_african_driving_license', 'passport'])
    .withMessage('idType must be one of: south_african_id | south_african_temporary_id | south_african_driving_license | passport'),
  body('idNumber')
    .custom((value, { req }) => {
      const idType = req.body.idType;
      const v = String(value || '').replace(/\s/g, '');
      const luhn13 = (digits) => {
        if (!/^\d{13}$/.test(digits)) return false;
        let sum = 0; let alt = false;
        for (let i = digits.length - 1; i >= 0; i--) {
          let d = parseInt(digits[i], 10);
          if (alt) { d *= 2; if (d > 9) d -= 9; }
          sum += d; alt = !alt;
        }
        return sum % 10 === 0;
      };
      if (idType === 'south_african_id' || idType === 'south_african_temporary_id') {
        if (!luhn13(v)) {
          throw new Error('South African ID/Temporary ID must be 13 digits and pass checksum');
        }
      } else if (idType === 'south_african_driving_license') {
        if (!/^[A-Z]{2}\d{6}[A-Z]{2}$/.test(v.toUpperCase())) {
          throw new Error('Driving license format must be AA999999AA');
        }
      } else if (idType === 'passport') {
        if (!/^[A-Z0-9]{6,9}$/i.test(v)) {
          throw new Error('Passport number must be 6–9 alphanumeric characters');
        }
      }
      return true;
    }),
  validateRequest
], authController.register);

// POST /api/v1/auth/login
router.post('/login', [
  body('identifier')
    .matches(phoneRegex)
    .withMessage('Identifier must be a valid South African mobile number'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  validateRequest
], authController.login);

// POST /api/v1/auth/change-password
router.post('/change-password', [
  authMiddleware,
  body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
  body('newPassword').custom(value => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!regex.test(value)) {
      throw new Error('Password must be at least 8 characters and contain a letter, a number, and a special character');
    }
    return true;
  }),
  body('confirmNewPassword').isLength({ min: 1 }).withMessage('Please confirm your new password'),
  validateRequest
], authController.changePassword);

module.exports = router;