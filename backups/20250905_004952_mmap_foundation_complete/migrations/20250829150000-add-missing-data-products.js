'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Adding missing MTN Data and Vodacom Data products...');

    // Get supplier IDs
    const [flashSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'FLASH'"
    );
    
    const [mobilemartSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'MOBILEMART'"
    );

    if (flashSupplier.length === 0 || mobilemartSupplier.length === 0) {
      console.log('Required suppliers not found, skipping data products seeding');
      return;
    }

    const flashSupplierId = flashSupplier[0].id;
    const mobilemartSupplierId = mobilemartSupplier[0].id;

    // Get MTN and Vodacom brand IDs
    const [mtnBrand] = await queryInterface.sequelize.query(
      "SELECT id FROM product_brands WHERE name = 'MTN'"
    );
    
    const [vodacomBrand] = await queryInterface.sequelize.query(
      "SELECT id FROM product_brands WHERE name = 'Vodacom'"
    );

    if (mtnBrand.length === 0 || vodacomBrand.length === 0) {
      console.log('MTN or Vodacom brands not found, skipping data products seeding');
      return;
    }

    const mtnBrandId = mtnBrand[0].id;
    const vodacomBrandId = vodacomBrand[0].id;

    // Create MTN Data and Vodacom Data products
    const dataProducts = [
      {
        name: 'MTN Data',
        type: 'data',
        brandId: mtnBrandId,
        description: 'MTN mobile data bundles',
        category: 'data',
        tags: JSON.stringify(['mtn', 'data', 'mobile']),
        metadata: JSON.stringify({
          description: 'MTN mobile data bundle service',
          validity: 'No expiry',
          terms: 'Standard MTN terms apply'
        }),
        isFeatured: true,
        sortOrder: 15
      },
      {
        name: 'Vodacom Data',
        type: 'data',
        brandId: vodacomBrandId,
        description: 'Vodacom mobile data bundles',
        category: 'data',
        tags: JSON.stringify(['vodacom', 'data', 'mobile']),
        metadata: JSON.stringify({
          description: 'Vodacom mobile data bundle service',
          validity: 'No expiry',
          terms: 'Standard Vodacom terms apply'
        }),
        isFeatured: true,
        sortOrder: 16
      }
    ];

    // Create products
    const createdProducts = [];
    for (const product of dataProducts) {
      const [existingProduct] = await queryInterface.sequelize.query(
        "SELECT id FROM products WHERE name = ?",
        { replacements: [product.name] }
      );
      
      if (existingProduct.length === 0) {
        const [newProduct] = await queryInterface.sequelize.query(
          "INSERT INTO products (name, type, \"brandId\", status, \"isFeatured\", \"sortOrder\", description, category, tags, metadata, \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id",
          { 
            replacements: [
              product.name,
              product.type,
              product.brandId,
              product.isFeatured,
              product.sortOrder,
              product.description,
              product.category,
              product.tags,
              product.metadata
            ] 
          }
        );
        createdProducts.push({ id: newProduct[0].id, ...product });
        console.log(`✅ Created product: ${product.name}`);
      } else {
        createdProducts.push({ id: existingProduct[0].id, ...product });
        console.log(`ℹ️  Product already exists: ${product.name}`);
      }
    }

    // Create product variants for data products
    const dataDenominations = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];
    const dataCommissionTiers = [
      { minAmount: 1000, maxAmount: 5000, rate: 3.0 },
      { minAmount: 5001, maxAmount: 20000, rate: 2.5 },
      { minAmount: 20001, maxAmount: 100000, rate: 2.0 },
      { minAmount: 100001, maxAmount: 200000, rate: 1.5 }
    ];

    const productVariants = [];

    for (const product of createdProducts) {
      // Flash variant (lower commission, preferred)
      const flashCommissionTiers = dataCommissionTiers.map(tier => ({
        ...tier,
        rate: tier.rate - 0.5 // Flash gets 0.5% lower commission
      }));

      productVariants.push({
        productId: product.id,
        supplierId: flashSupplierId,
        supplierProductId: `FLASH_${product.name.toUpperCase().replace(/\s+/g, '_')}_001`,
        denominations: JSON.stringify(dataDenominations),
        pricing: JSON.stringify({
          commissionTiers: flashCommissionTiers,
          defaultCommissionRate: flashCommissionTiers[0].rate,
          fees: {
            processingFee: 0,
            serviceFee: 0
          }
        }),
        constraints: JSON.stringify({
          minAmount: dataDenominations[0],
          maxAmount: dataDenominations[dataDenominations.length - 1],
          dailyLimit: dataDenominations[dataDenominations.length - 1] * 10,
          monthlyLimit: dataDenominations[dataDenominations.length - 1] * 100
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
      const mobilemartCommissionTiers = dataCommissionTiers.map(tier => ({
        ...tier,
        rate: tier.rate + 0.5 // MobileMart gets 0.5% higher commission
      }));

      productVariants.push({
        productId: product.id,
        supplierId: mobilemartSupplierId,
        supplierProductId: `MOBILEMART_${product.name.toUpperCase().replace(/\s+/g, '_')}_001`,
        denominations: JSON.stringify(dataDenominations),
        pricing: JSON.stringify({
          commissionTiers: mobilemartCommissionTiers,
          defaultCommissionRate: mobilemartCommissionTiers[0].rate,
          fees: {
            processingFee: 50, // R0.50 processing fee
            serviceFee: 0
          }
        }),
        constraints: JSON.stringify({
          minAmount: dataDenominations[0],
          maxAmount: dataDenominations[dataDenominations.length - 1],
          dailyLimit: dataDenominations[dataDenominations.length - 1] * 10,
          monthlyLimit: dataDenominations[dataDenominations.length - 1] * 100
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
    console.log(`✅ Created ${productVariants.length} product variants for data products`);

    console.log('✅ MTN Data and Vodacom Data products added successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back MTN Data and Vodacom Data products...');

    // Remove the data products (this will cascade to variants)
    const productNames = ['MTN Data', 'Vodacom Data'];

    await queryInterface.bulkDelete('products', {
      name: {
        [Sequelize.Op.in]: productNames
      }
    });

    console.log('✅ MTN Data and Vodacom Data products rolled back successfully');
  }
};





