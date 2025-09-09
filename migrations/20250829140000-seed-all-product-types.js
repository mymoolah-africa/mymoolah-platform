'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Seeding all product types with variants...');

    // Get supplier IDs
    const [flashSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'FLASH'"
    );
    
    const [mobilemartSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'MOBILEMART'"
    );

    if (flashSupplier.length === 0 || mobilemartSupplier.length === 0) {
      console.log('Required suppliers not found, skipping product variants seeding');
      return;
    }

    const flashSupplierId = flashSupplier[0].id;
    const mobilemartSupplierId = mobilemartSupplier[0].id;

    // Create brands for different product types
    const brands = [
      // Telecom brands
      { name: 'Cell C', category: 'telecom', tags: ['cellc', 'airtime', 'data'] },
      { name: 'Telkom', category: 'telecom', tags: ['telkom', 'airtime', 'data'] },
      
      // Electricity brands
      { name: 'Eskom', category: 'electricity', tags: ['eskom', 'electricity', 'prepaid'] },
      { name: 'City Power', category: 'electricity', tags: ['citypower', 'electricity', 'prepaid'] },
      { name: 'Ethekwini', category: 'electricity', tags: ['ethekwini', 'electricity', 'prepaid'] },
      
      // Bill payment brands
      { name: 'DStv', category: 'entertainment', tags: ['dstv', 'tv', 'subscription'] },
      { name: 'DSTV Now', category: 'entertainment', tags: ['dstvnow', 'streaming', 'subscription'] },
      { name: 'Showmax', category: 'entertainment', tags: ['showmax', 'streaming', 'subscription'] },
      { name: 'Netflix', category: 'entertainment', tags: ['netflix', 'streaming', 'subscription'] },
      { name: 'Amazon Prime', category: 'entertainment', tags: ['amazonprime', 'streaming', 'subscription'] },
      
      // 3rd Party Digital Vouchers
      { name: 'Steam', category: 'gaming', tags: ['steam', 'gaming', 'digital'] },
      { name: 'PlayStation', category: 'gaming', tags: ['playstation', 'gaming', 'digital'] },
      { name: 'Xbox', category: 'gaming', tags: ['xbox', 'gaming', 'digital'] },
      { name: 'Nintendo', category: 'gaming', tags: ['nintendo', 'gaming', 'digital'] },
      { name: 'Spotify', category: 'music', tags: ['spotify', 'music', 'subscription'] },
      { name: 'Apple Music', category: 'music', tags: ['applemusic', 'music', 'subscription'] },
      { name: 'Google Play', category: 'digital', tags: ['googleplay', 'digital', 'apps'] },
      { name: 'iTunes', category: 'digital', tags: ['itunes', 'digital', 'apps'] },
      { name: 'Uber', category: 'transport', tags: ['uber', 'transport', 'ride'] },
      { name: 'Bolt', category: 'transport', tags: ['bolt', 'transport', 'ride'] }
    ];

    // Create brands
    const createdBrands = [];
    for (const brand of brands) {
      const [existingBrand] = await queryInterface.sequelize.query(
        "SELECT id FROM product_brands WHERE name = ?",
        { replacements: [brand.name] }
      );
      
      if (existingBrand.length === 0) {
        const [newBrand] = await queryInterface.sequelize.query(
          "INSERT INTO product_brands (name, \"logoUrl\", category, tags, \"isActive\", \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, ?, true, NOW(), NOW()) RETURNING id",
          { 
            replacements: [
              brand.name, 
              `/images/brands/${brand.name.toLowerCase().replace(/\s+/g, '')}.png`,
              brand.category,
              JSON.stringify(brand.tags)
            ] 
          }
        );
        createdBrands.push({ id: newBrand[0].id, ...brand });
      } else {
        createdBrands.push({ id: existingBrand[0].id, ...brand });
      }
    }

    console.log(`✅ Created/found ${createdBrands.length} brands`);

    // Create products for all categories
    const products = [
      // Airtime & Data
      { name: 'Cell C Airtime', type: 'airtime', brandName: 'Cell C', category: 'airtime' },
      { name: 'Cell C Data', type: 'data', brandName: 'Cell C', category: 'data' },
      { name: 'Telkom Airtime', type: 'airtime', brandName: 'Telkom', category: 'airtime' },
      { name: 'Telkom Data', type: 'data', brandName: 'Telkom', category: 'data' },
      
      // Electricity
      { name: 'Eskom Prepaid Electricity', type: 'electricity', brandName: 'Eskom', category: 'electricity' },
      { name: 'City Power Prepaid Electricity', type: 'electricity', brandName: 'City Power', category: 'electricity' },
      { name: 'Ethekwini Prepaid Electricity', type: 'electricity', brandName: 'Ethekwini', category: 'electricity' },
      
      // Bill Payments
      { name: 'DStv Subscription', type: 'bill_payment', brandName: 'DStv', category: 'entertainment' },
      { name: 'DSTV Now Subscription', type: 'bill_payment', brandName: 'DSTV Now', category: 'entertainment' },
      { name: 'Showmax Subscription', type: 'bill_payment', brandName: 'Showmax', category: 'entertainment' },
      { name: 'Netflix Subscription', type: 'bill_payment', brandName: 'Netflix', category: 'entertainment' },
      { name: 'Amazon Prime Subscription', type: 'bill_payment', brandName: 'Amazon Prime', category: 'entertainment' },
      
      // 3rd Party Digital Vouchers
      { name: 'Steam Gift Card', type: 'voucher', brandName: 'Steam', category: 'gaming' },
      { name: 'PlayStation Gift Card', type: 'voucher', brandName: 'PlayStation', category: 'gaming' },
      { name: 'Xbox Gift Card', type: 'voucher', brandName: 'Xbox', category: 'gaming' },
      { name: 'Nintendo Gift Card', type: 'voucher', brandName: 'Nintendo', category: 'gaming' },
      { name: 'Spotify Gift Card', type: 'voucher', brandName: 'Spotify', category: 'music' },
      { name: 'Apple Music Gift Card', type: 'voucher', brandName: 'Apple Music', category: 'music' },
      { name: 'Google Play Gift Card', type: 'voucher', brandName: 'Google Play', category: 'digital' },
      { name: 'iTunes Gift Card', type: 'voucher', brandName: 'iTunes', category: 'digital' },
      { name: 'Uber Gift Card', type: 'voucher', brandName: 'Uber', category: 'transport' },
      { name: 'Bolt Gift Card', type: 'voucher', brandName: 'Bolt', category: 'transport' }
    ];

    // Create products
    const createdProducts = [];
    for (const product of products) {
      const brand = createdBrands.find(b => b.name === product.brandName);
      if (!brand) continue;

      const [existingProduct] = await queryInterface.sequelize.query(
        "SELECT id FROM products WHERE name = ?",
        { replacements: [product.name] }
      );
      
      if (existingProduct.length === 0) {
        const [newProduct] = await queryInterface.sequelize.query(
          "INSERT INTO products (name, type, \"brandId\", status, \"isFeatured\", \"sortOrder\", description, category, tags, metadata, \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, 'active', true, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id",
          { 
            replacements: [
              product.name,
              product.type,
              brand.id,
              createdProducts.length + 1,
              `${product.name} service`,
              product.category,
              JSON.stringify([product.category, product.type]),
              JSON.stringify({
                description: `${product.name} service`,
                validity: product.type === 'electricity' ? 'No expiry' : '12 months',
                terms: `Standard ${brand.name} terms apply`
              })
            ] 
          }
        );
        createdProducts.push({ id: newProduct[0].id, ...product, brandId: brand.id });
      } else {
        createdProducts.push({ id: existingProduct[0].id, ...product, brandId: brand.id });
      }
    }

    console.log(`✅ Created/found ${createdProducts.length} products`);

    // Create product variants with different pricing strategies
    const productVariants = [];

    for (const product of createdProducts) {
      // Define denominations based on product type
      let denominations;
      let commissionTiers;
      
      switch (product.type) {
        case 'airtime':
        case 'data':
          denominations = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];
          commissionTiers = [
            { minAmount: 1000, maxAmount: 5000, rate: 3.0 },
            { minAmount: 5001, maxAmount: 20000, rate: 2.5 },
            { minAmount: 20001, maxAmount: 100000, rate: 2.0 },
            { minAmount: 100001, maxAmount: 200000, rate: 1.5 }
          ];
          break;
          
        case 'electricity':
          denominations = [5000, 10000, 20000, 50000, 100000, 200000, 500000];
          commissionTiers = [
            { minAmount: 5000, maxAmount: 20000, rate: 2.5 },
            { minAmount: 20001, maxAmount: 100000, rate: 2.0 },
            { minAmount: 100001, maxAmount: 500000, rate: 1.5 }
          ];
          break;
          
        case 'bill_payment':
          denominations = [10000, 20000, 50000, 100000, 200000, 500000];
          commissionTiers = [
            { minAmount: 10000, maxAmount: 50000, rate: 2.0 },
            { minAmount: 50001, maxAmount: 200000, rate: 1.5 },
            { minAmount: 200001, maxAmount: 500000, rate: 1.0 }
          ];
          break;
          
        case 'voucher':
          denominations = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];
          commissionTiers = [
            { minAmount: 1000, maxAmount: 5000, rate: 4.0 },
            { minAmount: 5001, maxAmount: 20000, rate: 3.5 },
            { minAmount: 20001, maxAmount: 100000, rate: 3.0 },
            { minAmount: 100001, maxAmount: 200000, rate: 2.5 }
          ];
          break;
          
        default:
          denominations = [1000, 2000, 5000, 10000, 20000, 50000];
          commissionTiers = [
            { minAmount: 1000, maxAmount: 5000, rate: 3.0 },
            { minAmount: 5001, maxAmount: 20000, rate: 2.5 },
            { minAmount: 20001, maxAmount: 50000, rate: 2.0 }
          ];
      }

      // Flash variant (lower commission, preferred)
      const flashCommissionTiers = commissionTiers.map(tier => ({
        ...tier,
        rate: tier.rate - 0.5 // Flash gets 0.5% lower commission
      }));

      productVariants.push({
        productId: product.id,
        supplierId: flashSupplierId,
        supplierProductId: `FLASH_${product.name.toUpperCase().replace(/\s+/g, '_')}_001`,
        denominations: JSON.stringify(denominations),
        pricing: JSON.stringify({
          commissionTiers: flashCommissionTiers,
          defaultCommissionRate: flashCommissionTiers[0].rate,
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
          description: `${product.name} via Flash`,
          processingTime: 'Instant',
          reliability: 'High'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // MobileMart variant (higher commission, not preferred)
      const mobilemartCommissionTiers = commissionTiers.map(tier => ({
        ...tier,
        rate: tier.rate + 0.5 // MobileMart gets 0.5% higher commission
      }));

      productVariants.push({
        productId: product.id,
        supplierId: mobilemartSupplierId,
        supplierProductId: `MOBILEMART_${product.name.toUpperCase().replace(/\s+/g, '_')}_001`,
        denominations: JSON.stringify(denominations),
        pricing: JSON.stringify({
          commissionTiers: mobilemartCommissionTiers,
          defaultCommissionRate: mobilemartCommissionTiers[0].rate,
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
          description: `${product.name} via MobileMart`,
          processingTime: 'Instant',
          reliability: 'High'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await queryInterface.bulkInsert('product_variants', productVariants);
    console.log(`✅ Created ${productVariants.length} product variants`);

    console.log('✅ All product types seeded successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back all product types...');

    // Remove the seeded products (this will cascade to variants)
    const productNames = [
      'Cell C Airtime', 'Cell C Data', 'Telkom Airtime', 'Telkom Data',
      'Eskom Prepaid Electricity', 'City Power Prepaid Electricity', 'Ethekwini Prepaid Electricity',
      'DStv Subscription', 'DSTV Now Subscription', 'Showmax Subscription', 'Netflix Subscription', 'Amazon Prime Subscription',
      'Steam Gift Card', 'PlayStation Gift Card', 'Xbox Gift Card', 'Nintendo Gift Card',
      'Spotify Gift Card', 'Apple Music Gift Card', 'Google Play Gift Card', 'iTunes Gift Card',
      'Uber Gift Card', 'Bolt Gift Card'
    ];

    await queryInterface.bulkDelete('products', {
      name: {
        [Sequelize.Op.in]: productNames
      }
    });

    // Remove the seeded brands
    const brandNames = [
      'Cell C', 'Telkom', 'Eskom', 'City Power', 'Ethekwini',
      'DSTV Now', 'Showmax', 'Amazon Prime',
      'Steam', 'PlayStation', 'Xbox', 'Nintendo',
      'Spotify', 'Apple Music', 'Google Play', 'iTunes',
      'Uber', 'Bolt'
    ];

    await queryInterface.bulkDelete('product_brands', {
      name: {
        [Sequelize.Op.in]: brandNames
      }
    });

    console.log('✅ All product types rolled back successfully');
  }
};





