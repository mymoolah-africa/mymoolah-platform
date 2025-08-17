'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create dtmercury_banks table
    await queryInterface.createTable('dtmercury_banks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      bankCode: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
        comment: 'Bank code (e.g., SBZA for Standard Bank)'
      },
      bankName: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Full bank name'
      },
      shortName: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Short bank name for display'
      },
      supportsRPP: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether bank supports Request to Pay (RPP)'
      },
      supportsRTP: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether bank supports Real-time Payment (RTP)'
      },
      processingTime: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 300000,
        comment: 'Processing time in milliseconds (default 5 minutes)'
      },
      fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 2.50,
        comment: 'Transaction fee in cents'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether bank is active and accepting transactions'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional bank metadata'
      },
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

    // Create indexes for dtmercury_banks
    await queryInterface.addIndex('dtmercury_banks', ['bankCode'], {
      unique: true,
      name: 'idx_dtmercury_banks_code'
    });
    await queryInterface.addIndex('dtmercury_banks', ['isActive'], {
      name: 'idx_dtmercury_banks_active'
    });
    await queryInterface.addIndex('dtmercury_banks', ['bankName'], {
      name: 'idx_dtmercury_banks_name'
    });

    // Create dtmercury_transactions table
    await queryInterface.createTable('dtmercury_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Unique transaction reference'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User who initiated the transaction'
      },
      paymentType: {
        type: Sequelize.ENUM('rpp', 'rtp'),
        allowNull: false,
        comment: 'PayShap payment type: RPP (Request to Pay) or RTP (Real-time Payment)'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Transaction amount in cents'
      },
      recipientAccountNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Recipient bank account number'
      },
      recipientBankCode: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'Recipient bank code (e.g., SBZA for Standard Bank)'
      },
      recipientName: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Recipient account holder name'
      },
      recipientReference: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Reference for recipient (payment description)'
      },
      kycTier: {
        type: Sequelize.ENUM('tier1', 'tier2'),
        allowNull: false,
        defaultValue: 'tier1',
        comment: 'KYC compliance tier required for transaction'
      },
      kycStatus: {
        type: Sequelize.ENUM('pending', 'verified', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'KYC verification status'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Transaction status'
      },
      dtmercuryTransactionId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'dtMercury transaction ID'
      },
      dtmercuryResponseCode: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'dtMercury API response code'
      },
      dtmercuryResponseMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'dtMercury API response message'
      },
      fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Transaction fee in cents'
      },
      processingTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Processing time in milliseconds'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional transaction metadata'
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if transaction failed'
      },
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

    // Create indexes for dtmercury_transactions
    await queryInterface.addIndex('dtmercury_transactions', ['reference'], {
      unique: true,
      name: 'idx_dtmercury_transactions_reference'
    });
    await queryInterface.addIndex('dtmercury_transactions', ['userId'], {
      name: 'idx_dtmercury_transactions_user_id'
    });
    await queryInterface.addIndex('dtmercury_transactions', ['status'], {
      name: 'idx_dtmercury_transactions_status'
    });
    await queryInterface.addIndex('dtmercury_transactions', ['paymentType'], {
      name: 'idx_dtmercury_transactions_payment_type'
    });
    await queryInterface.addIndex('dtmercury_transactions', ['createdAt'], {
      name: 'idx_dtmercury_transactions_created_at'
    });

    // Add foreign key constraint
    await queryInterface.addConstraint('dtmercury_transactions', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'fk_dtmercury_transactions_user_id',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove foreign key constraint
    await queryInterface.removeConstraint('dtmercury_transactions', 'fk_dtmercury_transactions_user_id');
    
    // Drop tables
    await queryInterface.dropTable('dtmercury_transactions');
    await queryInterface.dropTable('dtmercury_banks');
  }
};
