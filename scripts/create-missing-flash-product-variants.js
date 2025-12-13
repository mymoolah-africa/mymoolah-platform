#!/usr/bin/env node
/**
 * Create ProductVariant records for Flash products that are missing them
 * 
 * Problem: 12 Flash voucher products exist in the products table but have no ProductVariant records,
 * making them invisible in the comparison API and voucher overlay.
 * 
 * Solution: Create ProductVariant records for each Flash product without variants.
 * 
 * Usage:
 *   In Codespaces:
 *   cd /workspaces/mymoolah-platform
 *   DATABASE_URL="postgres://mymoolah_app:B0t3s%40Mymoolah@127.0.0.1:6543/mymoolah?sslmode=disable" \
 *   node scripts/create-missing-flash-product-variants.js
 * 
 * @date 2025-12-13
 */

const db = require('../models');
const { Product, ProductVariant, Supplier } = db;

// Default denomination configurations for Flash vouchers
const VOUCHER_DENOMINATIONS = {
  // Standard vouchers (most common)
  default: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000], // R5-R1000
  
  // Gaming vouchers (typically higher amounts)
  gaming: [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000], // R10-R2000
  
  // Betting vouchers (wide range)
  betting: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000], // R5-R2000
  
  // Transport vouchers (lower amounts typical)
  transport: [1000, 2000, 5000, 10000, 20000, 50000], // R10-R500
  
  // Entertainment subscriptions (monthly pricing)
  subscription: [5000, 9900, 14900, 19900], // Common subscription tiers
};

// Default commission rates by voucher type (Flash typical rates)
const COMMISSION_RATES = {
  'MMVoucher': 0.0,           // MyMoolah internal (no commission)
  '1Voucher': 0.0,            // 1Voucher (commission TBD)
  'Betway': 6.0,              // Betting
  'DStv': 3.5,                // Streaming
  'Fifa Mobile': 3.0,         // Gaming
  'Google Play': 3.1,         // Gaming/Digital content
  'HollywoodBets': 5.0,       // Betting
  'Intercape': 2.5,           // Transport
  'Netflix': 3.0,             // Streaming
  'OTT': 3.5,                 // Streaming
  'Tenacity': 0.0,            // Commission TBD
  'YesPlay': 5.0              // Betting
};

function getDenominations(productName) {
  const name = productName.toLowerCase();
  
  if (name.includes('bet') || name.includes('play')) {
    return VOUCHER_DENOMINATIONS.betting;
  }
  if (name.includes('game') || name.includes('steam') || name.includes('playstation') || name.includes('xbox')) {
    return VOUCHER_DENOMINATIONS.gaming;
  }
  if (name.includes('intercape') || name.includes('uber')) {
    return VOUCHER_DENOMINATIONS.transport;
  }
  if (name.includes('subscription')) {
    return VOUCHER_DENOMINATIONS.subscription;
  }
  
  return VOUCHER_DENOMINATIONS.default;
}

function getCommissionRate(productName) {
  // Match against commission rate map
  for (const [key, rate] of Object.entries(COMMISSION_RATES)) {
    if (productName.includes(key)) {
      return rate;
    }
  }
  
  // Default commission for Flash vouchers
  return 3.0;
}

function getVasType(productName) {
  const name = productName.toLowerCase();
  
  if (name.includes('bet') || name.includes('play') || name.includes('game')) {
    return 'gaming';
  }
  if (name.includes('netflix') || name.includes('spotify') || name.includes('dstv') || name.includes('ott')) {
    return 'streaming';
  }
  
  return 'voucher';
}

async function createMissingFlashProductVariants() {
  try {
    console.log('🌱 Creating Missing Flash ProductVariants');
    console.log('============================================================\n');

    // Get Flash supplier
    const flashSupplier = await Supplier.findOne({ where: { code: 'FLASH' } });
    if (!flashSupplier) {
      throw new Error('Flash supplier not found in database');
    }
    console.log(`✅ Flash Supplier ID: ${flashSupplier.id}\n`);

    // Find all Flash voucher products without active ProductVariants
    const flashProducts = await Product.findAll({
      where: {
        supplierId: flashSupplier.id,
        type: 'voucher',
        status: 'active'
      },
      include: [{
        model: ProductVariant,
        as: 'variants',
        required: false
      }]
    });

    console.log(`📊 Found ${flashProducts.length} Flash voucher products\n`);

    let created = 0;
    let skipped = 0;

    for (const product of flashProducts) {
      const activeVariants = product.variants?.filter(v => v.status === 'active') || [];
      
      if (activeVariants.length > 0) {
        console.log(`⏭️  Skipping ${product.name} (already has ${activeVariants.length} active variants)`);
        skipped++;
        continue;
      }

      // Create ProductVariant for this product
      const denominations = getDenominations(product.name);
      const commissionRate = getCommissionRate(product.name);
      const vasType = getVasType(product.name);
      const minAmount = Math.min(...denominations);
      const maxAmount = Math.max(...denominations);

      try {
        const variant = await ProductVariant.create({
          productId: product.id,
          supplierId: flashSupplier.id,
          supplierProductId: `FLASH_${product.id}`,
          vasType: vasType,
          transactionType: 'voucher',
          provider: product.name.split(' ')[0], // First word as provider
          minAmount: minAmount,
          maxAmount: maxAmount,
          denominations: denominations,
          pricing: {
            basePrice: minAmount,
            currency: 'ZAR',
            priceType: 'variable'
          },
          commission: commissionRate,
          fixedFee: 0,
          isPromotional: false,
          promotionalDiscount: 0,
          constraints: {
            minQuantity: 1,
            maxQuantity: 10
          },
          status: 'active',
          isPreferred: true, // Flash is preferred supplier
          priority: 1,
          sortOrder: 1,
          metadata: {
            createdBy: 'seed-script',
            createdAt: new Date().toISOString(),
            note: 'Created to fix missing ProductVariant records'
          }
        });

        console.log(`✅ Created ProductVariant for ${product.name} (ID: ${product.id})`);
        console.log(`   - Denominations: ${denominations.length} values (R${minAmount/100}-R${maxAmount/100})`);
        console.log(`   - Commission: ${commissionRate}%`);
        console.log(`   - VasType: ${vasType}\n`);
        created++;

      } catch (error) {
        console.error(`❌ Failed to create variant for ${product.name}:`, error.message);
      }
    }

    console.log('\n============================================================');
    console.log('📊 SUMMARY');
    console.log('============================================================');
    console.log(`Total Flash voucher products: ${flashProducts.length}`);
    console.log(`ProductVariants created: ${created}`);
    console.log(`Products skipped (already have variants): ${skipped}`);
    console.log('============================================================\n');

    console.log('✅ Script completed successfully!');
    console.log('💡 Test by loading the vouchers overlay - all Flash vouchers should now be visible\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating ProductVariants:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  createMissingFlashProductVariants();
}

module.exports = { createMissingFlashProductVariants };

