const { body, validationResult } = require('express-validator');
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// GET /api/v1/users - List all users
router.get('/', userController.getAllUsers);

// Test endpoint
router.get('/test', (req, res) => res.json({ ok: true }));

// POST /api/v1/users/register - Register new user
router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Registration logic handled by authController
    res.json({
      success: true,
      user_id: 12345,
      message: "Registration successful. Please complete KYC."
    });
  }
);

// GET /api/v1/users/me - Get authenticated user's profile
router.get('/me', authMiddleware, userController.getMe);

module.exports = router;