const { body, validationResult } = require('express-validator');
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// GET /api/v1/users - List all users
router.get('/', userController.getAllUsers);

// Test endpoint
router.get('/test', (req, res) => res.json({ ok: true }));

// GET /api/v1/users/me - Get authenticated user's profile
router.get('/me', authMiddleware, userController.getMe);

module.exports = router;