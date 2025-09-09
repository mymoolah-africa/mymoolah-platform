'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Adding Flash billing partners from Annexure B...');

    // Get supplier IDs
    const [flashSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'FLASH'"
    );
    
    const [mobilemartSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'MOBILEMART'"
    );

    if (flashSupplier.length === 0 || mobilemartSupplier.length === 0) {
      console.log('Required suppliers not found, skipping billing partners addition');
      return;
    }

    const flashSupplierId = flashSupplier[0].id;
    const mobilemartSupplierId = mobilemartSupplier[0].id;

    // Define all Flash billing partners from Annexure B
    const billingPartners = [
      // Municipalities
      { name: 'Buffalo City', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Drakenstein', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Ditsobolta', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Ngwathe', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Swarland', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Polokwane', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'George', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Saldanha', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Dihlabeng', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Kokstad', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Dr Beyers Naude', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Rochester', category: 'municipality', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      
      // Retail Stores
      { name: 'Ackermans', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Pep', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Dunns', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'ShoeCity', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Tekkie Town', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Refinery', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Incredible Connection', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'HiFiCorp', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Russells', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Bradlows', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Sleepmasters', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Timbercity', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Furniture Warehouse', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Electric Express', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Joshua Doore', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'PennyPinchers', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 },
      { name: 'Bed & Lounge', category: 'retail', type: 'bill_payment', flashCommission: 2.50, mobilemartCommission: 3.00 }
    ];

    // Create brands for billing partners
    for (const partner of billingPartners) {
      const [existingBrand] = await queryInterface.sequelize.query(
        "SELECT id FROM product_brands WHERE name = ?",
        { replacements: [partner.name] }
      );
      
      if (existingBrand.length === 0) {
        await queryInterface.sequelize.query(
          "INSERT INTO product_brands (name, \"logoUrl\", category, tags, \"isActive\", \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, ?, true, NOW(), NOW())",
          { 
            replacements: [
              partner.name, 
              `/images/brands/${partner.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.png`,
              partner.category,
              JSON.stringify([partner.category, 'bill_payment', 'flash_partner'])
            ] 
          }
        );
        console.log(`✅ Created brand: ${partner.name}`);
      }
    }

    // Get all brand IDs
    const [allBrands] = await queryInterface.sequelize.query(
      "SELECT id, name FROM product_brands WHERE \"isActive\" = true"
    );
    const brandMap = {};
    allBrands.forEach(brand => {
      brandMap[brand.name] = brand.id;
    });

    // Create products for billing partners
    for (const partner of billingPartners) {
      const brandId = brandMap[partner.name];
      if (!brandId) {
        console.log(`⚠️  Brand not found: ${partner.name}, skipping product`);
        continue;
      }

      // Check if product exists
      const [existingProduct] = await queryInterface.sequelize.query(
        "SELECT id FROM products WHERE name = ?",
        { replacements: [`${partner.name} Payment`] }
      );

      if (existingProduct.length === 0) {
        // Create product
        const [newProduct] = await queryInterface.sequelize.query(
          "INSERT INTO products (name, type, \"brandId\", status, \"isFeatured\", \"sortOrder\", description, category, tags, metadata, \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, 'active', true, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id",
          { 
            replacements: [
              `${partner.name} Payment`,
              partner.type,
              brandId,
              Math.floor(Math.random() * 100) + 50, // Random sort order
              `${partner.name} bill payment service`,
              partner.category,
              JSON.stringify([partner.category, 'bill_payment', 'flash_partner']),
              JSON.stringify({
                description: `${partner.name} bill payment service via Flash`,
                validity: 'No expiry',
                terms: `Standard ${partner.name} terms apply`
              })
            ] 
          }
        );
        console.log(`✅ Created product: ${partner.name} Payment`);
        
        // Create product variants
        await this.createProductVariants(queryInterface, newProduct[0].id, partner, flashSupplierId, mobilemartSupplierId);
      } else {
        console.log(`ℹ️  Product already exists: ${partner.name} Payment`);
      }
    }

    console.log('✅ Flash billing partners added successfully');
  },

  async createProductVariants(queryInterface, productId, partner, flashSupplierId, mobilemartSupplierId) {
    // Define denominations for bill payments
    const denominations = [10000, 20000, 50000, 100000, 200000, 500000];
    
    // Flash variant (preferred)
    const flashVariant = {
      productId: productId,
      supplierId: flashSupplierId,
      supplierProductId: `FLASH_${partner.name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')}_001`,
      denominations: JSON.stringify(denominations),
      pricing: JSON.stringify({
        commissionTiers: [
          {
            minAmount: denominations[0],
            maxAmount: denominations[denominations.length - 1],
            rate: partner.flashCommission
          }
        ],
        defaultCommissionRate: partner.flashCommission,
        fees: {
          processingFee: 0,
          serviceFee: 0
        }
      }),
      constraints: JSON.stringify({
        minAmount: denominations[0],
        maxAmount: denominations[denominations.length - 1],
        dailyLimit: denominations[denominations.length - 1] * 10,
        monthlyLimit: denominations[denominations.length - 1] * 100
      }),
      status: 'active',
      isPreferred: true,
      sortOrder: 1,
      metadata: JSON.stringify({
        description: `${partner.name} Payment via Flash`,
        processingTime: 'Instant',
        reliability: 'High'
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // MobileMart variant (not preferred)
    const mobilemartVariant = {
      productId: productId,
      supplierId: mobilemartSupplierId,
      supplierProductId: `MOBILEMART_${partner.name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')}_001`,
      denominations: JSON.stringify(denominations),
      pricing: JSON.stringify({
        commissionTiers: [
          {
            minAmount: denominations[0],
            maxAmount: denominations[denominations.length - 1],
            rate: partner.mobilemartCommission
          }
        ],
        defaultCommissionRate: partner.mobilemartCommission,
        fees: {
          processingFee: 50, // R0.50 processing fee
          serviceFee: 0
        }
      }),
      constraints: JSON.stringify({
        minAmount: denominations[0],
        maxAmount: denominations[denominations.length - 1],
        dailyLimit: denominations[denominations.length - 1] * 10,
        monthlyLimit: denominations[denominations.length - 1] * 100
      }),
      status: 'active',
      isPreferred: false,
      sortOrder: 2,
      metadata: JSON.stringify({
        description: `${partner.name} Payment via MobileMart`,
        processingTime: 'Instant',
        reliability: 'High'
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await queryInterface.bulkInsert('product_variants', [flashVariant, mobilemartVariant]);
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back Flash billing partners...');

    // Remove the billing partner products (this will cascade to variants)
    const billingPartnerNames = [
      'Buffalo City Payment', 'Drakenstein Payment', 'Ditsobolta Payment', 'Ngwathe Payment',
      'Swarland Payment', 'Polokwane Payment', 'George Payment', 'Saldanha Payment',
      'Dihlabeng Payment', 'Kokstad Payment', 'Dr Beyers Naude Payment', 'Rochester Payment',
      'Ackermans Payment', 'Pep Payment', 'Dunns Payment', 'ShoeCity Payment',
      'Tekkie Town Payment', 'Refinery Payment', 'Incredible Connection Payment',
      'HiFiCorp Payment', 'Russells Payment', 'Bradlows Payment', 'Sleepmasters Payment',
      'Timbercity Payment', 'Furniture Warehouse Payment', 'Electric Express Payment',
      'Joshua Doore Payment', 'PennyPinchers Payment', 'Bed & Lounge Payment'
    ];

    await queryInterface.bulkDelete('products', {
      name: {
        [Sequelize.Op.in]: billingPartnerNames
      }
    });

    // Remove the billing partner brands
    const billingPartnerBrands = [
      'Buffalo City', 'Drakenstein', 'Ditsobolta', 'Ngwathe', 'Swarland', 'Polokwane',
      'George', 'Saldanha', 'Dihlabeng', 'Kokstad', 'Dr Beyers Naude', 'Rochester',
      'Ackermans', 'Pep', 'Dunns', 'ShoeCity', 'Tekkie Town', 'Refinery',
      'Incredible Connection', 'HiFiCorp', 'Russells', 'Bradlows', 'Sleepmasters',
      'Timbercity', 'Furniture Warehouse', 'Electric Express', 'Joshua Doore',
      'PennyPinchers', 'Bed & Lounge'
    ];

    await queryInterface.bulkDelete('product_brands', {
      name: {
        [Sequelize.Op.in]: billingPartnerBrands
      }
    });

    console.log('✅ Flash billing partners rolled back successfully');
  }
};



