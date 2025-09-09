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
    console.error('notifications GET error', e);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});

router.post('/:id/read', auth, async (req, res) => {
  try {
    const row = await notificationService.markRead(req.user.id, req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to mark read' });
  }
});

router.post('/mark-all-read', auth, async (req, res) => {
  try {
    await notificationService.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to mark all read' });
  }
});

router.get('/settings', auth, async (req, res) => {
  try {
    const s = await notificationService.getSettings(req.user.id);
    res.json({ success: true, data: s });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
});

router.put('/settings', auth, async (req, res) => {
  try {
    const s = await notificationService.updateSettings(req.user.id, req.body || {});
    res.json({ success: true, data: s });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

module.exports = router;