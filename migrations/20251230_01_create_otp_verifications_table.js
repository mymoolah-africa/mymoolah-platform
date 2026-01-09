'use strict';

/**
 * Migration: Create otp_verifications table for password reset and phone change flows
 * 
 * Part of MyMoolah Banking-Grade OTP System
 * Supports password reset and phone number change with OTP verification
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-30
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create otp_verifications table
    await queryInterface.createTable('otp_verifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Null for password reset (user found by phone)
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User requesting OTP (null for password reset lookups)'
      },
      phone_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Phone number in E.164 format (+27XXXXXXXXX)'
      },
      otp_hash: {
        type: Sequelize.STRING(128),
        allowNull: false,
        comment: 'Hashed OTP (bcrypt) - never store plaintext'
      },
      type: {
        type: Sequelize.STRING(30),
        allowNull: false,
        comment: 'OTP type: password_reset, phone_change, login_verification'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'OTP expiry time (10 minutes from creation)'
      },
      verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether OTP has been verified (one-time use)'
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When OTP was verified'
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of verification attempts (max 3)'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address of requester (audit trail)'
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'User agent of requester (audit trail)'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata (new phone number for phone_change, etc.)'
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

    // Create indexes for performance and lookups
    await queryInterface.addIndex('otp_verifications', ['phone_number', 'type'], {
      name: 'idx_otp_phone_type'
    });
    
    await queryInterface.addIndex('otp_verifications', ['user_id'], {
      name: 'idx_otp_user_id'
    });
    
    await queryInterface.addIndex('otp_verifications', ['expires_at'], {
      name: 'idx_otp_expires'
    });
    
    await queryInterface.addIndex('otp_verifications', ['verified', 'expires_at'], {
      name: 'idx_otp_verified_expires'
    });

    // Composite index for rate limiting checks
    await queryInterface.addIndex('otp_verifications', ['phone_number', 'type', 'created_at'], {
      name: 'idx_otp_rate_limit'
    });

    console.log('✅ Created otp_verifications table with indexes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('otp_verifications');
    console.log('✅ Dropped otp_verifications table');
  }
};




