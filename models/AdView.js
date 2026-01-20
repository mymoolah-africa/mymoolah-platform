/**
 * AdView Model for Watch to Earn
 * 
 * Tracks individual ad views by users.
 * Records watch duration, completion status, and rewards paid.
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const AdView = sequelize.define('AdView', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique view identifier'
    },
    
    // Foreign keys
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Campaign being viewed'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User who viewed the ad'
    },
    
    // View lifecycle
    status: {
      type: DataTypes.ENUM('started', 'completed'),
      allowNull: false,
      defaultValue: 'started',
      comment: 'View status (started = watching, completed = finished and rewarded)'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when user started watching'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when user completed watching (95%+ required)'
    },
    
    // Watch verification (server-side)
    watchDurationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Actual watch duration (server-side verified)'
    },
    
    // Financial tracking
    rewardAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Reward amount paid to user (R2.00 for Reach, R2.00 for Engagement view)'
    },
    merchantDebitAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Amount debited from merchant ad float account (R6.00 or R15.00)'
    },
    
    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional view metadata'
    },
    
    // Timestamps
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'ad_views',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'campaignId'] },
      { fields: ['campaignId', 'completedAt'] },
      { fields: ['userId', 'completedAt'] },
      { fields: ['status'] }
    ]
  });

  // Instance methods
  AdView.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  AdView.prototype.getWatchPercentage = function(videoDurationSeconds) {
    if (!this.watchDurationSeconds || !videoDurationSeconds) return 0;
    return (this.watchDurationSeconds / videoDurationSeconds) * 100;
  };

  // Associations
  AdView.associate = function(models) {
    AdView.belongsTo(models.AdCampaign, {
      foreignKey: 'campaignId',
      as: 'campaign'
    });
    
    AdView.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    AdView.hasOne(models.AdEngagement, {
      foreignKey: 'adViewId',
      as: 'engagement'
    });
  };

  return AdView;
};
