// mymoolah/models/supportTicketModel.js

module.exports = (sequelize, DataTypes) => {
  const SupportTicket = sequelize.define('SupportTicket', {
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
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 5000],
      },
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'),
      allowNull: false,
      defaultValue: 'open',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
    },
    category: {
      type: DataTypes.ENUM('technical', 'billing', 'account', 'payment', 'general'),
      allowNull: false,
      defaultValue: 'general',
    },
    assignedTo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Admin or support agent assigned to this ticket',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolvedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Admin who resolved the ticket',
    },
    resolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes about how the ticket was resolved',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional ticket metadata',
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
    tableName: 'support_tickets',
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
        fields: ['priority'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['assignedTo'],
      },
      {
        fields: ['createdAt'],
      },
    ],
    hooks: {
      beforeUpdate: (ticket) => {
        // Set resolvedAt when status changes to resolved
        if (ticket.changed('status') && ticket.status === 'resolved' && !ticket.resolvedAt) {
          ticket.resolvedAt = new Date();
        }
      },
    },
  });

  // Define associations
  SupportTicket.associate = (models) => {
    // SupportTicket belongs to one User
    SupportTicket.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    // SupportTicket has many SupportMessages
    SupportTicket.hasMany(models.SupportMessage, {
      foreignKey: 'ticketId',
      as: 'messages',
    });
  };

  // Instance methods
  SupportTicket.prototype.isOpen = function() {
    return this.status === 'open';
  };

  SupportTicket.prototype.isResolved = function() {
    return this.status === 'resolved';
  };

  SupportTicket.prototype.isClosed = function() {
    return this.status === 'closed';
  };

  SupportTicket.prototype.isInProgress = function() {
    return this.status === 'in_progress';
  };

  SupportTicket.prototype.isWaitingForUser = function() {
    return this.status === 'waiting_for_user';
  };

  SupportTicket.prototype.resolve = async function(resolvedBy, notes = '') {
    this.status = 'resolved';
    this.resolvedBy = resolvedBy;
    this.resolutionNotes = notes;
    this.resolvedAt = new Date();
    
    await this.save();
    return this;
  };

  SupportTicket.prototype.close = async function() {
    this.status = 'closed';
    await this.save();
    return this;
  };

  SupportTicket.prototype.assign = async function(assignedTo) {
    this.assignedTo = assignedTo;
    await this.save();
    return this;
  };

  SupportTicket.prototype.getTimeToResolution = function() {
    if (!this.resolvedAt) return null;
    return this.resolvedAt.getTime() - this.createdAt.getTime();
  };

  SupportTicket.prototype.getFormattedCreatedAt = function() {
    return this.createdAt.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return SupportTicket;
}; 