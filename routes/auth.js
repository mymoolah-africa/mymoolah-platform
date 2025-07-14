const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { body } = require('express-validator');

// GET /api/v1/auth/profile
router.get('/profile', authMiddleware, authController.getProfile);

// POST /api/v1/auth/register
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], authController.register);

// POST /api/v1/auth/login
router.post('/login', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], authController.login);

module.exports = router;
