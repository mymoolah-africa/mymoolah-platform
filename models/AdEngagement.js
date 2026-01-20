/**
 * AdEngagement Model for Watch to Earn
 * 
 * Tracks user engagements (lead captures) for Engagement ads.
 * When user clicks "I'm Interested", their details are sent to the merchant.
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const AdEngagement = sequelize.define('AdEngagement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique engagement identifier'
    },
    
    // Foreign keys
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Campaign that generated the engagement'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User who engaged with the ad'
    },
    adViewId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Ad view that led to this engagement'
    },
    
    // User details captured (for lead delivery)
    userName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'User full name'
    },
    userPhone: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'User phone number'
    },
    userEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'User email address'
    },
    
    // Delivery tracking
    sentToMerchant: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether lead was successfully delivered to merchant'
    },
    deliveryMethod: {
      type: DataTypes.ENUM('email', 'webhook', 'both'),
      allowNull: true,
      comment: 'Method used to deliver lead to merchant'
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when lead was delivered'
    },
    
    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional engagement metadata'
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
    tableName: 'ad_engagements',
    timestamps: true,
    indexes: [
      { fields: ['campaignId'] },
      { fields: ['userId'] },
      { fields: ['adViewId'] },
      { fields: ['sentToMerchant'] }
    ]
  });

  // Instance methods
  AdEngagement.prototype.markAsDelivered = async function(method) {
    return this.update({
      sentToMerchant: true,
      deliveryMethod: method,
      deliveredAt: new Date()
    });
  };

  // Associations
  AdEngagement.associate = function(models) {
    AdEngagement.belongsTo(models.AdCampaign, {
      foreignKey: 'campaignId',
      as: 'campaign'
    });
    
    AdEngagement.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    AdEngagement.belongsTo(models.AdView, {
      foreignKey: 'adViewId',
      as: 'adView'
    });
  };

  return AdEngagement;
};
