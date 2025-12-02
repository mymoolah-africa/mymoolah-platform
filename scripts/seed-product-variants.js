#!/usr/bin/env node
/**
 * Seed Product Variants Script
 * 
 * Creates sample products in the normalized ProductVariant schema
 * for testing supplier comparison and product catalog features.
 * 
 * Usage:
 *   node scripts/seed-product-variants.js
 * 
 * @date 2025-12-01
 */

const db = require('../models');
const { Product, ProductVariant, Supplier } = db;

// Sample products data
const sampleProducts = {
  flash: [
    {
      productCode: 'FL-AIR-MTN-001',
      productName: 'MTN Airtime',
      category: 'airtime',
      provider: 'MTN',
      minAmount: 500,      // R5
      maxAmount: 100000,   // R1000
      commission: 2.5,
      isActive: true,
      isPromotional: false
    },
    {
      productCode: 'FL-AIR-VOD-001',
      productName: 'Vodacom Airtime',
      category: 'airtime',
      provider: 'Vodacom',
      minAmount: 500,
      maxAmount: 100000,
      commission: 2.5,
      isActive: true,
      isPromotional: false
    },
    {
      productCode: 'FL-AIR-CELL-001',
      productName: 'Cell C Airtime',
      category: 'airtime',
      provider: 'Cell C',
      minAmount: 500,
      maxAmount: 100000,
      commission: 2.0,
      isActive: true,
      isPromotional: true,
      promotionalDiscount: 3.0
    },
    {
      productCode: 'FL-AIR-TEL-001',
      productName: 'Telkom Airtime',
      category: 'airtime',
      provider: 'Telkom',
      minAmount: 500,
      maxAmount: 50000,
      commission: 2.0,
      isActive: true,
      isPromotional: false
    },
    {
      productCode: 'FL-DATA-MTN-001',
      productName: 'MTN Data Bundle',
      category: 'data',
      provider: 'MTN',
      minAmount: 1000,
      maxAmount: 200000,
      commission: 3.0,
      isActive: true,
      isPromotional: false
    },
    {
      productCode: 'FL-DATA-VOD-001',
      productName: 'Vodacom Data Bundle',
      category: 'data',
      provider: 'Vodacom',
      minAmount: 1000,
      maxAmount: 200000,
      commission: 3.0,
      isActive: true,
      isPromotional: true,
      promotionalDiscount: 5.0
    },
    {
      productCode: 'FL-ELEC-001',
      productName: 'Prepaid Electricity',
      category: 'electricity',
      provider: 'Eskom',
      minAmount: 1000,
      maxAmount: 500000,
      commission: 1.5,
      isActive: true,
      isPromotional: false
    }
  ],
  mobilemart: [
    {
      merchantProductId: 'MM-AIR-MTN-001',
      productName: 'MTN Airtime',
      vasType: 'airtime',
      provider: 'MTN',
      minAmount: 500,
      maxAmount: 100000,
      commission: 2.0,
      isActive: true,
      isPromotional: false
    },
    {
      merchantProductId: 'MM-AIR-VOD-001',
      productName: 'Vodacom Airtime',
      vasType: 'airtime',
      provider: 'Vodacom',
      minAmount: 500,
      maxAmount: 100000,
      commission: 2.0,
      isActive: true,
      isPromotional: true,
      promotionalDiscount: 2.5
    },
    {
      merchantProductId: 'MM-AIR-CELL-001',
      productName: 'Cell C Airtime',
      vasType: 'airtime',
      provider: 'Cell C',
      minAmount: 500,
      maxAmount: 100000,
      commission: 1.8,
      isActive: true,
      isPromotional: false
    },
    {
      merchantProductId: 'MM-DATA-MTN-001',
      productName: 'MTN Data Bundle',
      vasType: 'data',
      provider: 'MTN',
      minAmount: 1000,
      maxAmount: 200000,
      commission: 2.5,
      isActive: true,
      isPromotional: false
    },
    {
      merchantProductId: 'MM-DATA-VOD-001',
      productName: 'Vodacom Data Bundle',
      vasType: 'data',
      provider: 'Vodacom',
      minAmount: 1000,
      maxAmount: 200000,
      commission: 2.5,
      isActive: true,
      isPromotional: false
    },
    {
      merchantProductId: 'MM-ELEC-001',
      productName: 'Prepaid Electricity',
      vasType: 'electricity',
      provider: 'Eskom',
      minAmount: 1000,
      maxAmount: 500000,
      commission: 1.2,
      isActive: true,
      isPromotional: false
    },
    {
      merchantProductId: 'MM-VOUCH-001',
      productName: 'Takealot Voucher',
      vasType: 'voucher',
      provider: 'Takealot',
      minAmount: 5000,
      maxAmount: 100000,
      commission: 4.0,
      isActive: true,
      isPromotional: true,
      promotionalDiscount: 2.0
    }
  ]
};

async function seedProducts() {
  console.log('🌱 Starting Product Variant Seeding...\n');

  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Create or get Flash supplier
    const [flashSupplier] = await Supplier.findOrCreate({
      where: { code: 'FLASH' },
      defaults: {
        name: 'Flash',
        code: 'FLASH',
        isActive: true,
        apiEndpoint: 'https://api.flash.co.za',
        config: { type: 'flash' }
      }
    });
    console.log(`📦 Flash Supplier ID: ${flashSupplier.id}`);

    // Create or get MobileMart supplier
    const [mobilemartSupplier] = await Supplier.findOrCreate({
      where: { code: 'MOBILEMART' },
      defaults: {
        name: 'MobileMart',
        code: 'MOBILEMART',
        isActive: true,
        apiEndpoint: 'https://api.mobilemart.co.za',
        config: { type: 'mobilemart' }
      }
    });
    console.log(`📦 MobileMart Supplier ID: ${mobilemartSupplier.id}\n`);

    let flashCreated = 0;
    let mobilemartCreated = 0;

    // Seed Flash products
    console.log('📱 Seeding Flash products...');
    for (const flashProduct of sampleProducts.flash) {
      const vasType = mapCategoryToVasType(flashProduct.category);
      
      // Create or get base product
      const [product] = await Product.findOrCreate({
        where: { 
          name: flashProduct.productName,
          type: vasType
        },
        defaults: {
          name: flashProduct.productName,
          type: vasType,
          supplierProductId: flashProduct.productCode,
          status: 'active',
          denominations: [],
          isFeatured: flashProduct.isPromotional || false,
          sortOrder: 0,
          metadata: { source: 'flash', seeded: true }
        }
      });

      // Create or update ProductVariant
      const [variant, created] = await ProductVariant.findOrCreate({
        where: {
          productId: product.id,
          supplierId: flashSupplier.id
        },
        defaults: {
          productId: product.id,
          supplierId: flashSupplier.id,
          supplierProductId: flashProduct.productCode,
          vasType: vasType,
          transactionType: getTransactionType(vasType),
          networkType: 'local',
          provider: flashProduct.provider,
          minAmount: flashProduct.minAmount,
          maxAmount: flashProduct.maxAmount,
          commission: flashProduct.commission,
          fixedFee: 0,
          isPromotional: flashProduct.isPromotional || false,
          promotionalDiscount: flashProduct.promotionalDiscount || null,
          priority: 1,
          status: 'active',
          lastSyncedAt: new Date(),
          metadata: {
            flash_product_code: flashProduct.productCode,
            seeded: true,
            seeded_at: new Date().toISOString()
          }
        }
      });

      if (created) {
        flashCreated++;
        console.log(`  ✅ Created: ${flashProduct.productName} (${flashProduct.provider})`);
      } else {
        console.log(`  ℹ️  Exists: ${flashProduct.productName} (${flashProduct.provider})`);
      }
    }

    // Seed MobileMart products
    console.log('\n📱 Seeding MobileMart products...');
    for (const mmProduct of sampleProducts.mobilemart) {
      const vasType = mmProduct.vasType;
      
      // Create or get base product
      const [product] = await Product.findOrCreate({
        where: { 
          name: mmProduct.productName,
          type: vasType
        },
        defaults: {
          name: mmProduct.productName,
          type: vasType,
          supplierProductId: mmProduct.merchantProductId,
          status: 'active',
          denominations: [],
          isFeatured: mmProduct.isPromotional || false,
          sortOrder: 0,
          metadata: { source: 'mobilemart', seeded: true }
        }
      });

      // Create or update ProductVariant
      const [variant, created] = await ProductVariant.findOrCreate({
        where: {
          productId: product.id,
          supplierId: mobilemartSupplier.id
        },
        defaults: {
          productId: product.id,
          supplierId: mobilemartSupplier.id,
          supplierProductId: mmProduct.merchantProductId,
          vasType: vasType,
          transactionType: getTransactionType(vasType),
          networkType: 'local',
          provider: mmProduct.provider,
          minAmount: mmProduct.minAmount,
          maxAmount: mmProduct.maxAmount,
          commission: mmProduct.commission,
          fixedFee: 0,
          isPromotional: mmProduct.isPromotional || false,
          promotionalDiscount: mmProduct.promotionalDiscount || null,
          priority: 2,
          status: 'active',
          lastSyncedAt: new Date(),
          metadata: {
            mobilemart_product_id: mmProduct.merchantProductId,
            seeded: true,
            seeded_at: new Date().toISOString()
          }
        }
      });

      if (created) {
        mobilemartCreated++;
        console.log(`  ✅ Created: ${mmProduct.productName} (${mmProduct.provider})`);
      } else {
        console.log(`  ℹ️  Exists: ${mmProduct.productName} (${mmProduct.provider})`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(50));
    console.log(`Flash products created:      ${flashCreated}`);
    console.log(`MobileMart products created: ${mobilemartCreated}`);
    console.log(`Total new products:          ${flashCreated + mobilemartCreated}`);
    console.log('='.repeat(50));

    // Verify counts
    const totalVariants = await ProductVariant.count();
    const flashVariants = await ProductVariant.count({ where: { supplierId: flashSupplier.id } });
    const mmVariants = await ProductVariant.count({ where: { supplierId: mobilemartSupplier.id } });

    console.log('\n📈 CURRENT DATABASE STATE');
    console.log('='.repeat(50));
    console.log(`Total ProductVariants:       ${totalVariants}`);
    console.log(`  - Flash variants:          ${flashVariants}`);
    console.log(`  - MobileMart variants:     ${mmVariants}`);
    console.log('='.repeat(50));

    console.log('\n✅ Product seeding completed successfully!');
    console.log('\n💡 Test with: curl https://staging.mymoolah.africa/api/v1/suppliers/compare/airtime');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

// Helper functions
function mapCategoryToVasType(category) {
  const mapping = {
    'airtime': 'airtime',
    'data': 'data',
    'electricity': 'electricity',
    'voucher': 'voucher',
    'bill_payment': 'bill_payment',
    'gaming': 'gaming',
    'streaming': 'streaming'
  };
  return mapping[category.toLowerCase()] || 'voucher';
}

function getTransactionType(vasType) {
  const directTypes = ['airtime', 'data', 'electricity', 'bill_payment'];
  return directTypes.includes(vasType) ? 'direct' : 'voucher';
}

// Run seeding
seedProducts();
