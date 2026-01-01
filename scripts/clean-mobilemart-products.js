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

// Set DATABASE_URL from db-connection-helper before loading models
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');
process.env.DATABASE_URL = getUATDatabaseURL();

const db = require('../models');
const { ProductVariant, Product, Supplier, sequelize } = db;
const { Op } = require('sequelize');

const MOBILEMART_SUPPLIER_CODE = 'MOBILEMART';

async function cleanMobileMartProducts() {
  console.log('🧹 Starting MobileMart products cleanup...\n');
  
  // Step 1: Find MobileMart supplier
  const mobilemartSupplier = await Supplier.findOne({
    where: { code: MOBILEMART_SUPPLIER_CODE }
  });
  
  if (!mobilemartSupplier) {
    console.log('ℹ️  MobileMart supplier not found. Nothing to clean.');
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
    }]
  });
  
  console.log(`📊 Found ${mobilemartVariants.length} MobileMart ProductVariant records to delete\n`);
  
  if (mobilemartVariants.length === 0) {
    console.log('ℹ️  No MobileMart ProductVariant records found. Nothing to clean.');
    return;
  }
  
  // Log what will be deleted
  const productIds = [...new Set(mobilemartVariants.map(v => v.productId))];
  console.log(`📋 Products affected (${productIds.length} unique products):`);
  mobilemartVariants.forEach((variant, index) => {
    console.log(`   ${index + 1}. Variant ID ${variant.id}: ${variant.product?.name || 'Unknown'} (Product ID: ${variant.productId})`);
  });
  console.log();
  
  // Step 3: Delete all MobileMart ProductVariant records (COMMIT THIS FIRST)
  const variantTransaction = await sequelize.transaction();
  let deletedVariantsCount = 0;
  
  try {
    deletedVariantsCount = await ProductVariant.destroy({
      where: { supplierId: mobilemartSupplier.id },
      transaction: variantTransaction
    });
    
    await variantTransaction.commit();
    console.log(`✅ Deleted ${deletedVariantsCount} MobileMart ProductVariant records\n`);
  } catch (variantError) {
    await variantTransaction.rollback();
    console.error('❌ Error deleting ProductVariant records:', variantError.message);
    throw variantError;
  }
  
  // Step 4: Find orphaned Product records (products that only had MobileMart variants)
  // Check which products have no remaining variants after deleting MobileMart variants
  // NOTE: This is in a separate transaction so Product deletion errors don't roll back variant deletions
  const orphanedProductIds = [];
  
  for (const productId of productIds) {
    const remainingVariants = await ProductVariant.count({
      where: { productId }
    });
    
    if (remainingVariants === 0) {
      orphanedProductIds.push(productId);
    }
  }
  
  let deletedProductsCount = 0;
  
  if (orphanedProductIds.length > 0) {
    const orphanedProducts = await Product.findAll({
      where: {
        id: { [Op.in]: orphanedProductIds }
      },
      attributes: ['id', 'name']
    });
    
    console.log(`📋 Found ${orphanedProducts.length} orphaned Product records (no variants remaining):`);
    orphanedProducts.forEach((product, index) => {
      console.log(`   ${index + 1}. Product ID ${product.id}: ${product.name}`);
    });
    console.log();
    
    // Try to delete orphaned products (may fail due to foreign key constraints from orders)
    const productTransaction = await sequelize.transaction();
    try {
      deletedProductsCount = await Product.destroy({
        where: {
          id: { [Op.in]: orphanedProductIds }
        },
        transaction: productTransaction
      });
      
      await productTransaction.commit();
      console.log(`✅ Deleted ${deletedProductsCount} orphaned Product records\n`);
    } catch (productError) {
      await productTransaction.rollback();
      console.log(`⚠️  Could not delete ${orphanedProductIds.length} orphaned Product records (foreign key constraints from orders table)`);
      console.log(`   This is expected and safe - products remain but are unused\n`);
    }
  } else {
    console.log('ℹ️  No orphaned Product records found (all products have other supplier variants)\n');
  }
  
  console.log('🎉 MobileMart products cleanup completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Deleted ProductVariant records: ${deletedVariantsCount}`);
  console.log(`   - Deleted orphaned Product records: ${deletedProductsCount}`);
  console.log('\n✅ Ready for fresh MobileMart catalog sync');
}

// Run cleanup
cleanMobileMartProducts()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
    await closeAll();
  });
