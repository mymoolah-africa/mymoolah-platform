const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Get all users (admin only)
router.get('/', authMiddleware, userController.getAllUsers);

// Get user by ID
router.get('/:id', authMiddleware, userController.getUserById);

// Update user
router.put('/:id', authMiddleware, userController.updateUser);

// Update user status
router.patch('/:id/status', authMiddleware, userController.updateUserStatus);

// Get user statistics
router.get('/stats', authMiddleware, userController.getUserStats);

// Get authenticated user's profile
router.get('/me', authMiddleware, userController.getMe);

module.exports = router;