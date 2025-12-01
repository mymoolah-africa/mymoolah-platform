'use strict';

/**
 * Consolidate Product Schema - Banking-Grade MyMoolah Platform
 * 
 * Purpose: Migrate from hybrid schema (supplier-specific tables) to single normalized schema
 * 
 * BEFORE (Hybrid - Schema Drift Issues):
 * - flash_products (Flash-specific columns)
 * - mobilemart_products (MobileMart-specific columns, includes vasType)
 * - vas_products (Generic VAS table)
 * - products + product_variants (Normalized, but underutilized)
 * 
 * AFTER (Normalized - Single Source of Truth):
 * - products (Base product catalog)
 * - product_variants (Supplier-specific variants with ALL needed fields)
 * - suppliers (Supplier registry)
 * 
 * Benefits:
 * - ✅ No more schema drift between environments
 * - ✅ Easy to compare products across suppliers
 * - ✅ Easy to add new suppliers (no new tables)
 * - ✅ API changes don't break schema (stored in metadata JSONB)
 * - ✅ Consistent business logic
 * 
 * Migration Strategy:
 * 1. Enhance product_variants with all supplier-specific fields
 * 2. Migrate data from supplier-specific tables to product_variants
 * 3. Drop supplier-specific tables (flash_products, mobilemart_products, vas_products)
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 * @date 2025-12-01
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🚀 Starting product schema consolidation...');

      // ===========================================
      // STEP 1: Enhance product_variants schema
      // ===========================================
      console.log('📊 Step 1: Enhancing product_variants schema...');

      // Add vasType (from MobileMart/VAS tables)
      // First, create the ENUM type if it doesn't exist
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_product_variants_vasType AS ENUM (
            'airtime', 'data', 'electricity', 'voucher', 'bill_payment', 'gaming', 'streaming', 'cash_out'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `, { transaction });
      
      await queryInterface.addColumn('product_variants', 'vasType', {
        type: 'enum_product_variants_vasType',
        allowNull: true
      }, { transaction });

      // Add transactionType (from VAS table)
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_product_variants_transactionType AS ENUM (
            'voucher', 'topup', 'direct', 'instant'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `, { transaction });
      
      await queryInterface.addColumn('product_variants', 'transactionType', {
        type: 'enum_product_variants_transactionType',
        allowNull: true
      }, { transaction });

      // Add networkType (from VAS table)
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_product_variants_networkType AS ENUM (
            'local', 'international'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `, { transaction });
      
      await queryInterface.addColumn('product_variants', 'networkType', {
        type: 'enum_product_variants_networkType',
        allowNull: false,
        defaultValue: 'local'
      }, { transaction });

      // Add provider (service provider like MTN, Vodacom, Eskom)
      await queryInterface.addColumn('product_variants', 'provider', {
        type: Sequelize.STRING(100),
        allowNull: true
      }, { transaction });

      // Add minAmount (minimum denomination)
      await queryInterface.addColumn('product_variants', 'minAmount', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });

      // Add maxAmount (maximum denomination)
      await queryInterface.addColumn('product_variants', 'maxAmount', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });

      // Add predefinedAmounts (from VAS table)
      await queryInterface.addColumn('product_variants', 'predefinedAmounts', {
        type: Sequelize.JSONB,
        allowNull: true
      }, { transaction });

      // Add commission (percentage)
      await queryInterface.addColumn('product_variants', 'commission', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      }, { transaction });

      // Add fixedFee (from VAS table)
      await queryInterface.addColumn('product_variants', 'fixedFee', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }, { transaction });

      // Add isPromotional (from MobileMart/VAS tables)
      await queryInterface.addColumn('product_variants', 'isPromotional', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });

      // Add promotionalDiscount (from MobileMart/VAS tables)
      await queryInterface.addColumn('product_variants', 'promotionalDiscount', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      }, { transaction });

      // Add priority (from VAS table)
      await queryInterface.addColumn('product_variants', 'priority', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      }, { transaction });

      // Add lastSyncedAt (track when product was last synced from supplier API)
      await queryInterface.addColumn('product_variants', 'lastSyncedAt', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      console.log('✅ Step 1 complete: product_variants schema enhanced');

      // ===========================================
      // STEP 2: Add indexes for performance
      // ===========================================
      console.log('📊 Step 2: Adding performance indexes...');

      await queryInterface.addIndex('product_variants', ['vasType'], {
        name: 'idx_product_variants_vas_type',
        transaction
      });

      await queryInterface.addIndex('product_variants', ['provider'], {
        name: 'idx_product_variants_provider',
        transaction
      });

      await queryInterface.addIndex('product_variants', ['transactionType'], {
        name: 'idx_product_variants_transaction_type',
        transaction
      });

      await queryInterface.addIndex('product_variants', ['isPromotional'], {
        name: 'idx_product_variants_promotional',
        transaction
      });

      await queryInterface.addIndex('product_variants', ['priority'], {
        name: 'idx_product_variants_priority',
        transaction
      });

      await queryInterface.addIndex('product_variants', ['vasType', 'provider', 'status'], {
        name: 'idx_product_variants_vas_provider_status',
        transaction
      });

      console.log('✅ Step 2 complete: Indexes added');

      // ===========================================
      // STEP 3: Migrate data from flash_products
      // ===========================================
      console.log('📊 Step 3: Migrating data from flash_products...');

      // Check if flash_products table exists and has data
      const flashProductsCount = await queryInterface.sequelize.query(
        `SELECT COUNT(*) FROM flash_products`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      if (flashProductsCount[0].count > 0) {
        console.log(`   Found ${flashProductsCount[0].count} Flash products to migrate`);

        // Get or create Flash supplier
        const [flashSupplier] = await queryInterface.sequelize.query(
          `INSERT INTO suppliers (name, code, "isActive", "createdAt", "updatedAt")
           VALUES ('Flash', 'FLASH', true, NOW(), NOW())
           ON CONFLICT (code) DO UPDATE SET "updatedAt" = NOW()
           RETURNING id`,
          { type: Sequelize.QueryTypes.INSERT, transaction }
        );

        const flashSupplierId = flashSupplier[0].id;

        // Note: Since we don't have a direct mapping to products table,
        // we'll create a generic Flash product for now
        // In production, you'd want to properly map flash_products to products first
        
        console.log(`   ⚠️  Flash products migration requires manual product mapping`);
        console.log(`   ⚠️  Skipping automatic migration - data preserved in flash_products for now`);
      } else {
        console.log('   No Flash products to migrate');
      }

      console.log('✅ Step 3 complete');

      // ===========================================
      // STEP 4: Migrate data from mobilemart_products
      // ===========================================
      console.log('📊 Step 4: Migrating data from mobilemart_products...');

      const mobilemartProductsCount = await queryInterface.sequelize.query(
        `SELECT COUNT(*) FROM mobilemart_products`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      if (mobilemartProductsCount[0].count > 0) {
        console.log(`   Found ${mobilemartProductsCount[0].count} MobileMart products to migrate`);
        console.log(`   ⚠️  MobileMart products migration requires manual product mapping`);
        console.log(`   ⚠️  Skipping automatic migration - data preserved in mobilemart_products for now`);
      } else {
        console.log('   No MobileMart products to migrate');
      }

      console.log('✅ Step 4 complete');

      // ===========================================
      // STEP 5: Migrate data from vas_products
      // ===========================================
      console.log('📊 Step 5: Migrating data from vas_products...');

      const vasProductsCount = await queryInterface.sequelize.query(
        `SELECT COUNT(*) FROM vas_products`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      if (vasProductsCount[0].count > 0) {
        console.log(`   Found ${vasProductsCount[0].count} VAS products to migrate`);
        console.log(`   ⚠️  VAS products migration requires manual product mapping`);
        console.log(`   ⚠️  Skipping automatic migration - data preserved in vas_products for now`);
      } else {
        console.log('   No VAS products to migrate');
      }

      console.log('✅ Step 5 complete');

      // ===========================================
      // STEP 6: Summary and next steps
      // ===========================================
      console.log('');
      console.log('✅ Product schema consolidation complete!');
      console.log('');
      console.log('📋 NEXT STEPS:');
      console.log('   1. Supplier-specific tables are still preserved (flash_products, mobilemart_products, vas_products)');
      console.log('   2. Use the new product_variants schema going forward');
      console.log('   3. Update services to use product_variants instead of supplier-specific tables');
      console.log('   4. Create product mapper services for each supplier');
      console.log('   5. Once services are updated, manually drop supplier-specific tables');
      console.log('');
      console.log('💡 New product_variants schema supports:');
      console.log('   ✅ vasType, transactionType, networkType');
      console.log('   ✅ provider, minAmount, maxAmount, predefinedAmounts');
      console.log('   ✅ commission, fixedFee');
      console.log('   ✅ isPromotional, promotionalDiscount, priority');
      console.log('   ✅ metadata JSONB for supplier-specific fields');
      console.log('');

      await transaction.commit();
      return Promise.resolve();

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Rolling back product schema consolidation...');

      // Remove added columns in reverse order
      await queryInterface.removeColumn('product_variants', 'lastSyncedAt', { transaction });
      await queryInterface.removeColumn('product_variants', 'priority', { transaction });
      await queryInterface.removeColumn('product_variants', 'promotionalDiscount', { transaction });
      await queryInterface.removeColumn('product_variants', 'isPromotional', { transaction });
      await queryInterface.removeColumn('product_variants', 'fixedFee', { transaction });
      await queryInterface.removeColumn('product_variants', 'commission', { transaction });
      await queryInterface.removeColumn('product_variants', 'predefinedAmounts', { transaction });
      await queryInterface.removeColumn('product_variants', 'maxAmount', { transaction });
      await queryInterface.removeColumn('product_variants', 'minAmount', { transaction });
      await queryInterface.removeColumn('product_variants', 'provider', { transaction });
      await queryInterface.removeColumn('product_variants', 'networkType', { transaction });
      await queryInterface.removeColumn('product_variants', 'transactionType', { transaction });
      await queryInterface.removeColumn('product_variants', 'vasType', { transaction });

      // Remove indexes
      await queryInterface.removeIndex('product_variants', 'idx_product_variants_vas_type', { transaction });
      await queryInterface.removeIndex('product_variants', 'idx_product_variants_provider', { transaction });
      await queryInterface.removeIndex('product_variants', 'idx_product_variants_transaction_type', { transaction });
      await queryInterface.removeIndex('product_variants', 'idx_product_variants_promotional', { transaction });
      await queryInterface.removeIndex('product_variants', 'idx_product_variants_priority', { transaction });
      await queryInterface.removeIndex('product_variants', 'idx_product_variants_vas_provider_status', { transaction });

      await transaction.commit();
      console.log('✅ Rollback complete');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
