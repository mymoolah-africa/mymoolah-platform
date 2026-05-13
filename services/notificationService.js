const { Notification, UserNotificationSettings, sequelize } = require('../models');

const ALLOWED_TYPES = new Set(['txn_wallet_credit', 'txn_bank_credit', 'maintenance', 'promo']);
const ALLOWED_SEVERITIES = new Set(['info', 'warning', 'critical']);
const ALLOWED_CATEGORIES = new Set(['transaction', 'maintenance', 'marketing']);
const ALLOWED_SOURCES = new Set(['system', 'admin', 'job']);

async function getOrCreateSettings(userId) {
  let row = await UserNotificationSettings.findByPk(userId);
  if (!row) {
    row = await UserNotificationSettings.create({ userId });
  }
  return row;
}

module.exports = {
  async createNotification(userId, type, title, message, options = {}) {
    const payload = options.payload || null;
    const freezeUntilViewed = Boolean(options.freezeUntilViewed);
    const severity = ALLOWED_SEVERITIES.has(options.severity) ? options.severity : 'info';
    const category = ALLOWED_CATEGORIES.has(options.category) ? options.category : 'transaction';
    const source = ALLOWED_SOURCES.has(options.source) ? options.source : 'system';
    const notificationType = ALLOWED_TYPES.has(type) ? type : 'maintenance';

    const notification = await Notification.create({
      userId,
      type: notificationType,
      title,
      message: message || null,
      payload,
      freezeUntilViewed,
      severity,
      category,
      source,
    });
    return notification;
  },

  async list(userId, { status = 'unread', limit = 20, page = 1 } = {}) {
    const where = { userId };
    if (status === 'unread') where.readAt = null;
    const rows = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Math.min(Number(limit) || 20, 100),
      offset: ((Number(page) || 1) - 1) * (Number(limit) || 20),
    });
    return rows;
  },

  async markRead(userId, id) {
    const n = await Notification.findOne({ where: { id, userId } });
    if (!n) return null;
    if (!n.readAt) await n.update({ readAt: new Date() });
    return n;
  },

  async markAllRead(userId) {
    await Notification.update({ readAt: sequelize.fn('NOW') }, { where: { userId, readAt: null } });
    return true;
  },

  async acknowledge(userId, id) {
    const n = await Notification.findOne({ where: { id, userId } });
    if (!n) return null;
    if (!n.acknowledgedAt) await n.update({ acknowledgedAt: new Date() });
    return n;
  },

  async getSettings(userId) {
    return getOrCreateSettings(userId);
  },

  async updateSettings(userId, partial) {
    const s = await getOrCreateSettings(userId);
    await s.update(partial);
    return s;
  },
};




