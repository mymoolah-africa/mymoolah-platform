const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

const authController = new AuthController();

// Initialize auth system when routes are loaded
authController.initialize();

// Register user
router.post('/register', authController.register.bind(authController));

// Login user
router.post('/login', authController.login.bind(authController));

// Request password reset
router.post('/request-reset', authController.requestPasswordReset.bind(authController));

// Validate reset token
router.post('/validate-reset-token', authController.validateResetToken.bind(authController));

// Reset password
router.post('/reset-password', authController.resetPassword.bind(authController));

// Change password (protected route)
router.post('/change-password', 
  authenticateToken,
  authController.changePassword.bind(authController)
);

// Logout (protected route)
router.post('/logout', 
  authenticateToken,
  authController.logout.bind(authController)
);

// Get user profile (protected route)
router.get('/profile', 
  authenticateToken,
  authController.getProfile.bind(authController)
);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth API is working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
