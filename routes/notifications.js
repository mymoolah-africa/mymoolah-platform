const express = require('express');
const router = express.Router();

// In-memory notifications store for demo purposes
let notifications = [];
let nextNotificationId = 1;

// Create a notification
router.post('/', (req, res) => {
  const { user_id, message } = req.body;
  if (!user_id || !message) {
    return res.status(400).json({ error: 'user_id and message are required' });
  }
  const notification = {
    id: nextNotificationId++,
    user_id,
    message,
    read: false,
    created_at: new Date().toISOString()
  };
  notifications.push(notification);
  res.status(201).json({ notification });
});

// List notifications for a user
router.get('/:user_id', (req, res) => {
  const { user_id } = req.params;
  const userNotifications = notifications.filter(n => n.user_id == user_id);
  res.json({ notifications: userNotifications });
});

// Mark a notification as read
router.post('/:id/read', (req, res) => {
  const { id } = req.params;
  const notification = notifications.find(n => n.id == id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  notification.read = true;
  res.json({ notification });
});

module.exports = router;