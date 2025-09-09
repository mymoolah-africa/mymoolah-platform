const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Get all users (admin only)
router.get('/', authMiddleware, userController.getAllUsers);

// Get authenticated user's profile (place BEFORE param routes)
router.get('/me', authMiddleware, userController.getMe);

// Update authenticated user's profile
router.put('/me', authMiddleware, userController.updateMe);

// Get user by ID
router.get('/:id', authMiddleware, userController.getUserById);

// Update user by ID (admin)
router.put('/:id', authMiddleware, userController.updateUser);

// Update user status
router.patch('/:id/status', authMiddleware, userController.updateUserStatus);

// Get user statistics
router.get('/stats', authMiddleware, userController.getUserStats);


module.exports = router;