#!/usr/bin/env node

/**
 * Add Missing Bolt Gift Card to Staging
 * 
 * Syncs the specific "Bolt Gift Card" product from UAT to Staging
 * to achieve perfect 174/174 parity
 * 
 * Usage:
 *   node scripts/add-missing-bolt-gift-card.js
 */

require('dotenv').config();
const { execSync } = require('child_process');
const { Pool } = require('pg');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
  data: (msg) => console.log(`   ${msg}`),
};

// Get UAT password
function getUATPassword() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.password) return decodeURIComponent(url.password);
    } catch (e) {}
  }
  return process.env.DB_PASSWORD || 'B0t3s@Mymoolah';
}

// Get Staging password
function getStagingPassword() {
  try {
    const password = execSync(
      'gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return password.replace(/[\r\n\s]+$/g, '').trim();
  } catch (error) {
    throw new Error(`Failed to get Staging password: ${error.message}`);
  }
}

async function addBoltGiftCard() {
  let uatPool = null;
  let stagingPool = null;
  
  try {
    log.header('🎯 ADDING BOLT GIFT CARD TO STAGING');
    
    // Connect to databases
    const uatPassword = getUATPassword();
    const stagingPassword = getStagingPassword();
    
    uatPool = new Pool({
      host: '127.0.0.1',
      port: 6543,
      database: 'mymoolah',
      user: 'mymoolah_app',
      password: uatPassword,
      ssl: false
    });
    
    stagingPool = new Pool({
      host: '127.0.0.1',
      port: 6544,
      database: 'mymoolah_staging',
      user: 'mymoolah_app',
      password: stagingPassword,
      ssl: false
    });
    
    log.success('Connected to both databases');
    
    // Get supplier IDs
    const uatSupplier = await uatPool.query('SELECT id FROM suppliers WHERE code = $1', ['FLASH']);
    const stagingSupplier = await stagingPool.query('SELECT id FROM suppliers WHERE code = $1', ['FLASH']);
    
    const uatFlashId = uatSupplier.rows[0].id;
    const stagingFlashId = stagingSupplier.rows[0].id;
    
    log.info(`UAT Flash Supplier ID: ${uatFlashId}`);
    log.info(`Staging Flash Supplier ID: ${stagingFlashId}`);
    
    // Get Bolt Gift Card product from UAT
    log.header('📦 Getting Bolt Gift Card from UAT...');
    const uatProduct = await uatPool.query(`
      SELECT * FROM products 
      WHERE name = $1 AND "supplierId" = $2
      LIMIT 1
    `, ['Bolt Gift Card', uatFlashId]);
    
    if (uatProduct.rows.length === 0) {
      log.error('Bolt Gift Card not found in UAT');
      process.exit(1);
    }
    
    const product = uatProduct.rows[0];
    log.success('Found Bolt Gift Card in UAT');
    log.data(`Type: ${product.type}`);
    log.data(`Brand ID: ${product.brandId}`);
    
    // Get brand details
    const uatBrand = await uatPool.query('SELECT * FROM product_brands WHERE id = $1', [product.brandId]);
    const brandName = uatBrand.rows[0]?.name || 'Bolt';
    
    // Find or create brand in Staging
    log.header('🏷️  Syncing brand to Staging...');
    let stagingBrandId;
    const existingBrand = await stagingPool.query('SELECT id FROM product_brands WHERE name = $1', [brandName]);
    
    if (existingBrand.rows.length > 0) {
      stagingBrandId = existingBrand.rows[0].id;
      log.info(`Brand "${brandName}" already exists in Staging (ID: ${stagingBrandId})`);
    } else {
      const newBrand = await stagingPool.query(`
        INSERT INTO product_brands (name, category, "logoUrl", metadata, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `, [
        uatBrand.rows[0].name,
        uatBrand.rows[0].category,
        uatBrand.rows[0].logoUrl,
        uatBrand.rows[0].metadata
      ]);
      stagingBrandId = newBrand.rows[0].id;
      log.success(`Brand "${brandName}" created in Staging (ID: ${stagingBrandId})`);
    }
    
    // Check if product already exists in Staging
    const existingProduct = await stagingPool.query(
      'SELECT id FROM products WHERE name = $1 AND "supplierId" = $2',
      ['Bolt Gift Card', stagingFlashId]
    );
    
    let stagingProductId;
    
    if (existingProduct.rows.length > 0) {
      stagingProductId = existingProduct.rows[0].id;
      log.info('Bolt Gift Card already exists in Staging - updating...');
      
      await stagingPool.query(`
        UPDATE products SET
          type = $1,
          status = $2,
          "brandId" = $3,
          "supplierProductId" = $4,
          denominations = $5::jsonb,
          constraints = $6::jsonb,
          metadata = $7::jsonb,
          "updatedAt" = NOW()
        WHERE id = $8
      `, [
        product.type,
        product.status,
        stagingBrandId,
        product.supplierProductId,
        JSON.stringify(product.denominations),
        JSON.stringify(product.constraints),
        JSON.stringify(product.metadata),
        stagingProductId
      ]);
      
      log.success('Bolt Gift Card updated in Staging');
    } else {
      log.header('➕ Creating Bolt Gift Card in Staging...');
      
      const newProduct = await stagingPool.query(`
        INSERT INTO products (
          name, type, status, "supplierId", "brandId",
          "supplierProductId", denominations, constraints, metadata,
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, NOW(), NOW())
        RETURNING id
      `, [
        product.name,
        product.type,
        product.status,
        stagingFlashId,
        stagingBrandId,
        product.supplierProductId,
        JSON.stringify(product.denominations),
        JSON.stringify(product.constraints),
        JSON.stringify(product.metadata)
      ]);
      
      stagingProductId = newProduct.rows[0].id;
      log.success(`Bolt Gift Card created in Staging (ID: ${stagingProductId})`);
    }
    
    // Get ProductVariant from UAT
    log.header('📋 Getting Bolt Gift Card ProductVariant from UAT...');
    const uatVariant = await uatPool.query(`
      SELECT * FROM product_variants
      WHERE "productId" = $1 AND "supplierId" = $2
      LIMIT 1
    `, [product.id, uatFlashId]);
    
    if (uatVariant.rows.length === 0) {
      log.error('Bolt Gift Card ProductVariant not found in UAT');
      process.exit(1);
    }
    
    const variant = uatVariant.rows[0];
    log.success('Found Bolt Gift Card ProductVariant in UAT');
    
    // Check if variant exists in Staging
    const providerValue = variant.provider || 'Bolt';
    const existingVariant = await stagingPool.query(
      'SELECT id FROM product_variants WHERE "productId" = $1 AND "supplierId" = $2 AND provider = $3',
      [stagingProductId, stagingFlashId, providerValue]
    );
    
    if (existingVariant.rows.length > 0) {
      log.info('ProductVariant already exists in Staging - updating...');
      
      await stagingPool.query(`
        UPDATE product_variants SET
          "supplierProductId" = $1,
          "vasType" = $2,
          "transactionType" = $3,
          "networkType" = $4,
          "predefinedAmounts" = $5::jsonb,
          denominations = $6::jsonb,
          pricing = $7::jsonb,
          "minAmount" = $8,
          "maxAmount" = $9,
          commission = $10,
          "fixedFee" = $11,
          "isPromotional" = $12,
          "promotionalDiscount" = $13,
          constraints = $14::jsonb,
          status = $15,
          "isPreferred" = $16,
          priority = $17,
          "sortOrder" = $18,
          metadata = $19::jsonb,
          "updatedAt" = NOW()
        WHERE id = $20
      `, [
        variant.supplierProductId,
        variant.vasType,
        variant.transactionType,
        variant.networkType,
        JSON.stringify(variant.predefinedAmounts),
        JSON.stringify(variant.denominations),
        JSON.stringify(variant.pricing),
        variant.minAmount,
        variant.maxAmount,
        variant.commission,
        variant.fixedFee,
        variant.isPromotional,
        variant.promotionalDiscount,
        JSON.stringify(variant.constraints),
        variant.status,
        variant.isPreferred,
        variant.priority,
        variant.sortOrder,
        JSON.stringify(variant.metadata),
        existingVariant.rows[0].id
      ]);
      
      log.success('ProductVariant updated in Staging');
    } else {
      log.header('➕ Creating Bolt Gift Card ProductVariant in Staging...');
      
      await stagingPool.query(`
        INSERT INTO product_variants (
          "productId", "supplierId", "supplierProductId",
          "vasType", "transactionType", provider, "networkType",
          "predefinedAmounts", denominations, pricing,
          "minAmount", "maxAmount", commission, "fixedFee",
          "isPromotional", "promotionalDiscount", constraints,
          status, "isPreferred", priority, "sortOrder", metadata,
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15, $16, $17::jsonb, $18, $19, $20, $21, $22::jsonb, NOW(), NOW())
      `, [
        stagingProductId,
        stagingFlashId,
        variant.supplierProductId,
        variant.vasType,
        variant.transactionType,
        providerValue,
        variant.networkType,
        JSON.stringify(variant.predefinedAmounts),
        JSON.stringify(variant.denominations),
        JSON.stringify(variant.pricing),
        variant.minAmount,
        variant.maxAmount,
        variant.commission,
        variant.fixedFee,
        variant.isPromotional,
        variant.promotionalDiscount,
        JSON.stringify(variant.constraints),
        variant.status,
        variant.isPreferred,
        variant.priority,
        variant.sortOrder,
        JSON.stringify(variant.metadata)
      ]);
      
      log.success('ProductVariant created in Staging');
    }
    
    // Verify final count
    log.header('🔍 Verifying final count...');
    const finalCount = await stagingPool.query(`
      SELECT COUNT(*) as count
      FROM products p
      JOIN suppliers s ON p."supplierId" = s.id
      WHERE s.code = 'FLASH'
    `);
    
    const finalVariantCount = await stagingPool.query(`
      SELECT COUNT(*) as count
      FROM product_variants pv
      JOIN suppliers s ON pv."supplierId" = s.id
      WHERE s.code = 'FLASH'
    `);
    
    log.success(`Final Flash Products count: ${finalCount.rows[0].count}`);
    log.success(`Final Flash ProductVariants count: ${finalVariantCount.rows[0].count}`);
    
    if (finalCount.rows[0].count === '174' && finalVariantCount.rows[0].count === '174') {
      log.header('🎉 PERFECT PARITY ACHIEVED!');
      log.success('UAT and Staging now have identical 174 Flash products!');
    } else {
      log.header('📊 Current Status:');
      log.data(`Products: ${finalCount.rows[0].count}/174`);
      log.data(`ProductVariants: ${finalVariantCount.rows[0].count}/174`);
    }
    
  } catch (error) {
    log.error(`Failed to add Bolt Gift Card: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (uatPool) await uatPool.end();
    if (stagingPool) await stagingPool.end();
  }
}

if (require.main === module) {
  addBoltGiftCard()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { addBoltGiftCard };
