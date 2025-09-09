// mymoolah/models/supportMessageModel.js

module.exports = (sequelize, DataTypes) => {
  const SupportMessage = sequelize.define('SupportMessage', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'support_tickets',
        key: 'id',
      },
      validate: {
        notNull: true,
      },
    },
    senderId: {
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
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 5000],
      },
    },
    messageType: {
      type: DataTypes.ENUM('user_message', 'admin_response', 'system_notification'),
      allowNull: false,
      defaultValue: 'user_message',
    },
    isInternal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this message is internal (not visible to user)',
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of attachment URLs or file references',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional message metadata',
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
    tableName: 'support_messages',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['ticketId'],
      },
      {
        fields: ['senderId'],
      },
      {
        fields: ['messageType'],
      },
      {
        fields: ['createdAt'],
      },
    ],
    hooks: {
      beforeCreate: (message) => {
        // Set message type based on sender if not specified
        if (!message.messageType) {
          // This would need to be determined based on your user roles
          message.messageType = 'user_message';
        }
      },
    },
  });

  // Define associations
  SupportMessage.associate = (models) => {
    // SupportMessage belongs to one SupportTicket
    SupportMessage.belongsTo(models.SupportTicket, {
      foreignKey: 'ticketId',
      as: 'ticket',
    });

    // SupportMessage belongs to one User (sender)
    SupportMessage.belongsTo(models.User, {
      foreignKey: 'senderId',
      as: 'sender',
    });
  };

  // Instance methods
  SupportMessage.prototype.isFromUser = function() {
    return this.messageType === 'user_message';
  };

  SupportMessage.prototype.isFromAdmin = function() {
    return this.messageType === 'admin_response';
  };

  SupportMessage.prototype.isSystemNotification = function() {
    return this.messageType === 'system_notification';
  };

  SupportMessage.prototype.isInternalMessage = function() {
    return this.isInternal === true;
  };

  SupportMessage.prototype.getFormattedCreatedAt = function() {
    return this.createdAt.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return SupportMessage;
}; 