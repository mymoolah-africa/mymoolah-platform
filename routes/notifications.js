const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// List notifications for a user (GET /api/notifications?user_id=123)
router.get('/', notificationController.listNotifications);

// Create a notification (POST /api/notifications)
router.post('/', notificationController.createNotification);

// Mark a notification as read (POST /api/notifications/:id/read)
router.post('/:id/read', notificationController.markAsRead);

module.exports = router;