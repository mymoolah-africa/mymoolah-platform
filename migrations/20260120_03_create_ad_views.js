/**
 * Create AdViews Table for Watch to Earn
 * 
 * Tracks individual ad views by users.
 * Records watch duration, completion status, and rewards paid.
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ad_views', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: 'Unique view identifier'
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
        comment: 'Campaign being viewed'
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
        comment: 'User who viewed the ad'
      },
      
      // View lifecycle
      status: {
        type: Sequelize.ENUM('started', 'completed'),
        allowNull: false,
        defaultValue: 'started',
        comment: 'View status (started = watching, completed = finished and rewarded)'
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when user started watching'
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when user completed watching (95%+ required)'
      },
      
      // Watch verification (server-side)
      watchDurationSeconds: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Actual watch duration (server-side verified)'
      },
      
      // Financial tracking
      rewardAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Reward amount paid to user (R2.00 for Reach, R2.00 for Engagement view)'
      },
      merchantDebitAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Amount debited from merchant ad float account (R6.00 or R15.00)'
      },
      
      // Metadata
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional view metadata'
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

    // Create indexes for performance and fraud prevention
    await queryInterface.addIndex('ad_views', ['userId', 'campaignId'], {
      name: 'idx_ad_views_user_campaign'
    });

    await queryInterface.addIndex('ad_views', ['campaignId', 'completedAt'], {
      name: 'idx_ad_views_campaign_completed'
    });

    await queryInterface.addIndex('ad_views', ['userId', 'completedAt'], {
      name: 'idx_ad_views_user_completed',
      where: {
        completedAt: {
          [Sequelize.Op.ne]: null
        }
      }
    });

    await queryInterface.addIndex('ad_views', ['status'], {
      name: 'idx_ad_views_status'
    });

    // Unique constraint: One view per user per campaign (fraud prevention)
    await queryInterface.addConstraint('ad_views', {
      fields: ['userId', 'campaignId'],
      type: 'unique',
      name: 'unique_user_campaign_view'
    });

    console.log('✅ ad_views table created with indexes and unique constraint');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ad_views');
    console.log('✅ ad_views table dropped');
  }
};
