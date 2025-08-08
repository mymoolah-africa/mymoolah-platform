const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get user settings
router.get('/', settingsController.getUserSettings);

// Update user settings
router.put('/', settingsController.updateUserSettings);

// Update quick access services only
router.patch('/quick-access', settingsController.updateQuickAccessServices);

// Reset user settings to defaults
router.post('/reset', settingsController.resetUserSettings);

module.exports = router;
