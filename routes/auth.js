const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

const authController = new AuthController();

// Register new user
router.post('/register', 
  authController.validateRegistration(),
  authController.register.bind(authController)
);

// Login user
router.post('/login', 
  authController.validateLogin(),
  authController.login.bind(authController)
);

// Get user profile (protected route)
router.get('/profile', 
  authenticateToken,
  authController.profile.bind(authController)
);

// Forgot password
router.post('/forgot-password', 
  authController.forgotPassword.bind(authController)
);

// Reset password
router.post('/reset-password', 
  authController.resetPassword.bind(authController)
);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth API is working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;