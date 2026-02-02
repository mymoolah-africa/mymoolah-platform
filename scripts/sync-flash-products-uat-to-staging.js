#!/usr/bin/env node

/**
 * Sync Flash Products from UAT to Staging
 * 
 * Exports all Flash products and ProductVariants from UAT database
 * and imports them into Staging database to ensure catalog parity.
 * 
 * Usage:
 *   In Codespaces:
 *   node scripts/sync-flash-products-uat-to-staging.js
 * 
 * Requirements:
 *   - Cloud SQL Auth Proxies running (UAT: 6543, Staging: 6544)
 *   - Authenticated with gcloud
 *   - Access to db-mmtp-pg-staging-password in Secret Manager
 * 
 * @author MyMoolah Development Team
 * @date 2026-02-01
 * @version 1.0.0
 */

require('dotenv').config();
const { execSync } = require('child_process');
const { Pool } = require('pg');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.magenta}▶️  ${msg}${colors.reset}`),
  data: (msg) => console.log(`   ${msg}`),
};

// Database configuration
const CONFIG = {
  UAT: {
    host: '127.0.0.1',
    port: 6543,
    database: 'mymoolah',
    user: 'mymoolah_app',
  },
  STAGING: {
    host: '127.0.0.1',
    port: 6544,
    database: 'mymoolah_staging',
    user: 'mymoolah_app',
  }
};

/**
 * Get UAT password from .env
 */
function getUATPassword() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.password) {
        return decodeURIComponent(url.password);
      }
    } catch (e) {
      // Manual parsing for complex passwords
      const urlString = process.env.DATABASE_URL;
      const hostPattern = '@127.0.0.1:';
      const hostIndex = urlString.indexOf(hostPattern);
      if (hostIndex > 0) {
        const userPassStart = urlString.indexOf('://') + 3;
        const passwordStart = urlString.indexOf(':', userPassStart) + 1;
        if (passwordStart > userPassStart && passwordStart < hostIndex) {
          const password = urlString.substring(passwordStart, hostIndex);
          try {
            return decodeURIComponent(password);
          } catch {
            return password;
          }
        }
      }
    }
  }
  
  if (process.env.DB_PASSWORD) {
    return process.env.DB_PASSWORD;
  }
  
  throw new Error('UAT password not found in .env file');
}

/**
 * Get Staging password from GCS Secret Manager
 */
function getStagingPassword() {
  try {
    const password = execSync(
      'gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return password.replace(/[\r\n\s]+$/g, '').trim();
  } catch (error) {
    throw new Error(`Failed to get Staging password from Secret Manager: ${error.message}`);
  }
}

/**
 * Create database pool
 */
function createPool(config, password) {
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: password,
    ssl: false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

/**
 * Main sync function
 */
async function syncFlashProducts() {
  let uatPool = null;
  let stagingPool = null;
  
  try {
    log.header('🔄 FLASH PRODUCTS SYNC: UAT → STAGING');
    log.info('Starting database synchronization...');
    console.log();

    // Step 1: Get passwords
    log.step('Step 1: Retrieving database passwords...');
    const uatPassword = getUATPassword();
    const stagingPassword = getStagingPassword();
    log.success('Passwords retrieved successfully');
    log.data(`UAT Password: ${uatPassword.substring(0, 3)}***`);
    log.data(`Staging Password: ${stagingPassword.substring(0, 3)}***`);
    console.log();

    // Step 2: Create database connections
    log.step('Step 2: Connecting to databases...');
    uatPool = createPool(CONFIG.UAT, uatPassword);
    stagingPool = createPool(CONFIG.STAGING, stagingPassword);
    
    // Test connections
    await uatPool.query('SELECT 1');
    await stagingPool.query('SELECT 1');
    log.success('Database connections established');
    log.data(`UAT: ${CONFIG.UAT.host}:${CONFIG.UAT.port}/${CONFIG.UAT.database}`);
    log.data(`Staging: ${CONFIG.STAGING.host}:${CONFIG.STAGING.port}/${CONFIG.STAGING.database}`);
    console.log();

    // Step 3: Get Flash supplier IDs from both databases
    log.step('Step 3: Getting Flash supplier IDs...');
    const uatSupplierResult = await uatPool.query(
      'SELECT id, name, code FROM suppliers WHERE code = $1',
      ['FLASH']
    );
    const stagingSupplierResult = await stagingPool.query(
      'SELECT id, name, code FROM suppliers WHERE code = $1',
      ['FLASH']
    );
    
    if (uatSupplierResult.rows.length === 0) {
      throw new Error('Flash supplier not found in UAT database');
    }
    if (stagingSupplierResult.rows.length === 0) {
      throw new Error('Flash supplier not found in Staging database');
    }
    
    const uatFlashSupplierId = uatSupplierResult.rows[0].id;
    const stagingFlashSupplierId = stagingSupplierResult.rows[0].id;
    
    log.success(`Flash supplier found in both databases`);
    log.data(`UAT Flash Supplier ID: ${uatFlashSupplierId}`);
    log.data(`Staging Flash Supplier ID: ${stagingFlashSupplierId}`);
    console.log();

    // Step 4: Export Flash products from UAT
    log.step('Step 4: Exporting Flash products from UAT...');
    const uatProductsResult = await uatPool.query(`
      SELECT 
        id, name, description, type, category, status,
        "supplierId", "imageUrl", "iconUrl", tags, metadata,
        "createdAt", "updatedAt"
      FROM products
      WHERE "supplierId" = $1
      ORDER BY id
    `, [uatFlashSupplierId]);
    
    const uatProducts = uatProductsResult.rows;
    log.success(`Exported ${uatProducts.length} Flash products from UAT`);
    console.log();

    // Step 5: Export Flash ProductVariants from UAT
    log.step('Step 5: Exporting Flash ProductVariants from UAT...');
    const uatVariantsResult = await uatPool.query(`
      SELECT 
        pv.id, pv."productId", pv."supplierId", pv."supplierProductId",
        pv."vasType", pv."transactionType", pv.provider, pv."networkType",
        pv."predefinedAmounts", pv.denominations, pv.pricing,
        pv."minAmount", pv."maxAmount", pv.commission, pv."fixedFee",
        pv."isPromotional", pv."promotionalDiscount", pv.constraints,
        pv.status, pv."isPreferred", pv.priority, pv."sortOrder", pv.metadata,
        p.name as product_name
      FROM product_variants pv
      JOIN products p ON pv."productId" = p.id
      WHERE pv."supplierId" = $1
      ORDER BY pv.id
    `, [uatFlashSupplierId]);
    
    const uatVariants = uatVariantsResult.rows;
    log.success(`Exported ${uatVariants.length} Flash ProductVariants from UAT`);
    console.log();

    // Step 6: Sync products to Staging
    log.step('Step 6: Syncing products to Staging...');
    let productsCreated = 0;
    let productsUpdated = 0;
    let productsSkipped = 0;
    
    const productIdMapping = {}; // Map UAT product IDs to Staging product IDs
    
    for (const product of uatProducts) {
      try {
        // Check if product exists in Staging
        const existingResult = await stagingPool.query(
          'SELECT id FROM products WHERE name = $1 AND "supplierId" = $2',
          [product.name, stagingFlashSupplierId]
        );
        
        if (existingResult.rows.length > 0) {
          // Update existing product
          const stagingProductId = existingResult.rows[0].id;
          await stagingPool.query(`
            UPDATE products SET
              description = $1,
              type = $2,
              category = $3,
              status = $4,
              "imageUrl" = $5,
              "iconUrl" = $6,
              tags = $7,
              metadata = $8,
              "updatedAt" = NOW()
            WHERE id = $9
          `, [
            product.description,
            product.type,
            product.category,
            product.status,
            product.imageUrl,
            product.iconUrl,
            product.tags,
            product.metadata,
            stagingProductId
          ]);
          
          productIdMapping[product.id] = stagingProductId;
          productsUpdated++;
          
        } else {
          // Create new product
          const insertResult = await stagingPool.query(`
            INSERT INTO products (
              name, description, type, category, status,
              "supplierId", "imageUrl", "iconUrl", tags, metadata,
              "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING id
          `, [
            product.name,
            product.description,
            product.type,
            product.category,
            product.status,
            stagingFlashSupplierId,
            product.imageUrl,
            product.iconUrl,
            product.tags,
            product.metadata
          ]);
          
          productIdMapping[product.id] = insertResult.rows[0].id;
          productsCreated++;
        }
        
      } catch (error) {
        log.error(`Failed to sync product "${product.name}": ${error.message}`);
        productsSkipped++;
      }
    }
    
    log.success(`Products synced: ${productsCreated} created, ${productsUpdated} updated, ${productsSkipped} skipped`);
    console.log();

    // Step 7: Sync ProductVariants to Staging
    log.step('Step 7: Syncing ProductVariants to Staging...');
    let variantsCreated = 0;
    let variantsUpdated = 0;
    let variantsSkipped = 0;
    
    for (const variant of uatVariants) {
      try {
        // Get the Staging product ID
        const stagingProductId = productIdMapping[variant.productId];
        if (!stagingProductId) {
          log.warning(`Skipping variant for product "${variant.product_name}" - product not found in mapping`);
          variantsSkipped++;
          continue;
        }
        
        // Check if variant exists in Staging
        const existingResult = await stagingPool.query(
          'SELECT id FROM product_variants WHERE "productId" = $1 AND "supplierId" = $2 AND provider = $3',
          [stagingProductId, stagingFlashSupplierId, variant.provider]
        );
        
        if (existingResult.rows.length > 0) {
          // Update existing variant
          await stagingPool.query(`
            UPDATE product_variants SET
              "supplierProductId" = $1,
              "vasType" = $2,
              "transactionType" = $3,
              "networkType" = $4,
              "predefinedAmounts" = $5,
              denominations = $6,
              pricing = $7,
              "minAmount" = $8,
              "maxAmount" = $9,
              commission = $10,
              "fixedFee" = $11,
              "isPromotional" = $12,
              "promotionalDiscount" = $13,
              constraints = $14,
              status = $15,
              "isPreferred" = $16,
              priority = $17,
              "sortOrder" = $18,
              metadata = $19,
              "updatedAt" = NOW()
            WHERE id = $20
          `, [
            variant.supplierProductId,
            variant.vasType,
            variant.transactionType,
            variant.networkType,
            variant.predefinedAmounts,
            variant.denominations,
            variant.pricing,
            variant.minAmount,
            variant.maxAmount,
            variant.commission,
            variant.fixedFee,
            variant.isPromotional,
            variant.promotionalDiscount,
            variant.constraints,
            variant.status,
            variant.isPreferred,
            variant.priority,
            variant.sortOrder,
            variant.metadata,
            existingResult.rows[0].id
          ]);
          
          variantsUpdated++;
          
        } else {
          // Create new variant
          await stagingPool.query(`
            INSERT INTO product_variants (
              "productId", "supplierId", "supplierProductId",
              "vasType", "transactionType", provider, "networkType",
              "predefinedAmounts", denominations, pricing,
              "minAmount", "maxAmount", commission, "fixedFee",
              "isPromotional", "promotionalDiscount", constraints,
              status, "isPreferred", priority, "sortOrder", metadata,
              "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW())
          `, [
            stagingProductId,
            stagingFlashSupplierId,
            variant.supplierProductId,
            variant.vasType,
            variant.transactionType,
            variant.provider,
            variant.networkType,
            variant.predefinedAmounts,
            variant.denominations,
            variant.pricing,
            variant.minAmount,
            variant.maxAmount,
            variant.commission,
            variant.fixedFee,
            variant.isPromotional,
            variant.promotionalDiscount,
            variant.constraints,
            variant.status,
            variant.isPreferred,
            variant.priority,
            variant.sortOrder,
            variant.metadata
          ]);
          
          variantsCreated++;
        }
        
      } catch (error) {
        log.error(`Failed to sync variant for "${variant.product_name}" / ${variant.provider}: ${error.message}`);
        variantsSkipped++;
      }
    }
    
    log.success(`ProductVariants synced: ${variantsCreated} created, ${variantsUpdated} updated, ${variantsSkipped} skipped`);
    console.log();

    // Step 8: Verify sync completed successfully
    log.step('Step 8: Verifying sync results...');
    
    const stagingProductsResult = await stagingPool.query(
      'SELECT COUNT(*) as count FROM products WHERE "supplierId" = $1',
      [stagingFlashSupplierId]
    );
    const stagingVariantsResult = await stagingPool.query(
      'SELECT COUNT(*) as count FROM product_variants WHERE "supplierId" = $1',
      [stagingFlashSupplierId]
    );
    
    const stagingProductCount = parseInt(stagingProductsResult.rows[0].count);
    const stagingVariantCount = parseInt(stagingVariantsResult.rows[0].count);
    
    log.success('Verification complete');
    console.log();
    
    // Step 9: Display summary
    log.header('📊 SYNC SUMMARY');
    console.log();
    
    log.info('UAT Database:');
    log.data(`Flash Products: ${uatProducts.length}`);
    log.data(`Flash ProductVariants: ${uatVariants.length}`);
    console.log();
    
    log.info('Staging Database (After Sync):');
    log.data(`Flash Products: ${stagingProductCount}`);
    log.data(`Flash ProductVariants: ${stagingVariantCount}`);
    console.log();
    
    log.info('Sync Operations:');
    log.data(`Products: ${productsCreated} created, ${productsUpdated} updated, ${productsSkipped} skipped`);
    log.data(`ProductVariants: ${variantsCreated} created, ${variantsUpdated} updated, ${variantsSkipped} skipped`);
    console.log();
    
    // Verify counts match
    if (stagingProductCount === uatProducts.length && stagingVariantCount === uatVariants.length) {
      log.header('🎉 SYNC COMPLETE - PERFECT PARITY');
      log.success(`UAT and Staging now have identical Flash catalogs`);
      log.success(`${stagingProductCount} products with ${stagingVariantCount} variants`);
    } else {
      log.warning('Sync completed with discrepancies:');
      if (stagingProductCount !== uatProducts.length) {
        log.warning(`Product count mismatch: Expected ${uatProducts.length}, got ${stagingProductCount}`);
      }
      if (stagingVariantCount !== uatVariants.length) {
        log.warning(`ProductVariant count mismatch: Expected ${uatVariants.length}, got ${stagingVariantCount}`);
      }
    }
    
    console.log();
    log.header('✅ FLASH PRODUCTS SYNC COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    log.error(`Sync failed: ${error.message}`);
    console.error(error);
    process.exit(1);
    
  } finally {
    // Clean up connections
    if (uatPool) await uatPool.end();
    if (stagingPool) await stagingPool.end();
  }
}

// Run the sync
if (require.main === module) {
  syncFlashProducts()
    .then(() => process.exit(0))
    .catch((error) => {
      log.error(`Fatal error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { syncFlashProducts };
