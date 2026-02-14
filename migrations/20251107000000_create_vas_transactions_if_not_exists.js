'use strict';

/**
 * Banking-grade: Create vas_transactions table if not exists (fresh DBs)
 * Required before 20251108_add_* migrations which add columns to vas_transactions.
 * Idempotent: skips if table already exists.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'vas_transactions'
    `);
    if (tables && tables.length > 0) {
      return;
    }

    await queryInterface.createTable('vas_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      transactionId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      walletId: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      beneficiaryId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      vasProductId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      vasType: {
        type: Sequelize.ENUM('airtime', 'data', 'electricity', 'bill_payment'),
        allowNull: false
      },
      transactionType: {
        type: Sequelize.ENUM('voucher', 'topup', 'direct'),
        allowNull: false
      },
      supplierId: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      supplierProductId: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      fee: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      totalAmount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      mobileNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      supplierReference: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      processedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('vas_transactions', ['transactionId'], { unique: true, name: 'idx_vas_transactions_transaction_id' });
    await queryInterface.addIndex('vas_transactions', ['userId'], { name: 'idx_vas_transactions_user_id' });
    await queryInterface.addIndex('vas_transactions', ['beneficiaryId'], { name: 'idx_vas_transactions_beneficiary' });
    await queryInterface.addIndex('vas_transactions', ['vasType'], { name: 'idx_vas_transactions_vas_type' });
    await queryInterface.addIndex('vas_transactions', ['supplierId'], { name: 'idx_vas_transactions_supplier' });
    await queryInterface.addIndex('vas_transactions', ['status'], { name: 'idx_vas_transactions_status' });
    await queryInterface.addIndex('vas_transactions', ['reference'], { unique: true, name: 'idx_vas_transactions_reference' });
    await queryInterface.addIndex('vas_transactions', ['vasProductId'], { name: 'idx_vas_transactions_vas_product_id' });
    await queryInterface.addIndex('vas_transactions', ['walletId'], { name: 'idx_vas_transactions_wallet_id' });
    await queryInterface.addIndex('vas_transactions', ['transactionType'], { name: 'idx_vas_transactions_transaction_type' });
    await queryInterface.addIndex('vas_transactions', ['supplierProductId'], { name: 'idx_vas_transactions_supplier_product' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vas_transactions');
  }
};
