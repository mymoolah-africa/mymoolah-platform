/**
 * Create AdCampaigns Table for Watch to Earn
 * 
 * Stores video ad campaigns created by merchants/advertisers.
 * Supports two ad types: Reach (brand awareness) and Engagement (lead generation).
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ad_campaigns', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: 'Unique campaign identifier'
      },
      
      // Merchant/Advertiser
      merchantId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Merchant identifier (links to merchant_floats.merchantId)'
      },
      
      // Campaign details
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Ad campaign title'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Ad campaign description'
      },
      
      // Video details
      videoUrl: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'GCS path or signed URL for video file'
      },
      thumbnailUrl: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'GCS path for video thumbnail'
      },
      durationSeconds: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Video duration in seconds (20-30s required)'
      },
      
      // Ad type and behavior
      adType: {
        type: Sequelize.ENUM('reach', 'engagement'),
        allowNull: false,
        defaultValue: 'reach',
        comment: 'reach = video only, engagement = video + action button for lead capture'
      },
      
      // Campaign status
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'active', 'paused', 'completed'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Campaign lifecycle status'
      },
      
      // Budget and pricing
      totalBudget: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Total campaign budget (merchant prepaid amount)'
      },
      remainingBudget: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Remaining budget (decrements on each view)'
      },
      costPerView: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Cost per view charged to merchant (R6.00 Reach, R15.00 Engagement)'
      },
      rewardPerView: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Reward per view paid to user (R2.00 Reach, R3.00 Engagement total)'
      },
      
      // Targeting rules (JSONB for flexibility)
      targetingRules: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Targeting rules for ad eligibility (future: spend-based, demographic, etc.)'
      },
      
      // Engagement-specific fields (for lead capture)
      conversionEmail: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Email address to send leads to (for Engagement ads)'
      },
      conversionWebhookUrl: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Webhook URL to send leads to (for Engagement ads)'
      },
      
      // Content moderation
      moderationStatus: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'flagged'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Content moderation status (manual review for launch)'
      },
      moderatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when moderation was completed'
      },
      moderatedBy: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Admin user who moderated the ad'
      },
      moderationNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes from moderation review'
      },
      
      // Statistics (for merchant reporting)
      totalViews: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of completed views'
      },
      totalEngagements: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of engagements (for Engagement ads)'
      },
      
      // Metadata
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional campaign metadata'
      },
      
      // Timestamps
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('ad_campaigns', ['merchantId'], {
      name: 'idx_ad_campaigns_merchant'
    });

    await queryInterface.addIndex('ad_campaigns', ['status', 'remainingBudget'], {
      name: 'idx_ad_campaigns_status_budget',
      where: {
        status: 'active'
      }
    });

    await queryInterface.addIndex('ad_campaigns', ['adType'], {
      name: 'idx_ad_campaigns_type'
    });

    await queryInterface.addIndex('ad_campaigns', ['moderationStatus'], {
      name: 'idx_ad_campaigns_moderation'
    });

    console.log('✅ ad_campaigns table created with indexes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ad_campaigns');
    console.log('✅ ad_campaigns table dropped');
  }
};
