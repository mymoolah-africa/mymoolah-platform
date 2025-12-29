'use strict';

/**
 * Migration: Create referrals table for multi-level referral program
 * 
 * Part of MyMoolah Earnings Network - 4-level referral system
 * for job creation and viral growth in South Africa
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create referrals table
    await queryInterface.createTable('referrals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      referrer_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who sent the referral'
      },
      referee_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who signed up via referral (null until signup)'
      },
      referral_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Unique referral code (e.g., REF-ABC123)'
      },
      referee_phone_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Phone number of person being referred'
      },
      
      // Tracking
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Status: pending, invited, signed_up, activated, expired'
      },
      invited_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
        comment: 'When invitation was created'
      },
      sms_sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When SMS invitation was sent'
      },
      signed_up_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When referee completed signup'
      },
      activated_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When referral became active (after 1st transaction)'
      },
      
      // Rewards
      signup_bonus_paid: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether signup bonus has been paid'
      },
      signup_bonus_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Signup bonus amount (e.g., R50)'
      },
      signup_bonus_paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When signup bonus was paid'
      },
      
      // Metadata
      invitation_channel: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'sms',
        comment: 'How invitation was sent (sms, email, link)'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata (campaign, source, etc.)'
      },
      
      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('referrals', ['referrer_user_id'], {
      name: 'idx_referrals_referrer'
    });
    
    await queryInterface.addIndex('referrals', ['referral_code'], {
      name: 'idx_referrals_code',
      unique: true
    });
    
    await queryInterface.addIndex('referrals', ['referee_phone_number'], {
      name: 'idx_referrals_phone'
    });
    
    await queryInterface.addIndex('referrals', ['status', 'created_at'], {
      name: 'idx_referrals_status_created'
    });

    console.log('✅ Created referrals table with indexes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('referrals');
    console.log('✅ Dropped referrals table');
  }
};

