'use strict';

/**
 * Add Missing Columns to Transactions Table
 * 
 * This migration adds all columns defined in the Transaction Sequelize model
 * but missing from the base transactions table schema.
 * 
 * Banking-Grade Requirements:
 * - transactionId: Unique transaction identifier (audit trail)
 * - userId: User reference for queries and compliance
 * - fee: Transaction fees for financial reconciliation
 * - currency: Multi-currency support
 * - senderWalletId/receiverWalletId: Transfer tracking
 * - reference: External reference numbers
 * - paymentId: Payment relationship
 * - exchangeRate: Currency conversion tracking
 * - failureReason: Error tracking and compliance
 * - metadata: Additional transaction data (JSON)
 * 
 * All new columns are nullable with defaults to ensure backward compatibility
 * with existing transactions.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check which columns already exist
      const tableDescription = await queryInterface.describeTable('transactions');
      const existingColumns = Object.keys(tableDescription);

      console.log('📋 Checking existing columns in transactions table...');
      console.log(`   Existing columns: ${existingColumns.join(', ')}`);

      // 1. Add transactionId (unique identifier for audit trail)
      if (!existingColumns.includes('transactionId')) {
        console.log('➕ Adding transactionId column...');
        await queryInterface.addColumn('transactions', 'transactionId', {
          type: Sequelize.STRING(255),
          allowNull: true, // Nullable for existing records
          unique: false, // Will create unique index separately if needed
          comment: 'Unique transaction identifier for audit trail'
        }, { transaction });
        
        // Generate transactionIds for existing records
        console.log('🔧 Generating transactionIds for existing records...');
        await queryInterface.sequelize.query(`
          UPDATE transactions
          SET "transactionId" = 'TX-' || LPAD(id::text, 10, '0') || '-' || EXTRACT(EPOCH FROM "createdAt")::bigint
          WHERE "transactionId" IS NULL
        `, { transaction });
        
        // Make it NOT NULL after populating
        await queryInterface.changeColumn('transactions', 'transactionId', {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
          comment: 'Unique transaction identifier for audit trail'
        }, { transaction });
        
        // Create unique index
        await queryInterface.addIndex('transactions', ['transactionId'], {
          unique: true,
          name: 'idx_transactions_transaction_id_unique',
          transaction
        });
        console.log('✅ Added transactionId column with unique constraint');
      }

      // 2. Add userId (for user queries and compliance)
      if (!existingColumns.includes('userId')) {
        console.log('➕ Adding userId column...');
        await queryInterface.addColumn('transactions', 'userId', {
          type: Sequelize.INTEGER,
          allowNull: true, // Nullable - will be populated from wallets
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'User ID for compliance and querying'
        }, { transaction });
        
        // Populate userId from wallets based on walletId
        console.log('🔧 Populating userId from wallets...');
        await queryInterface.sequelize.query(`
          UPDATE transactions t
          SET "userId" = w."userId"
          FROM wallets w
          WHERE t."walletId" = w."walletId"
            AND t."userId" IS NULL
        `, { transaction });
        
        // Create index for performance
        await queryInterface.addIndex('transactions', ['userId'], {
          name: 'idx_transactions_user_id',
          transaction
        });
        console.log('✅ Added userId column');
      }

      // 3. Add fee (for financial reconciliation)
      if (!existingColumns.includes('fee')) {
        console.log('➕ Adding fee column...');
        await queryInterface.addColumn('transactions', 'fee', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
          comment: 'Transaction fee for financial reconciliation'
        }, { transaction });
        console.log('✅ Added fee column');
      }

      // 4. Add currency (multi-currency support)
      if (!existingColumns.includes('currency')) {
        console.log('➕ Adding currency column...');
        await queryInterface.addColumn('transactions', 'currency', {
          type: Sequelize.STRING(10),
          allowNull: false,
          defaultValue: 'ZAR',
          comment: 'Transaction currency code'
        }, { transaction });
        console.log('✅ Added currency column');
      }

      // 5. Add senderWalletId (for transfer tracking)
      if (!existingColumns.includes('senderWalletId')) {
        console.log('➕ Adding senderWalletId column...');
        await queryInterface.addColumn('transactions', 'senderWalletId', {
          type: Sequelize.STRING(255),
          allowNull: true,
          references: {
            model: 'wallets',
            key: 'walletId'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Sender wallet ID for transfer transactions'
        }, { transaction });
        
        // Create index
        await queryInterface.addIndex('transactions', ['senderWalletId'], {
          name: 'idx_transactions_sender_wallet_id',
          transaction
        });
        console.log('✅ Added senderWalletId column');
      }

      // 6. Add receiverWalletId (for transfer tracking)
      if (!existingColumns.includes('receiverWalletId')) {
        console.log('➕ Adding receiverWalletId column...');
        await queryInterface.addColumn('transactions', 'receiverWalletId', {
          type: Sequelize.STRING(255),
          allowNull: true,
          references: {
            model: 'wallets',
            key: 'walletId'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Receiver wallet ID for transfer transactions'
        }, { transaction });
        
        // Create index
        await queryInterface.addIndex('transactions', ['receiverWalletId'], {
          name: 'idx_transactions_receiver_wallet_id',
          transaction
        });
        console.log('✅ Added receiverWalletId column');
      }

      // 7. Add reference (external reference numbers)
      if (!existingColumns.includes('reference')) {
        console.log('➕ Adding reference column...');
        await queryInterface.addColumn('transactions', 'reference', {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'External reference number for payments'
        }, { transaction });
        
        // Create index for lookups
        await queryInterface.addIndex('transactions', ['reference'], {
          name: 'idx_transactions_reference',
          transaction
        });
        console.log('✅ Added reference column');
      }

      // 8. Add paymentId (payment relationship)
      if (!existingColumns.includes('paymentId')) {
        console.log('➕ Adding paymentId column...');
        await queryInterface.addColumn('transactions', 'paymentId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'payments',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Payment ID reference'
        }, { transaction });
        
        // Create index
        await queryInterface.addIndex('transactions', ['paymentId'], {
          name: 'idx_transactions_payment_id',
          transaction
        });
        console.log('✅ Added paymentId column');
      }

      // 9. Add exchangeRate (currency conversion)
      if (!existingColumns.includes('exchangeRate')) {
        console.log('➕ Adding exchangeRate column...');
        await queryInterface.addColumn('transactions', 'exchangeRate', {
          type: Sequelize.DECIMAL(10, 6),
          allowNull: true,
          comment: 'Exchange rate for currency conversion'
        }, { transaction });
        console.log('✅ Added exchangeRate column');
      }

      // 10. Add failureReason (error tracking)
      if (!existingColumns.includes('failureReason')) {
        console.log('➕ Adding failureReason column...');
        await queryInterface.addColumn('transactions', 'failureReason', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Reason for transaction failure (compliance requirement)'
        }, { transaction });
        console.log('✅ Added failureReason column');
      }

      // 11. Add metadata (JSON for additional data)
      if (!existingColumns.includes('metadata')) {
        console.log('➕ Adding metadata column...');
        await queryInterface.addColumn('transactions', 'metadata', {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Additional transaction metadata (JSON)'
        }, { transaction });
        console.log('✅ Added metadata column');
      }

      await transaction.commit();
      console.log('');
      console.log('✅ All missing columns added successfully!');
      console.log('📋 Transactions table now matches Transaction model definition');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('📋 Rolling back transaction columns...');
      
      // Remove columns in reverse order
      const columnsToRemove = [
        'metadata',
        'failureReason',
        'exchangeRate',
        'paymentId',
        'reference',
        'receiverWalletId',
        'senderWalletId',
        'currency',
        'fee',
        'userId',
        'transactionId'
      ];

      for (const column of columnsToRemove) {
        try {
          await queryInterface.removeColumn('transactions', column, { transaction });
          console.log(`✅ Removed ${column} column`);
        } catch (error) {
          if (error.message.includes('does not exist')) {
            console.log(`⚠️  Column ${column} does not exist, skipping...`);
          } else {
            throw error;
          }
        }
      }

      await transaction.commit();
      console.log('✅ Rollback complete');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};

