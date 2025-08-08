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

module.exports = router;