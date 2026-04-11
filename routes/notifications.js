const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationService = require('../services/notificationService');

router.get('/', auth, async (req, res) => {
  try {
    const { status = 'unread', limit = 20, page = 1 } = req.query;
    const data = await notificationService.list(req.user.id, { status, limit, page });
    res.json({ success: true, data });
  } catch (e) {
    console.error('Notifications list error:', e.message);
    res.status(500).json({ success: false, error: 'Failed to load notifications', errorCode: 'NOTIFICATIONS_LOAD_FAILED', message: 'Could not load your notifications. Please try again.' });
  }
});

router.post('/:id/read', auth, async (req, res) => {
  try {
    const row = await notificationService.markRead(req.user.id, req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: row });
  } catch (e) {
    console.error('Notification mark-read error:', e.message);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read', errorCode: 'NOTIFICATION_UPDATE_FAILED', message: 'Could not mark notification as read. Please try again.' });
  }
});

router.post('/mark-all-read', auth, async (req, res) => {
  try {
    await notificationService.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (e) {
    console.error('Notification mark-all-read error:', e.message);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read', errorCode: 'NOTIFICATION_UPDATE_FAILED', message: 'Could not mark all notifications as read. Please try again.' });
  }
});

router.get('/settings', auth, async (req, res) => {
  try {
    const s = await notificationService.getSettings(req.user.id);
    res.json({ success: true, data: s });
  } catch (e) {
    console.error('Notification settings load error:', e.message);
    res.status(500).json({ success: false, error: 'Failed to load notification settings', errorCode: 'NOTIFICATIONS_LOAD_FAILED', message: 'Could not load notification settings. Please try again.' });
  }
});

router.put('/settings', auth, async (req, res) => {
  try {
    const s = await notificationService.updateSettings(req.user.id, req.body || {});
    res.json({ success: true, data: s });
  } catch (e) {
    console.error('Notification settings update error:', e.message);
    res.status(500).json({ success: false, error: 'Failed to update notification settings', errorCode: 'NOTIFICATION_UPDATE_FAILED', message: 'Could not update notification settings. Please try again.' });
  }
});

module.exports = router;