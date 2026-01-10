#!/usr/bin/env node

/**
 * Count MobileMart Products in Staging Database
 * Uses db-connection-helper.js for proper credential management
 * 
 * Usage: node scripts/count-staging-mobilemart-products.js
 */

const { getStagingClient, closeAll } = require('./db-connection-helper');

async function countProducts() {
  console.log('\n📊 Counting MobileMart Products in Staging Database...\n');
  
  let client;
  
  try {
    // Connect to Staging
    console.log('📡 Connecting to Staging database...');
    client = await getStagingClient();
    console.log('✅ Connected to Staging\n');
    
    // Get supplier ID for MobileMart
    const supplierResult = await client.query(`
      SELECT id, name, code FROM suppliers WHERE code = 'MOBILEMART' LIMIT 1
    `);
    
    if (!supplierResult.rows.length) {
      console.log('❌ MobileMart supplier not found in Staging database');
      console.log('💡 You may need to seed the suppliers table first\n');
      return;
    }
    
    const supplier = supplierResult.rows[0];
    console.log(`✅ Found MobileMart Supplier:`);
    console.log(`   ID: ${supplier.id}`);
    console.log(`   Name: ${supplier.name}`);
    console.log(`   Code: ${supplier.code}\n`);
    
    // Count products by VAS type from product_variants
    console.log('📋 Counting ProductVariants by VAS Type:\n');
    const variantCountResult = await client.query(`
      SELECT 
        pv."vasType",
        COUNT(*) as count
      FROM product_variants pv
      WHERE pv."supplierId" = $1
      GROUP BY pv."vasType"
      ORDER BY pv."vasType"
    `, [supplier.id]);
    
    let variantTotal = 0;
    if (variantCountResult.rows.length > 0) {
      for (const row of variantCountResult.rows) {
        console.log(`  ${row.vasType}: ${row.count} variants`);
        variantTotal += parseInt(row.count);
      }
      console.log(`\n  TOTAL VARIANTS: ${variantTotal}\n`);
    } else {
      console.log('  No ProductVariants found for MobileMart\n');
    }
    
    // Also check base Products table
    console.log('📋 Counting Products by Type:\n');
    const productCountResult = await client.query(`
      SELECT 
        p."type",
        COUNT(*) as count
      FROM products p
      WHERE p."supplierId" = $1
      GROUP BY p."type"
      ORDER BY p."type"
    `, [supplier.id]);
    
    let productTotal = 0;
    if (productCountResult.rows.length > 0) {
      for (const row of productCountResult.rows) {
        console.log(`  ${row.type}: ${row.count} products`);
        productTotal += parseInt(row.count);
      }
      console.log(`\n  TOTAL PRODUCTS: ${productTotal}\n`);
    } else {
      console.log('  No Products found for MobileMart\n');
    }
    
    // Summary
    console.log('=' .repeat(60));
    console.log('SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`MobileMart ProductVariants in Staging: ${variantTotal}`);
    console.log(`MobileMart Products in Staging: ${productTotal}`);
    console.log('=' .repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('   1. Ensure Cloud SQL Auth Proxy is running (port 6544 for Staging)');
    console.error('   2. Check database credentials are correct');
    console.error('   3. Verify you have access to Secret Manager\n');
    process.exit(1);
  } finally {
    if (client) client.release();
    await closeAll();
  }
}

// Run
countProducts().catch(console.error);
