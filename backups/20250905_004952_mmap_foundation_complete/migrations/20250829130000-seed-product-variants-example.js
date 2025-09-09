'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Seeding product variants example...');

    // Get Flash supplier ID
    const [flashSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'FLASH'"
    );
    
    if (flashSupplier.length === 0) {
      console.log('Flash supplier not found, skipping product variants seeding');
      return;
    }

    const flashSupplierId = flashSupplier[0].id;

    // Create MTN and Vodacom brands if they don't exist
    const [mtnBrand] = await queryInterface.sequelize.query(
      "SELECT id FROM product_brands WHERE name = 'MTN'"
    );
    
    let mtnBrandId;
    if (mtnBrand.length === 0) {
      const [newMtnBrand] = await queryInterface.sequelize.query(
        "INSERT INTO product_brands (name, \"logoUrl\", category, tags, \"isActive\", \"createdAt\", \"updatedAt\") VALUES ('MTN', '/images/brands/mtn.png', 'telecom', '[\"mtn\", \"airtime\", \"mobile\"]', true, NOW(), NOW()) RETURNING id"
      );
      mtnBrandId = newMtnBrand[0].id;
    } else {
      mtnBrandId = mtnBrand[0].id;
    }

    const [vodacomBrand] = await queryInterface.sequelize.query(
      "SELECT id FROM product_brands WHERE name = 'Vodacom'"
    );
    
    let vodacomBrandId;
    if (vodacomBrand.length === 0) {
      const [newVodacomBrand] = await queryInterface.sequelize.query(
        "INSERT INTO product_brands (name, \"logoUrl\", category, tags, \"isActive\", \"createdAt\", \"updatedAt\") VALUES ('Vodacom', '/images/brands/vodacom.png', 'telecom', '[\"vodacom\", \"airtime\", \"mobile\"]', true, NOW(), NOW()) RETURNING id"
      );
      vodacomBrandId = newVodacomBrand[0].id;
    } else {
      vodacomBrandId = vodacomBrand[0].id;
    }

    // Create MobileMart supplier if it doesn't exist
    const [mobilemartSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'MOBILEMART'"
    );

    let mobilemartSupplierId;
    if (mobilemartSupplier.length === 0) {
      const [newMobilemart] = await queryInterface.sequelize.query(
        "INSERT INTO suppliers (name, code, \"isActive\", \"createdAt\", \"updatedAt\") VALUES ('MobileMart', 'MOBILEMART', true, NOW(), NOW()) RETURNING id"
      );
      mobilemartSupplierId = newMobilemart[0].id;
    } else {
      mobilemartSupplierId = mobilemartSupplier[0].id;
    }

    // Create example products
    const products = [
      {
        name: 'MTN Airtime',
        type: 'airtime',
        brandId: mtnBrandId,
        status: 'active',
        isFeatured: true,
        sortOrder: 1,
        description: 'MTN mobile airtime top-up',
        category: 'airtime',
        tags: JSON.stringify(['mtn', 'airtime', 'mobile']),
        metadata: JSON.stringify({
          description: 'MTN mobile airtime top-up service',
          validity: 'No expiry',
          terms: 'Standard MTN terms apply'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Vodacom Airtime',
        type: 'airtime',
        brandId: vodacomBrandId,
        status: 'active',
        isFeatured: true,
        sortOrder: 2,
        description: 'Vodacom mobile airtime top-up',
        category: 'airtime',
        tags: JSON.stringify(['vodacom', 'airtime', 'mobile']),
        metadata: JSON.stringify({
          description: 'Vodacom mobile airtime top-up service',
          validity: 'No expiry',
          terms: 'Standard Vodacom terms apply'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const insertedProducts = await queryInterface.bulkInsert('products', products, { returning: true });
    console.log(`✅ Created ${insertedProducts.length} products`);

    // Create product variants with different pricing
    const productVariants = [];

    // MTN Airtime variants
    const mtnProductId = insertedProducts[0].id;
    
    // Flash variant - R10.00 with 3.0% commission
    productVariants.push({
      productId: mtnProductId,
      supplierId: flashSupplierId,
      supplierProductId: 'FLASH_MTN_AIRTIME_001',
      denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000, 50000]),
      pricing: JSON.stringify({
        commissionTiers: [
          { minAmount: 1000, maxAmount: 5000, rate: 3.0 },
          { minAmount: 5001, maxAmount: 20000, rate: 2.5 },
          { minAmount: 20001, maxAmount: 50000, rate: 2.0 }
        ],
        defaultCommissionRate: 3.0,
        fees: {
          processingFee: 0,
          serviceFee: 0
        }
      }),
      constraints: JSON.stringify({
        minAmount: 1000,
        maxAmount: 50000,
        dailyLimit: 100000,
        monthlyLimit: 1000000
      }),
      status: 'active',
      isPreferred: true,
      sortOrder: 1,
      metadata: JSON.stringify({
        description: 'MTN airtime via Flash',
        processingTime: 'Instant',
        reliability: 'High'
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // MobileMart variant - R10.00 with 3.5% commission
    productVariants.push({
      productId: mtnProductId,
      supplierId: mobilemartSupplierId,
      supplierProductId: 'MOBILEMART_MTN_AIRTIME_001',
      denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000, 50000]),
      pricing: JSON.stringify({
        commissionTiers: [
          { minAmount: 1000, maxAmount: 5000, rate: 3.5 },
          { minAmount: 5001, maxAmount: 20000, rate: 3.0 },
          { minAmount: 20001, maxAmount: 50000, rate: 2.5 }
        ],
        defaultCommissionRate: 3.5,
        fees: {
          processingFee: 50, // R0.50 processing fee
          serviceFee: 0
        }
      }),
      constraints: JSON.stringify({
        minAmount: 1000,
        maxAmount: 50000,
        dailyLimit: 100000,
        monthlyLimit: 1000000
      }),
      status: 'active',
      isPreferred: false,
      sortOrder: 2,
      metadata: JSON.stringify({
        description: 'MTN airtime via MobileMart',
        processingTime: 'Instant',
        reliability: 'High'
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Vodacom Airtime variants
    const vodacomProductId = insertedProducts[1].id;
    
    // Flash variant - R10.00 with 2.8% commission
    productVariants.push({
      productId: vodacomProductId,
      supplierId: flashSupplierId,
      supplierProductId: 'FLASH_VODACOM_AIRTIME_001',
      denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000, 50000]),
      pricing: JSON.stringify({
        commissionTiers: [
          { minAmount: 1000, maxAmount: 5000, rate: 2.8 },
          { minAmount: 5001, maxAmount: 20000, rate: 2.3 },
          { minAmount: 20001, maxAmount: 50000, rate: 1.8 }
        ],
        defaultCommissionRate: 2.8,
        fees: {
          processingFee: 0,
          serviceFee: 0
        }
      }),
      constraints: JSON.stringify({
        minAmount: 1000,
        maxAmount: 50000,
        dailyLimit: 100000,
        monthlyLimit: 1000000
      }),
      status: 'active',
      isPreferred: true,
      sortOrder: 1,
      metadata: JSON.stringify({
        description: 'Vodacom airtime via Flash',
        processingTime: 'Instant',
        reliability: 'High'
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // MobileMart variant - R10.00 with 3.2% commission
    productVariants.push({
      productId: vodacomProductId,
      supplierId: mobilemartSupplierId,
      supplierProductId: 'MOBILEMART_VODACOM_AIRTIME_001',
      denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000, 50000]),
      pricing: JSON.stringify({
        commissionTiers: [
          { minAmount: 1000, maxAmount: 5000, rate: 3.2 },
          { minAmount: 5001, maxAmount: 20000, rate: 2.7 },
          { minAmount: 20001, maxAmount: 50000, rate: 2.2 }
        ],
        defaultCommissionRate: 3.2,
        fees: {
          processingFee: 50, // R0.50 processing fee
          serviceFee: 0
        }
      }),
      constraints: JSON.stringify({
        minAmount: 1000,
        maxAmount: 50000,
        dailyLimit: 100000,
        monthlyLimit: 1000000
      }),
      status: 'active',
      isPreferred: false,
      sortOrder: 2,
      metadata: JSON.stringify({
        description: 'Vodacom airtime via MobileMart',
        processingTime: 'Instant',
        reliability: 'High'
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await queryInterface.bulkInsert('product_variants', productVariants);
    console.log(`✅ Created ${productVariants.length} product variants`);

    console.log('✅ Product variants example seeded successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back product variants example...');

    // Remove the seeded products (this will cascade to variants)
    await queryInterface.bulkDelete('products', {
      name: {
        [Sequelize.Op.in]: ['MTN Airtime', 'Vodacom Airtime']
      }
    });

    console.log('✅ Product variants example rolled back successfully');
  }
};
