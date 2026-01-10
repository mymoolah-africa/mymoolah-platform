#!/usr/bin/env node
/**
 * Add Category Metadata to Bill-Payment Products
 * 
 * MobileMart API doesn't provide category information in product listings.
 * This script categorizes bill-payment products based on content creator/product name.
 * 
 * Categories:
 * - insurance: Discovery, Old Mutual, Sanlam, etc.
 * - entertainment: DSTV, Netflix, Showmax, etc.
 * - education: School fees, university, etc.
 * - municipal: City of Cape Town, eThekwini, etc.
 * - telecoms: Telkom, Vodacom, MTN, etc.
 * - retail: Woolworths, Pick n Pay, Edgars, etc.
 * 
 * Usage:
 *   node scripts/categorize-bill-payment-products.js [uat|staging]
 */

const { getUATClient, getStagingClient, closeAll } = require('./db-connection-helper');

// Category mapping rules (case-insensitive matching)
const CATEGORY_RULES = {
  insurance: [
    'discovery', 'old mutual', 'sanlam', 'liberty', 'momentum', 'hollard',
    'santam', 'outsurance', 'budget insurance', 'first for women'
  ],
  entertainment: [
    'dstv', 'showmax', 'netflix', 'multichoice', 'openview',
    'spotify', 'apple music', 'youtube', 'playstation', 'xbox',
    'nintendo', 'streaming'
  ],
  education: [
    'school', 'university', 'college', 'academy', 'tuition',
    'uct', 'wits', 'unisa', 'education', 'learning'
  ],
  municipal: [
    'city of', 'municipality', 'council', 'metro', 'ethekwini',
    'johannesburg', 'cape town', 'durban', 'pretoria', 'tshwane',
    'nelson mandela bay', 'water', 'rates', 'sewerage'
  ],
  telecoms: [
    'telkom', 'vodacom', 'mtn', 'cell c', 'rain', 'afrihost',
    'mweb', 'webafrica', 'axxess', 'internet', 'broadband', 'fibre'
  ],
  retail: [
    'woolworths', 'pick n pay', 'checkers', 'shoprite', 'spar',
    'makro', 'game', 'edgars', 'truworths', 'foschini', 'mr price',
    'ackermans', 'pep', 'jet', 'store card', 'account'
  ]
};

/**
 * Determine category from product name or content creator
 */
function determineCategory(provider, productName) {
  const searchText = `${provider || ''} ${productName || ''}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'other'; // Default fallback
}

async function main() {
  const environment = process.argv[2] || 'uat';
  console.log(`\n🏷️  Categorizing Bill-Payment Products (${environment.toUpperCase()})\n`);
  
  // Use db-connection-helper for proper password handling
  const client = environment === 'staging' 
    ? await getStagingClient()
    : await getUATClient();
  
  try {
    // Get all bill-payment products
    const result = await client.query(`
      SELECT 
        pv.id,
        pv.provider,
        p.name as product_name,
        pv.metadata
      FROM product_variants pv
      JOIN products p ON pv."productId" = p.id
      WHERE p.type = 'bill_payment' AND pv.status = 'active'
      ORDER BY pv.provider, p.name
    `);
    
    console.log(`Found ${result.rowCount} bill-payment products\n`);
    
    // Track statistics
    const stats = {
      total: result.rowCount,
      updated: 0,
      byCategory: {}
    };
    
    // Process each product
    for (const row of result.rows) {
      const category = determineCategory(row.provider, row.product_name);
      
      // Update metadata to include category
      const updatedMetadata = {
        ...row.metadata,
        category: category,
        billerCategory: category // For backwards compatibility
      };
      
      await client.query(`
        UPDATE product_variants
        SET metadata = $1::jsonb, "updatedAt" = NOW()
        WHERE id = $2
      `, [JSON.stringify(updatedMetadata), row.id]);
      
      stats.updated++;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      
      // Log progress every 100 products
      if (stats.updated % 100 === 0) {
        console.log(`  ✅ Processed ${stats.updated} / ${stats.total}...`);
      }
    }
    
    // Print summary
    console.log(`\n✅ Categorization Complete!\n`);
    console.log(`📊 Statistics:`);
    console.log(`   Total products: ${stats.total}`);
    console.log(`   Updated: ${stats.updated}\n`);
    console.log(`📂 By Category:`);
    
    Object.entries(stats.byCategory)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`   ${category.padEnd(15)}: ${count.toString().padStart(4)} products`);
      });
    
    console.log(`\n🎉 Done! Bill-payment products now have category metadata.\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error(`   1. Ensure Cloud SQL Auth Proxy is running`);
    console.error(`   2. Check database credentials`);
    console.error(`   3. Verify bill-payment products exist in database`);
    process.exit(1);
  } finally {
    client.release();
    await closeAll();
  }
}

main().catch(console.error);
