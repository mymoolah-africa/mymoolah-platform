'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Adding eeziAirtime product with 3.5% commission...');

    // Get supplier IDs
    const [flashSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'FLASH'"
    );
    
    const [mobilemartSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'MOBILEMART'"
    );

    if (flashSupplier.length === 0 || mobilemartSupplier.length === 0) {
      console.log('Required suppliers not found, skipping eeziAirtime addition');
      return;
    }

    const flashSupplierId = flashSupplier[0].id;
    const mobilemartSupplierId = mobilemartSupplier[0].id;

    // Create eeziAirtime brand if it doesn't exist
    const [existingBrand] = await queryInterface.sequelize.query(
      "SELECT id FROM product_brands WHERE name = 'eeziAirtime'"
    );
    
    let brandId;
    if (existingBrand.length === 0) {
      const [newBrand] = await queryInterface.sequelize.query(
        "INSERT INTO product_brands (name, \"logoUrl\", category, tags, \"isActive\", \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, ?, true, NOW(), NOW()) RETURNING id",
        { 
          replacements: [
            'eeziAirtime', 
            '/images/brands/eeziairtime.png',
            'telecom',
            JSON.stringify(['eeziairtime', 'airtime', 'mobile', 'flash'])
          ] 
        }
      );
      brandId = newBrand[0].id;
      console.log('✅ Created eeziAirtime brand');
    } else {
      brandId = existingBrand[0].id;
      console.log('ℹ️  eeziAirtime brand already exists');
    }

    // Check if eeziAirtime product exists
    const [existingProduct] = await queryInterface.sequelize.query(
      "SELECT id FROM products WHERE name = 'eeziAirtime'"
    );

    if (existingProduct.length === 0) {
      // Create eeziAirtime product
      const [newProduct] = await queryInterface.sequelize.query(
        "INSERT INTO products (name, type, \"brandId\", status, \"isFeatured\", \"sortOrder\", description, category, tags, metadata, \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, 'active', true, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id",
        { 
          replacements: [
            'eeziAirtime',
            'airtime',
            brandId,
            1, // High priority sort order
            'eeziAirtime mobile airtime service',
            'airtime',
            JSON.stringify(['airtime', 'eeziairtime', 'mobile']),
            JSON.stringify({
              description: 'eeziAirtime mobile airtime service via Flash',
              validity: 'No expiry',
              terms: 'Standard eeziAirtime terms apply'
            })
          ] 
        }
      );
      console.log('✅ Created eeziAirtime product');
      
      // Create product variants
      const denominations = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];
      
      // Flash variant (3.5% commission, preferred)
      const flashVariant = {
        productId: newProduct[0].id,
        supplierId: flashSupplierId,
        supplierProductId: 'FLASH_EEZIAIRTIME_001',
        denominations: JSON.stringify(denominations),
        pricing: JSON.stringify({
          commissionTiers: [
            {
              minAmount: denominations[0],
              maxAmount: denominations[denominations.length - 1],
              rate: 3.50
            }
          ],
          defaultCommissionRate: 3.50,
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
          description: 'eeziAirtime via Flash',
          processingTime: 'Instant',
          reliability: 'High'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // MobileMart variant (4.0% commission, not preferred)
      const mobilemartVariant = {
        productId: newProduct[0].id,
        supplierId: mobilemartSupplierId,
        supplierProductId: 'MOBILEMART_EEZIAIRTIME_001',
        denominations: JSON.stringify(denominations),
        pricing: JSON.stringify({
          commissionTiers: [
            {
              minAmount: denominations[0],
              maxAmount: denominations[denominations.length - 1],
              rate: 4.00
            }
          ],
          defaultCommissionRate: 4.00,
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
          description: 'eeziAirtime via MobileMart',
          processingTime: 'Instant',
          reliability: 'High'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await queryInterface.bulkInsert('product_variants', [flashVariant, mobilemartVariant]);
      console.log('✅ Created eeziAirtime product variants');
    } else {
      console.log('ℹ️  eeziAirtime product already exists');
    }

    console.log('✅ eeziAirtime product added successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back eeziAirtime product...');

    // Remove the eeziAirtime product (this will cascade to variants)
    await queryInterface.bulkDelete('products', {
      name: 'eeziAirtime'
    });

    // Remove the eeziAirtime brand
    await queryInterface.bulkDelete('product_brands', {
      name: 'eeziAirtime'
    });

    console.log('✅ eeziAirtime product rolled back successfully');
  }
};





