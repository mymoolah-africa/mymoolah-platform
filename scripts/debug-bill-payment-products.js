#!/usr/bin/env node
/**
 * Debug Bill-Payment Products in Staging
 * Check what provider names and categories exist
 */

const { getStagingClient, closeAll } = require('./db-connection-helper');

async function main() {
  console.log('\n🔍 Debugging Bill-Payment Products in Staging\n');
  
  const client = await getStagingClient();
  
  try {
    // Check total count
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM product_variants pv
      JOIN products p ON pv."productId" = p.id
      WHERE p.type = 'bill_payment' AND pv.status = 'active'
    `);
    
    console.log(`📊 Total bill-payment products: ${countResult.rows[0].total}\n`);
    
    // Check sample providers
    console.log('📋 Sample Providers (first 20):\n');
    const providersResult = await client.query(`
      SELECT 
        pv.provider,
        p.name as product_name,
        pv.metadata->>'category' as category
      FROM product_variants pv
      JOIN products p ON pv."productId" = p.id
      WHERE p.type = 'bill_payment' AND pv.status = 'active'
      ORDER BY pv.provider
      LIMIT 20
    `);
    
    providersResult.rows.forEach((row, i) => {
      console.log(`${i+1}. Provider: "${row.provider}"`);
      console.log(`   Product: "${row.product_name}"`);
      console.log(`   Category: "${row.category}"\n`);
    });
    
    // Check category distribution
    console.log('📂 Category Distribution:\n');
    const categoryResult = await client.query(`
      SELECT 
        pv.metadata->>'category' as category,
        COUNT(*) as count
      FROM product_variants pv
      JOIN products p ON pv."productId" = p.id
      WHERE p.type = 'bill_payment' AND pv.status = 'active'
      GROUP BY pv.metadata->>'category'
      ORDER BY count DESC
    `);
    
    categoryResult.rows.forEach(row => {
      console.log(`   ${(row.category || 'NULL').padEnd(15)}: ${row.count} products`);
    });
    
    // Search for "pep" specifically
    console.log('\n🔎 Searching for "pep" (case-insensitive):\n');
    const pepResult = await client.query(`
      SELECT 
        pv.provider,
        p.name as product_name,
        pv.metadata->>'category' as category
      FROM product_variants pv
      JOIN products p ON pv."productId" = p.id
      WHERE p.type = 'bill_payment' 
        AND pv.status = 'active'
        AND (
          LOWER(pv.provider) LIKE '%pep%' 
          OR LOWER(p.name) LIKE '%pep%'
        )
    `);
    
    if (pepResult.rowCount > 0) {
      console.log(`Found ${pepResult.rowCount} products matching "pep":\n`);
      pepResult.rows.forEach((row, i) => {
        console.log(`${i+1}. Provider: "${row.provider}"`);
        console.log(`   Product: "${row.product_name}"`);
        console.log(`   Category: "${row.category}"\n`);
      });
    } else {
      console.log('❌ No products found matching "pep"\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await closeAll();
  }
}

main().catch(console.error);
