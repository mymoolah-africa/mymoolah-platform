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
 * @date 2025-12-12
 */

const db = require('../models');
const { Product, ProductVariant, ProductBrand, Supplier } = db;

// Sample products data
const sampleProducts = {
  flash: [
    {
      productCode: 'FL-AIR-MTN-001',
      productName: 'MTN Airtime',
      category: 'airtime',
      provider: 'MTN',
      minAmount: 500,
      maxAmount: 100000,
      denominations: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
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
      denominations: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
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
      denominations: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
      commission: 2.0,
      isActive: true,
      isPromotional: true,
      promotionalDiscount: 3.0
    },
    {
      productCode: 'FL-DATA-MTN-001',
      productName: 'MTN Data Bundle',
      category: 'data',
      provider: 'MTN',
      minAmount: 1000,
      maxAmount: 200000,
      denominations: [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000],
      commission: 3.0,
      isActive: true,
      isPromotional: false
    },
    {
      productCode: 'FL-ELEC-001',
      productName: 'Prepaid Electricity',
      category: 'electricity',
      provider: 'Eskom',
      minAmount: 1000,
      maxAmount: 500000,
      denominations: [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000],
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
      denominations: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
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
      denominations: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
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
      denominations: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
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
      denominations: [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000],
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
      denominations: [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000],
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
      denominations: [5000, 10000, 20000, 50000, 100000],
      commission: 4.0,
      isActive: true,
      isPromotional: true,
      promotionalDiscount: 2.0
    },
    {
      merchantProductId: 'MM-VOUCH-HB-001',
      productName: 'Hollywood Bets Voucher',
      vasType: 'voucher',
      provider: 'Hollywood Bets',
      minAmount: 500,
      maxAmount: 100000,
      denominations: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
      commission: 3.5,
      isActive: true,
      isPromotional: false
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
        isActive: true
      }
    });
    console.log(`📦 Flash Supplier ID: ${flashSupplier.id}`);

    // Create or get MobileMart supplier
    const [mobilemartSupplier] = await Supplier.findOrCreate({
      where: { code: 'MOBILEMART' },
      defaults: {
        name: 'MobileMart',
        code: 'MOBILEMART',
        isActive: true
      }
    });
    console.log(`📦 MobileMart Supplier ID: ${mobilemartSupplier.id}\n`);

    // Create or get default brands
    const brandDefaults = [
      { name: 'MTN', category: 'telecom' },
      { name: 'Vodacom', category: 'telecom' },
      { name: 'Cell C', category: 'telecom' },
      { name: 'Telkom', category: 'telecom' },
      { name: 'Eskom', category: 'utilities' },
      { name: 'Takealot', category: 'retail' },
      { name: 'Hollywood Bets', category: 'entertainment' }
    ];

    const brandMap = {};
    console.log('🏷️  Creating brands...');
    for (const brandDef of brandDefaults) {
      const [brand] = await ProductBrand.findOrCreate({
        where: { name: brandDef.name },
        defaults: {
          name: brandDef.name,
          category: brandDef.category,
          isActive: true
        }
      });
      brandMap[brandDef.name] = brand.id;
      console.log(`  ✅ Brand: ${brandDef.name} (ID: ${brand.id})`);
    }
    console.log('');

    let flashCreated = 0;
    let mobilemartCreated = 0;

    // Seed Flash products
    console.log('📱 Seeding Flash products...');
    for (const flashProduct of sampleProducts.flash) {
      const vasType = mapCategoryToVasType(flashProduct.category);
      const brandId = brandMap[flashProduct.provider] || brandMap['MTN'];
      
      // Check if product already exists
      const existingProduct = await Product.findOne({
        where: { 
          name: flashProduct.productName,
          supplierId: flashSupplier.id
        }
      });

      let product;
      if (existingProduct) {
        product = existingProduct;
        console.log(`  ℹ️  Product exists: ${flashProduct.productName}`);
      } else {
        // Create base product
        product = await Product.create({
          name: flashProduct.productName,
          type: vasType,
          supplierId: flashSupplier.id,
          brandId: brandId,
          supplierProductId: flashProduct.productCode,
          denominations: flashProduct.denominations,
          status: 'active',
          isFeatured: flashProduct.isPromotional || false,
          sortOrder: 0,
          metadata: { source: 'flash', seeded: true }
        });
        console.log(`  ✅ Created product: ${flashProduct.productName}`);
      }

      // Check if variant exists
      const existingVariant = await ProductVariant.findOne({
        where: {
          productId: product.id,
          supplierId: flashSupplier.id
        }
      });

      if (!existingVariant) {
        await ProductVariant.create({
          productId: product.id,
          supplierId: flashSupplier.id,
          supplierProductId: flashProduct.productCode,
          vasType: vasType,
          transactionType: getTransactionType(vasType),
          provider: flashProduct.provider,
          minAmount: flashProduct.minAmount,
          maxAmount: flashProduct.maxAmount,
          predefinedAmounts: flashProduct.denominations,
          denominations: flashProduct.denominations,
          commission: flashProduct.commission,
          fixedFee: 0,
          isPromotional: flashProduct.isPromotional || false,
          promotionalDiscount: flashProduct.promotionalDiscount || null,
          priority: 1,
          status: 'active',
          lastSyncedAt: new Date(),
          metadata: {
            flash_product_code: flashProduct.productCode,
            seeded: true
          }
        });
        flashCreated++;
        console.log(`  ✅ Created variant: ${flashProduct.productName} (${flashProduct.provider})`);
      } else {
        console.log(`  ℹ️  Variant exists: ${flashProduct.productName} (${flashProduct.provider})`);
      }
    }

    // Seed MobileMart products
    console.log('\n📱 Seeding MobileMart products...');
    for (const mmProduct of sampleProducts.mobilemart) {
      const vasType = mmProduct.vasType;
      const brandId = brandMap[mmProduct.provider] || brandMap['MTN'];
      
      // Check if product already exists for this supplier
      const existingProduct = await Product.findOne({
        where: { 
          name: mmProduct.productName,
          supplierId: mobilemartSupplier.id
        }
      });

      let product;
      if (existingProduct) {
        product = existingProduct;
        console.log(`  ℹ️  Product exists: ${mmProduct.productName}`);
      } else {
        // Create base product
        product = await Product.create({
          name: mmProduct.productName,
          type: vasType,
          supplierId: mobilemartSupplier.id,
          brandId: brandId,
          supplierProductId: mmProduct.merchantProductId,
          denominations: mmProduct.denominations,
          status: 'active',
          isFeatured: mmProduct.isPromotional || false,
          sortOrder: 0,
          metadata: { source: 'mobilemart', seeded: true }
        });
        console.log(`  ✅ Created product: ${mmProduct.productName}`);
      }

      // Check if variant exists
      const existingVariant = await ProductVariant.findOne({
        where: {
          productId: product.id,
          supplierId: mobilemartSupplier.id
        }
      });

      if (!existingVariant) {
        await ProductVariant.create({
          productId: product.id,
          supplierId: mobilemartSupplier.id,
          supplierProductId: mmProduct.merchantProductId,
          vasType: vasType,
          transactionType: getTransactionType(vasType),
          provider: mmProduct.provider,
          minAmount: mmProduct.minAmount,
          maxAmount: mmProduct.maxAmount,
          predefinedAmounts: mmProduct.denominations,
          denominations: mmProduct.denominations,
          commission: mmProduct.commission,
          fixedFee: 0,
          isPromotional: mmProduct.isPromotional || false,
          promotionalDiscount: mmProduct.promotionalDiscount || null,
          priority: 2,
          status: 'active',
          lastSyncedAt: new Date(),
          metadata: {
            mobilemart_product_id: mmProduct.merchantProductId,
            seeded: true
          }
        });
        mobilemartCreated++;
        console.log(`  ✅ Created variant: ${mmProduct.productName} (${mmProduct.provider})`);
      } else {
        console.log(`  ℹ️  Variant exists: ${mmProduct.productName} (${mmProduct.provider})`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(50));
    console.log(`Flash variants created:      ${flashCreated}`);
    console.log(`MobileMart variants created: ${mobilemartCreated}`);
    console.log(`Total new variants:          ${flashCreated + mobilemartCreated}`);
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
    'bill_payment': 'bill_payment'
  };
  return mapping[category.toLowerCase()] || 'voucher';
}

function getTransactionType(vasType) {
  const directTypes = ['airtime', 'data', 'electricity', 'bill_payment'];
  return directTypes.includes(vasType) ? 'direct' : 'voucher';
}

// Run seeding
seedProducts();
