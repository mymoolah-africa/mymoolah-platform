/**
 * Create AdEngagements Table for Watch to Earn
 * 
 * Tracks user engagements (lead captures) for Engagement ads.
 * When user clicks "I'm Interested", their details are sent to the merchant.
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ad_engagements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: 'Unique engagement identifier'
      },
      
      // Foreign keys
      campaignId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ad_campaigns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Campaign that generated the engagement'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who engaged with the ad'
      },
      adViewId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ad_views',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Ad view that led to this engagement'
      },
      
      // User details captured (for lead delivery)
      userName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'User full name'
      },
      userPhone: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'User phone number'
      },
      userEmail: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'User email address'
      },
      
      // Delivery tracking
      sentToMerchant: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether lead was successfully delivered to merchant'
      },
      deliveryMethod: {
        type: Sequelize.ENUM('email', 'webhook', 'both'),
        allowNull: true,
        comment: 'Method used to deliver lead to merchant'
      },
      deliveredAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when lead was delivered'
      },
      
      // Metadata
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional engagement metadata'
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

    // Create indexes
    await queryInterface.addIndex('ad_engagements', ['campaignId'], {
      name: 'idx_ad_engagements_campaign'
    });

    await queryInterface.addIndex('ad_engagements', ['userId'], {
      name: 'idx_ad_engagements_user'
    });

    await queryInterface.addIndex('ad_engagements', ['adViewId'], {
      name: 'idx_ad_engagements_view'
    });

    await queryInterface.addIndex('ad_engagements', ['sentToMerchant'], {
      name: 'idx_ad_engagements_delivered'
    });

    // Unique constraint: One engagement per ad view (idempotency)
    await queryInterface.addConstraint('ad_engagements', {
      fields: ['adViewId', 'userId'],
      type: 'unique',
      name: 'unique_engagement_per_view'
    });

    console.log('✅ ad_engagements table created with indexes and unique constraint');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ad_engagements');
    console.log('✅ ad_engagements table dropped');
  }
};
