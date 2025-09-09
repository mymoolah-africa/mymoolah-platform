// mymoolah/models/notificationModel.js

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      validate: {
        notNull: true,
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200],
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 1000],
      },
    },
    type: {
      type: DataTypes.ENUM('info', 'success', 'warning', 'error', 'transaction', 'kyc', 'security'),
      allowNull: false,
      defaultValue: 'info',
    },
    status: {
      type: DataTypes.ENUM('unread', 'read', 'archived'),
      allowNull: false,
      defaultValue: 'unread',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
    },
    actionUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    actionText: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 50],
      },
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional notification metadata',
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['priority'],
      },
      {
        fields: ['createdAt'],
      },
    ],
    hooks: {
      beforeCreate: (notification) => {
        // Set expiration (30 days from creation if not specified)
        if (!notification.expiresAt) {
          notification.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
      },
      beforeUpdate: (notification) => {
        // Set readAt when status changes to read
        if (notification.changed('status') && notification.status === 'read' && !notification.readAt) {
          notification.readAt = new Date();
        }
      },
    },
  });

  // Define associations
  Notification.associate = (models) => {
    // Notification belongs to one User
    Notification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  // Instance methods
  Notification.prototype.isUnread = function() {
    return this.status === 'unread';
  };

  Notification.prototype.isRead = function() {
    return this.status === 'read';
  };

  Notification.prototype.isArchived = function() {
    return this.status === 'archived';
  };

  Notification.prototype.isExpired = function() {
    return this.expiresAt && new Date() > this.expiresAt;
  };

  Notification.prototype.markAsRead = async function() {
    this.status = 'read';
    this.readAt = new Date();
    await this.save();
    return this;
  };

  Notification.prototype.archive = async function() {
    this.status = 'archived';
    await this.save();
    return this;
  };

  Notification.prototype.getTimeToExpiry = function() {
    if (!this.expiresAt) return null;
    return this.expiresAt.getTime() - Date.now();
  };

  Notification.prototype.getFormattedCreatedAt = function() {
    return this.createdAt.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return Notification;
};
