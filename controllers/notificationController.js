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
    console.error('Error creating notification:', err);
    res.status(500).json({
      success: false,
      error: 'Request could not be completed',
      errorCode: 'NOTIFICATION_CREATE_FAILED',
      message: 'Could not create notification. Please try again.'
    });
  }
};

exports.listNotifications = async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: 'user_id required' });
    const notifications = await notificationModel.listNotifications(userId);
    res.json(notifications);
  } catch (err) {
    console.error('Error listing notifications:', err);
    res.status(500).json({
      success: false,
      error: 'Request could not be completed',
      errorCode: 'NOTIFICATION_LIST_FAILED',
      message: 'Could not load notifications. Please try again.'
    });
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
    console.error('Error marking notification as read:', err);
    res.status(500).json({
      success: false,
      error: 'Request could not be completed',
      errorCode: 'NOTIFICATION_UPDATE_FAILED',
      message: 'Could not update notification. Please try again.'
    });
  }
};