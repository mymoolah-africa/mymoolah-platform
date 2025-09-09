'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Adding Flash electricity partners from Annexure C...');

    // Get supplier IDs
    const [flashSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'FLASH'"
    );
    
    const [mobilemartSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'MOBILEMART'"
    );

    if (flashSupplier.length === 0 || mobilemartSupplier.length === 0) {
      console.log('Required suppliers not found, skipping electricity partners addition');
      return;
    }

    const flashSupplierId = flashSupplier[0].id;
    const mobilemartSupplierId = mobilemartSupplier[0].id;

    // Define all Flash electricity partners from Annexure C
    // Excluding: Eskom, City Power, Ethekwini, Ekurhuleni (already exist)
    const electricityPartners = [
      // Metropolitan Municipalities
      { name: 'Centlec (Mangaung)', category: 'metropolitan', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'City of Cape Town', category: 'metropolitan', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      
      // Local Municipalities
      { name: 'Albert Luthuli', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'BelaBela', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Dikgatlong', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Ditsobotla', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Emakhazeni', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Emalahleni (Witbank)', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Ephraim Mogale (Marblehall)', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'GaSegonyana', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Govan Mbeki', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Greater Letaba', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Kgatelopele', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Kgethlengrivier', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Kokstad', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Langeberg', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Lesedi', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Lukhanji (Enoch Mugijima)', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Madibeng', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Mafube (water)', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Magareng', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Mandeni', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Mantsopa', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Matzikama', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Maquassi Hills', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Mbizana (Winnie Madikizela-Mandela)', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Mpofana', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Musina', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Naledi', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Phalaborwa', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Siyathemba', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Swellendam', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Thaba Chweu', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Thembelihle', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Tsantsabane', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Tswaing', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Umsobomvu', category: 'local', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      
      // District Municipalities
      { name: 'Uthukela District (Water)', category: 'district', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Uthukela Dictrict (Electricity)', category: 'district', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      
      // Private Utilities
      { name: 'Afhco', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Applied Metering Innovation', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Blueberry', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Broham', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'BVTechSA', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Citiq', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Conlog SLICE – Mapule', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'DA Metering', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'EGS', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Energy Intelligence Consortium', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'GRC Systems', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Hbros', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Ideal Prepaid', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'IS Metering', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Itron PU', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'JMflowsort', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Jager', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'KK Prepaid', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Landis', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'LIC', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'LiveWire', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'LL Energy', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Meter Man', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Meter Shack', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Metro Prepaid', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Mid-City', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'MSI', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'My Voltage', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'NetVendor', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'PEC Cape Town', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'PEC Bloemfontein', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'PEC Gauteng', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'PMD (Power Measurement)', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Prepay Metering', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Protea Meter', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Ratcom (Mabcom Metering)', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Recharger', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Ruvick Energy', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Smart E Power', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Smartpowersa (Konta Metering)', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Unique Solutions', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'UU Solutions', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Youtility_Actom', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Youtility_Inceku', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Youtility_Pioneer', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Youtility_Proadmin', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Youtility_Umfa', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Uvend', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 },
      { name: 'Vula', category: 'private', type: 'electricity', flashCommission: 0.85, mobilemartCommission: 1.35 }
    ];

    // Create brands for electricity partners
    for (const partner of electricityPartners) {
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
              `/images/brands/${partner.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').replace(/[()]/g, '')}.png`,
              partner.category,
              JSON.stringify([partner.category, 'electricity', 'flash_partner'])
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

    // Create products for electricity partners
    for (const partner of electricityPartners) {
      const brandId = brandMap[partner.name];
      if (!brandId) {
        console.log(`⚠️  Brand not found: ${partner.name}, skipping product`);
        continue;
      }

      // Check if product exists
      const [existingProduct] = await queryInterface.sequelize.query(
        "SELECT id FROM products WHERE name = ?",
        { replacements: [`${partner.name} Electricity`] }
      );

      if (existingProduct.length === 0) {
        // Create product
        const [newProduct] = await queryInterface.sequelize.query(
          "INSERT INTO products (name, type, \"brandId\", status, \"isFeatured\", \"sortOrder\", description, category, tags, metadata, \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, 'active', true, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id",
          { 
            replacements: [
              `${partner.name} Electricity`,
              partner.type,
              brandId,
              Math.floor(Math.random() * 100) + 50, // Random sort order
              `${partner.name} electricity service`,
              partner.category,
              JSON.stringify([partner.category, 'electricity', 'flash_partner']),
              JSON.stringify({
                description: `${partner.name} electricity service via Flash`,
                validity: 'No expiry',
                terms: `Standard ${partner.name} terms apply`
              })
            ] 
          }
        );
        console.log(`✅ Created product: ${partner.name} Electricity`);
        
        // Create product variants
        await this.createProductVariants(queryInterface, newProduct[0].id, partner, flashSupplierId, mobilemartSupplierId);
      } else {
        console.log(`ℹ️  Product already exists: ${partner.name} Electricity`);
      }
    }

    console.log('✅ Flash electricity partners added successfully');
  },

  async createProductVariants(queryInterface, productId, partner, flashSupplierId, mobilemartSupplierId) {
    // Define denominations for electricity (higher amounts)
    const denominations = [5000, 10000, 20000, 50000, 100000, 200000, 500000];
    
    // Flash variant (preferred)
    const flashVariant = {
      productId: productId,
      supplierId: flashSupplierId,
      supplierProductId: `FLASH_${partner.name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').replace(/[()]/g, '')}_001`,
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
        description: `${partner.name} Electricity via Flash`,
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
      supplierProductId: `MOBILEMART_${partner.name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').replace(/[()]/g, '')}_001`,
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
        description: `${partner.name} Electricity via MobileMart`,
        processingTime: 'Instant',
        reliability: 'High'
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await queryInterface.bulkInsert('product_variants', [flashVariant, mobilemartVariant]);
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back Flash electricity partners...');

    // Remove the electricity partner products (this will cascade to variants)
    const electricityPartnerNames = [
      'Centlec (Mangaung) Electricity', 'City of Cape Town Electricity',
      'Albert Luthuli Electricity', 'BelaBela Electricity', 'Dikgatlong Electricity',
      'Ditsobotla Electricity', 'Emakhazeni Electricity', 'Emalahleni (Witbank) Electricity',
      'Ephraim Mogale (Marblehall) Electricity', 'GaSegonyana Electricity',
      'Govan Mbeki Electricity', 'Greater Letaba Electricity', 'Kgatelopele Electricity',
      'Kgethlengrivier Electricity', 'Kokstad Electricity', 'Langeberg Electricity',
      'Lesedi Electricity', 'Lukhanji (Enoch Mugijima) Electricity', 'Madibeng Electricity',
      'Mafube (water) Electricity', 'Magareng Electricity', 'Mandeni Electricity',
      'Mantsopa Electricity', 'Matzikama Electricity', 'Maquassi Hills Electricity',
      'Mbizana (Winnie Madikizela-Mandela) Electricity', 'Mpofana Electricity',
      'Musina Electricity', 'Naledi Electricity', 'Phalaborwa Electricity',
      'Siyathemba Electricity', 'Swellendam Electricity', 'Thaba Chweu Electricity',
      'Thembelihle Electricity', 'Tsantsabane Electricity', 'Tswaing Electricity',
      'Umsobomvu Electricity', 'Uthukela District (Water) Electricity',
      'Uthukela Dictrict (Electricity) Electricity', 'Afhco Electricity',
      'Applied Metering Innovation Electricity', 'Blueberry Electricity',
      'Broham Electricity', 'BVTechSA Electricity', 'Citiq Electricity',
      'Conlog SLICE – Mapule Electricity', 'DA Metering Electricity',
      'EGS Electricity', 'Energy Intelligence Consortium Electricity',
      'GRC Systems Electricity', 'Hbros Electricity', 'Ideal Prepaid Electricity',
      'IS Metering Electricity', 'Itron PU Electricity', 'JMflowsort Electricity',
      'Jager Electricity', 'KK Prepaid Electricity', 'Landis Electricity',
      'LIC Electricity', 'LiveWire Electricity', 'LL Energy Electricity',
      'Meter Man Electricity', 'Meter Shack Electricity', 'Metro Prepaid Electricity',
      'Mid-City Electricity', 'MSI Electricity', 'My Voltage Electricity',
      'NetVendor Electricity', 'PEC Cape Town Electricity', 'PEC Bloemfontein Electricity',
      'PEC Gauteng Electricity', 'PMD (Power Measurement) Electricity',
      'Prepay Metering Electricity', 'Protea Meter Electricity',
      'Ratcom (Mabcom Metering) Electricity', 'Recharger Electricity',
      'Ruvick Energy Electricity', 'Smart E Power Electricity',
      'Smartpowersa (Konta Metering) Electricity', 'Unique Solutions Electricity',
      'UU Solutions Electricity', 'Youtility_Actom Electricity',
      'Youtility_Inceku Electricity', 'Youtility_Pioneer Electricity',
      'Youtility_Proadmin Electricity', 'Youtility_Umfa Electricity',
      'Uvend Electricity', 'Vula Electricity'
    ];

    await queryInterface.bulkDelete('products', {
      name: {
        [Sequelize.Op.in]: electricityPartnerNames
      }
    });

    // Remove the electricity partner brands
    const electricityPartnerBrands = [
      'Centlec (Mangaung)', 'City of Cape Town', 'Albert Luthuli', 'BelaBela',
      'Dikgatlong', 'Ditsobotla', 'Emakhazeni', 'Emalahleni (Witbank)',
      'Ephraim Mogale (Marblehall)', 'GaSegonyana', 'Govan Mbeki',
      'Greater Letaba', 'Kgatelopele', 'Kgethlengrivier', 'Kokstad',
      'Langeberg', 'Lesedi', 'Lukhanji (Enoch Mugijima)', 'Madibeng',
      'Mafube (water)', 'Magareng', 'Mandeni', 'Mantsopa', 'Matzikama',
      'Maquassi Hills', 'Mbizana (Winnie Madikizela-Mandela)', 'Mpofana',
      'Musina', 'Naledi', 'Phalaborwa', 'Siyathemba', 'Swellendam',
      'Thaba Chweu', 'Thembelihle', 'Tsantsabane', 'Tswaing', 'Umsobomvu',
      'Uthukela District (Water)', 'Uthukela Dictrict (Electricity)',
      'Afhco', 'Applied Metering Innovation', 'Blueberry', 'Broham',
      'BVTechSA', 'Citiq', 'Conlog SLICE – Mapule', 'DA Metering',
      'EGS', 'Energy Intelligence Consortium', 'GRC Systems', 'Hbros',
      'Ideal Prepaid', 'IS Metering', 'Itron PU', 'JMflowsort', 'Jager',
      'KK Prepaid', 'Landis', 'LIC', 'LiveWire', 'LL Energy',
      'Meter Man', 'Meter Shack', 'Metro Prepaid', 'Mid-City', 'MSI',
      'My Voltage', 'NetVendor', 'PEC Cape Town', 'PEC Bloemfontein',
      'PEC Gauteng', 'PMD (Power Measurement)', 'Prepay Metering',
      'Protea Meter', 'Ratcom (Mabcom Metering)', 'Recharger',
      'Ruvick Energy', 'Smart E Power', 'Smartpowersa (Konta Metering)',
      'Unique Solutions', 'UU Solutions', 'Youtility_Actom',
      'Youtility_Inceku', 'Youtility_Pioneer', 'Youtility_Proadmin',
      'Youtility_Umfa', 'Uvend', 'Vula'
    ];

    await queryInterface.bulkDelete('product_brands', {
      name: {
        [Sequelize.Op.in]: electricityPartnerBrands
      }
    });

    console.log('✅ Flash electricity partners rolled back successfully');
  }
};





