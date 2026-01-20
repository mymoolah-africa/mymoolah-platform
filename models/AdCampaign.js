/**
 * AdCampaign Model for Watch to Earn
 * 
 * Represents video ad campaigns created by merchants/advertisers.
 * Supports Reach (brand awareness) and Engagement (lead generation) ads.
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const AdCampaign = sequelize.define('AdCampaign', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique campaign identifier'
    },
    
    // Merchant/Advertiser
    merchantId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Merchant identifier (links to merchant_floats.merchantId)'
    },
    
    // Campaign details
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Ad campaign title'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Ad campaign description'
    },
    
    // Video details
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'GCS path or signed URL for video file'
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'GCS path for video thumbnail'
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Video duration in seconds (20-30s required)'
    },
    
    // Ad type and behavior
    adType: {
      type: DataTypes.ENUM('reach', 'engagement'),
      allowNull: false,
      defaultValue: 'reach',
      comment: 'reach = video only, engagement = video + action button for lead capture'
    },
    
    // Campaign status
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'active', 'paused', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Campaign lifecycle status'
    },
    
    // Budget and pricing
    totalBudget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Total campaign budget (merchant prepaid amount)'
    },
    remainingBudget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Remaining budget (decrements on each view)'
    },
    costPerView: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Cost per view charged to merchant (R6.00 Reach, R15.00 Engagement)'
    },
    rewardPerView: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Reward per view paid to user (R2.00 Reach, R3.00 Engagement total)'
    },
    
    // Targeting rules (JSONB for flexibility)
    targetingRules: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Targeting rules for ad eligibility (future: spend-based, demographic, etc.)'
    },
    
    // Engagement-specific fields (for lead capture)
    conversionEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Email address to send leads to (for Engagement ads)'
    },
    conversionWebhookUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Webhook URL to send leads to (for Engagement ads)'
    },
    
    // Content moderation
    moderationStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'flagged'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Content moderation status (manual review for launch)'
    },
    moderatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when moderation was completed'
    },
    moderatedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Admin user who moderated the ad'
    },
    moderationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes from moderation review'
    },
    
    // Statistics (for merchant reporting)
    totalViews: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total number of completed views'
    },
    totalEngagements: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total number of engagements (for Engagement ads)'
    },
    
    // Metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional campaign metadata'
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
    tableName: 'ad_campaigns',
    timestamps: true,
    indexes: [
      { fields: ['merchantId'] },
      { fields: ['status', 'remainingBudget'] },
      { fields: ['adType'] },
      { fields: ['moderationStatus'] }
    ]
  });

  // Instance methods
  AdCampaign.prototype.isEligibleForViewing = function() {
    return this.status === 'active' && 
           this.moderationStatus === 'approved' &&
           parseFloat(this.remainingBudget) > 0;
  };

  AdCampaign.prototype.incrementViews = async function() {
    return this.increment('totalViews', { by: 1 });
  };

  AdCampaign.prototype.incrementEngagements = async function() {
    return this.increment('totalEngagements', { by: 1 });
  };

  AdCampaign.prototype.hasSufficientBudget = function() {
    return parseFloat(this.remainingBudget) >= parseFloat(this.costPerView);
  };

  // Associations
  AdCampaign.associate = function(models) {
    AdCampaign.belongsTo(models.MerchantFloat, {
      foreignKey: 'merchantId',
      targetKey: 'merchantId',
      as: 'merchant'
    });
    
    AdCampaign.hasMany(models.AdView, {
      foreignKey: 'campaignId',
      as: 'views'
    });
    
    AdCampaign.hasMany(models.AdEngagement, {
      foreignKey: 'campaignId',
      as: 'engagements'
    });
  };

  return AdCampaign;
};
