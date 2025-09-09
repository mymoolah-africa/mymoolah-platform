const notificationModel = require('../models/notificationModel');

exports.createNotification = async (req, res) => {
  try {
    const { user_id, type, message } = req.body;
    if (!user_id || !type || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await notificationModel.createNotification(user_id, type, message);
    res.status(201).json(result);
  } catch (err) {
    // Optional: console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.listNotifications = async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: 'user_id required' });
    // Optionally: const userIdNum = Number(userId);
    const notifications = await notificationModel.listNotifications(userId);
    res.json(notifications);
  } catch (err) {
    // Optional: console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const result = await notificationModel.markAsRead(notificationId);
    if (!result || result.updated === false) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(result);
  } catch (err) {
    // Optional: console.error(err);
    res.status(500).json({ error: err.message });
  }
};