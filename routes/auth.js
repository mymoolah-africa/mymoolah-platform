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
const accountRegex = /^[0-9]{8,12}$/;
const usernameRegex = /^[a-zA-Z0-9._]{4,32}$/;

// GET /api/v1/auth/profile
router.get('/profile', authMiddleware, authController.getProfile);

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
  body('name')
    .isLength({ min: 2, max: 100 })
    .trim()
    .escape()
    .withMessage('Name must be between 2 and 100 characters'),
  body('identifier')
    .custom((value, { req }) => {
      const type = req.body.identifierType;
      if (!value) throw new Error('Identifier is required');
      if (type === 'phone' && !phoneRegex.test(value.replace(/\s/g, ''))) {
        throw new Error('Invalid South African mobile number');
      }
      if (type === 'account' && !accountRegex.test(value)) {
        throw new Error('Account number must be 8-12 digits');
      }
      if (type === 'username' && !usernameRegex.test(value)) {
        throw new Error('Username must be 4-32 characters (letters, numbers, periods, underscores)');
      }
      return true;
    }),
  body('identifierType')
    .isIn(['phone', 'account', 'username'])
    .withMessage('Identifier type must be phone, account, or username'),
  validateRequest
], authController.register);

// POST /api/v1/auth/login
router.post('/login', [
  body('identifier')
    .isLength({ min: 1 })
    .withMessage('Identifier is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  validateRequest
], authController.login);

module.exports = router;
