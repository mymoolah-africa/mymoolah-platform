#!/usr/bin/env node

/**
 * Clean MobileMart Products Script
 * 
 * Removes all MobileMart products from the database:
 * - ProductVariant records for MobileMart supplier
 * - Product records that only have MobileMart variants (orphaned products)
 * 
 * Usage: node scripts/clean-mobilemart-products.js
 */

require('dotenv').config({ path: '.env' });

// Initialize database connection helper
const dbConnectionHelper = require('./db-connection-helper');
dbConnectionHelper.initializeDatabaseConnection();

const db = require('../models');
const { ProductVariant, Product, Supplier, sequelize } = db;
const { Op } = require('sequelize');

const MOBILEMART_SUPPLIER_CODE = 'MOBILEMART';

async function cleanMobileMartProducts() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🧹 Starting MobileMart products cleanup...\n');
    
    // Step 1: Find MobileMart supplier
    const mobilemartSupplier = await Supplier.findOne({
      where: { code: MOBILEMART_SUPPLIER_CODE },
      transaction
    });
    
    if (!mobilemartSupplier) {
      console.log('ℹ️  MobileMart supplier not found. Nothing to clean.');
      await transaction.rollback();
      return;
    }
    
    console.log(`✅ Found MobileMart supplier: ID ${mobilemartSupplier.id}, Name: ${mobilemartSupplier.name}\n`);
    
    // Step 2: Find all ProductVariant records for MobileMart
    const mobilemartVariants = await ProductVariant.findAll({
      where: { supplierId: mobilemartSupplier.id },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name']
      }],
      transaction
    });
    
    console.log(`📊 Found ${mobilemartVariants.length} MobileMart ProductVariant records to delete\n`);
    
    if (mobilemartVariants.length === 0) {
      console.log('ℹ️  No MobileMart ProductVariant records found. Nothing to clean.');
      await transaction.rollback();
      return;
    }
    
    // Log what will be deleted
    const productIds = [...new Set(mobilemartVariants.map(v => v.productId))];
    console.log(`📋 Products affected (${productIds.length} unique products):`);
    mobilemartVariants.forEach((variant, index) => {
      console.log(`   ${index + 1}. Variant ID ${variant.id}: ${variant.product?.name || 'Unknown'} (Product ID: ${variant.productId})`);
    });
    console.log();
    
    // Step 3: Delete all MobileMart ProductVariant records
    const deletedVariantsCount = await ProductVariant.destroy({
      where: { supplierId: mobilemartSupplier.id },
      transaction
    });
    
    console.log(`✅ Deleted ${deletedVariantsCount} MobileMart ProductVariant records\n`);
    
    // Step 4: Find orphaned Product records (products that only had MobileMart variants)
    const orphanedProducts = await Product.findAll({
      where: {
        id: { [Op.in]: productIds }
      },
      include: [{
        model: ProductVariant,
        as: 'variants',
        required: false,
        attributes: ['id']
      }],
      transaction
    });
    
    const productsToDelete = orphanedProducts.filter(p => 
      !p.variants || p.variants.length === 0
    );
    
    if (productsToDelete.length > 0) {
      console.log(`📋 Found ${productsToDelete.length} orphaned Product records (no variants remaining):`);
      productsToDelete.forEach((product, index) => {
        console.log(`   ${index + 1}. Product ID ${product.id}: ${product.name}`);
      });
      console.log();
      
      const deletedProductsCount = await Product.destroy({
        where: {
          id: { [Op.in]: productsToDelete.map(p => p.id) }
        },
        transaction
      });
      
      console.log(`✅ Deleted ${deletedProductsCount} orphaned Product records\n`);
    } else {
      console.log('ℹ️  No orphaned Product records found (all products have other supplier variants)\n');
    }
    
    // Commit transaction
    await transaction.commit();
    
    console.log('🎉 MobileMart products cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Deleted ProductVariant records: ${deletedVariantsCount}`);
    console.log(`   - Deleted orphaned Product records: ${productsToDelete.length}`);
    console.log('\n✅ Ready for fresh MobileMart catalog sync');
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error during cleanup:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run cleanup
cleanMobileMartProducts()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });

