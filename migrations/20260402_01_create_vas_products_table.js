'use strict';

/**
 * Create vas_products table — required by VasProduct Sequelize model.
 *
 * The table was never created by any prior migration; the Dec 2025
 * consolidation migration only checks IF it exists and migrates data
 * FROM it, but never issues CREATE TABLE.
 *
 * This migration matches the model definition in models/VasProduct.js exactly.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Create ENUM types (idempotent — skip if they already exist)
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_vas_products_vasType" AS ENUM (
            'airtime', 'data', 'electricity', 'bill_payment', 'cash_out', 'voucher_topup'
          );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `, { transaction });

      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_vas_products_transactionType" AS ENUM (
            'voucher', 'topup', 'direct'
          );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `, { transaction });

      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_vas_products_networkType" AS ENUM (
            'local', 'international'
          );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `, { transaction });

      await queryInterface.createTable('vas_products', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        supplierId: {
          type: Sequelize.STRING,
          allowNull: false
        },
        supplierProductId: {
          type: Sequelize.STRING,
          allowNull: false
        },
        productName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        vasType: {
          type: '"enum_vas_products_vasType"',
          allowNull: false
        },
        transactionType: {
          type: '"enum_vas_products_transactionType"',
          allowNull: false
        },
        provider: {
          type: Sequelize.STRING,
          allowNull: false
        },
        networkType: {
          type: '"enum_vas_products_networkType"',
          allowNull: false,
          defaultValue: 'local'
        },
        predefinedAmounts: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        minAmount: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        maxAmount: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        commission: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0
        },
        fixedFee: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        isPromotional: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        promotionalDiscount: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        priority: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        lastUpdated: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      }, { transaction });

      // Indexes matching the model definition
      await queryInterface.addIndex('vas_products', ['supplierId'], {
        name: 'idx_vas_products_supplier_id',
        transaction
      });
      await queryInterface.addIndex('vas_products', ['vasType'], {
        name: 'idx_vas_products_vas_type',
        transaction
      });
      await queryInterface.addIndex('vas_products', ['provider'], {
        name: 'idx_vas_products_provider',
        transaction
      });
      await queryInterface.addIndex('vas_products', ['isActive'], {
        name: 'idx_vas_products_is_active',
        transaction
      });
      await queryInterface.addIndex('vas_products', ['priority'], {
        name: 'idx_vas_products_priority',
        transaction
      });
      await queryInterface.addIndex('vas_products', ['supplierId', 'supplierProductId'], {
        name: 'idx_vas_products_supplier_product_unique',
        unique: true,
        transaction
      });

      await transaction.commit();
      console.log('✅ vas_products table created with all indexes');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('vas_products');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vas_products_vasType"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vas_products_transactionType"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vas_products_networkType"');
    console.log('✅ vas_products table and ENUM types dropped');
  }
};
