'use strict';

/**
 * Migration: Create Idempotency Keys Table
 * 
 * Creates table to store idempotency keys for preventing duplicate request processing.
 * Used for banking-grade API idempotency (critical for financial transactions).
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-16
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Creating idempotency_keys table...');

    await queryInterface.createTable('idempotency_keys', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      idempotency_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Unique idempotency key from X-Idempotency-Key header'
      },
      endpoint: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'API endpoint path (e.g., /api/v1/vouchers/easypay/topup/settlement)'
      },
      request_hash: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'SHA-256 hash of request body for validation'
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'HTTP status code of the response'
      },
      response_body: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Cached response body (JSON)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Expiration time (24 hours from creation)'
      }
    });

    // Create indexes
    await queryInterface.addIndex('idempotency_keys', ['idempotency_key'], {
      unique: true,
      name: 'idx_idempotency_keys_key'
    });

    await queryInterface.addIndex('idempotency_keys', ['expires_at'], {
      name: 'idx_idempotency_keys_expires_at'
    });

    await queryInterface.addIndex('idempotency_keys', ['endpoint'], {
      name: 'idx_idempotency_keys_endpoint'
    });

    console.log('✅ idempotency_keys table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Dropping idempotency_keys table...');
    
    await queryInterface.dropTable('idempotency_keys');
    
    console.log('✅ idempotency_keys table dropped');
  }
};
