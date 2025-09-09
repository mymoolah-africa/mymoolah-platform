'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Get Flash supplier ID
      const [supplierRows] = await queryInterface.sequelize.query(
        "SELECT id FROM suppliers WHERE code = 'FLASH' LIMIT 1"
      );
      const flashSupplierId = supplierRows[0]?.id;

      if (!flashSupplierId) {
        console.log('Flash supplier not found, skipping product catalog seeding');
        return;
      }

      // Create product brands
      const brands = [
        {
          name: 'MMVoucher',
          logoUrl: '/images/brands/mmvoucher.png',
          category: 'vouchers',
          tags: JSON.stringify(['mymoolah', 'voucher', 'digital']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: '1Voucher',
          logoUrl: '/images/brands/1voucher.png',
          category: 'vouchers',
          tags: JSON.stringify(['voucher', 'digital', 'gaming']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'OTT',
          logoUrl: '/images/brands/ott.png',
          category: 'entertainment',
          tags: JSON.stringify(['streaming', 'entertainment', 'digital']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Betway',
          logoUrl: '/images/brands/betway.png',
          category: 'gaming',
          tags: JSON.stringify(['betting', 'gaming', 'sports']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'HollywoodBets',
          logoUrl: '/images/brands/hollywoodbets.png',
          category: 'gaming',
          tags: JSON.stringify(['betting', 'gaming', 'sports']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'YesPlay',
          logoUrl: '/images/brands/yesplay.png',
          category: 'gaming',
          tags: JSON.stringify(['betting', 'gaming', 'sports']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'DStv',
          logoUrl: '/images/brands/dstv.png',
          category: 'entertainment',
          tags: JSON.stringify(['streaming', 'entertainment', 'tv']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Netflix',
          logoUrl: '/images/brands/netflix.png',
          category: 'entertainment',
          tags: JSON.stringify(['streaming', 'entertainment', 'movies']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Fifa Mobile',
          logoUrl: '/images/brands/fifamobile.png',
          category: 'gaming',
          tags: JSON.stringify(['gaming', 'mobile', 'sports']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Intercape',
          logoUrl: '/images/brands/intercape.png',
          category: 'transport',
          tags: JSON.stringify(['transport', 'bus', 'travel']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Tenacity',
          logoUrl: '/images/brands/tenacity.png',
          category: 'gaming',
          tags: JSON.stringify(['gaming', 'esports', 'digital']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Google Play',
          logoUrl: '/images/brands/googleplay.png',
          category: 'entertainment',
          tags: JSON.stringify(['digital', 'apps', 'entertainment']),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Insert brands and get their IDs
      const insertedBrands = await queryInterface.bulkInsert('product_brands', brands, { returning: true });
      const brandMap = {};
      insertedBrands.forEach(brand => {
        brandMap[brand.name] = brand.id;
      });

      // Create products with proper JSONB handling
      const products = [
        // MMVoucher (MyMoolah's own voucher)
        {
          name: 'MMVoucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['MMVoucher'],
          supplierProductId: 'MMVOUCHER_001',
          denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000, 50000]),
          constraints: JSON.stringify({
            minAmount: 1000,
            maxAmount: 50000,
            dailyLimit: 100000,
            monthlyLimit: 1000000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 1,
          metadata: JSON.stringify({
            description: 'MyMoolah digital voucher for various services',
            validity: '12 months',
            terms: 'Valid for MyMoolah services only'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // 1Voucher
        {
          name: '1Voucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['1Voucher'],
          supplierProductId: '1VOUCHER_001',
          denominations: JSON.stringify([500, 1000, 2000, 5000, 10000, 20000]),
          constraints: JSON.stringify({
            minAmount: 500,
            maxAmount: 20000,
            dailyLimit: 50000,
            monthlyLimit: 500000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 2,
          metadata: JSON.stringify({
            description: '1Voucher digital voucher',
            validity: '12 months'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // OTT
        {
          name: 'OTT Voucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['OTT'],
          supplierProductId: 'OTT_001',
          denominations: JSON.stringify([1000, 2000, 5000, 10000]),
          constraints: JSON.stringify({
            minAmount: 1000,
            maxAmount: 10000,
            dailyLimit: 20000,
            monthlyLimit: 200000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 3,
          metadata: JSON.stringify({
            description: 'OTT streaming service voucher',
            validity: '6 months'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // Betway
        {
          name: 'Betway Voucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['Betway'],
          supplierProductId: 'BETWAY_001',
          denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000, 50000]),
          constraints: JSON.stringify({
            minAmount: 1000,
            maxAmount: 50000,
            dailyLimit: 100000,
            monthlyLimit: 1000000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 4,
          metadata: JSON.stringify({
            description: 'Betway betting voucher',
            validity: '12 months',
            terms: 'Valid for betting services only'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // HollywoodBets
        {
          name: 'HollywoodBets Voucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['HollywoodBets'],
          supplierProductId: 'HOLLYWOODBETS_001',
          denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000, 50000]),
          constraints: JSON.stringify({
            minAmount: 1000,
            maxAmount: 50000,
            dailyLimit: 100000,
            monthlyLimit: 1000000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 5,
          metadata: JSON.stringify({
            description: 'HollywoodBets betting voucher',
            validity: '12 months',
            terms: 'Valid for betting services only'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // YesPlay
        {
          name: 'YesPlay Voucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['YesPlay'],
          supplierProductId: 'YESPLAY_001',
          denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000]),
          constraints: JSON.stringify({
            minAmount: 1000,
            maxAmount: 20000,
            dailyLimit: 50000,
            monthlyLimit: 500000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 6,
          metadata: JSON.stringify({
            description: 'YesPlay gaming voucher',
            validity: '12 months'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // DStv
        {
          name: 'DStv Voucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['DStv'],
          supplierProductId: 'DSTV_001',
          denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000, 50000]),
          constraints: JSON.stringify({
            minAmount: 1000,
            maxAmount: 50000,
            dailyLimit: 100000,
            monthlyLimit: 1000000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 7,
          metadata: JSON.stringify({
            description: 'DStv subscription voucher',
            validity: '12 months'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // Netflix
        {
          name: 'Netflix Voucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['Netflix'],
          supplierProductId: 'NETFLIX_001',
          denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000]),
          constraints: JSON.stringify({
            minAmount: 1000,
            maxAmount: 20000,
            dailyLimit: 50000,
            monthlyLimit: 500000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 8,
          metadata: JSON.stringify({
            description: 'Netflix streaming voucher',
            validity: '12 months'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // Fifa Mobile
        {
          name: 'Fifa Mobile Voucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['Fifa Mobile'],
          supplierProductId: 'FIFAMOBILE_001',
          denominations: JSON.stringify([500, 1000, 2000, 5000, 10000]),
          constraints: JSON.stringify({
            minAmount: 500,
            maxAmount: 10000,
            dailyLimit: 20000,
            monthlyLimit: 200000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 9,
          metadata: JSON.stringify({
            description: 'Fifa Mobile gaming voucher',
            validity: '12 months'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // Intercape
        {
          name: 'Intercape Voucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['Intercape'],
          supplierProductId: 'INTERCAPE_001',
          denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000, 50000]),
          constraints: JSON.stringify({
            minAmount: 1000,
            maxAmount: 50000,
            dailyLimit: 100000,
            monthlyLimit: 1000000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 10,
          metadata: JSON.stringify({
            description: 'Intercape bus travel voucher',
            validity: '12 months'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // Tenacity
        {
          name: 'Tenacity Voucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['Tenacity'],
          supplierProductId: 'TENACITY_001',
          denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000]),
          constraints: JSON.stringify({
            minAmount: 1000,
            maxAmount: 20000,
            dailyLimit: 50000,
            monthlyLimit: 500000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 11,
          metadata: JSON.stringify({
            description: 'Tenacity esports voucher',
            validity: '12 months'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // Google Play
        {
          name: 'Google Play Voucher',
          type: 'voucher',
          supplierId: flashSupplierId,
          brandId: brandMap['Google Play'],
          supplierProductId: 'GOOGLEPLAY_001',
          denominations: JSON.stringify([1000, 2000, 5000, 10000, 20000, 50000]),
          constraints: JSON.stringify({
            minAmount: 1000,
            maxAmount: 50000,
            dailyLimit: 100000,
            monthlyLimit: 1000000
          }),
          status: 'active',
          isFeatured: true,
          sortOrder: 12,
          metadata: JSON.stringify({
            description: 'Google Play Store voucher',
            validity: '12 months'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await queryInterface.bulkInsert('products', products);

      console.log('✅ Initial product catalog seeded with 12 featured vouchers');
      console.log('📦 Products created:');
      products.forEach(product => {
        console.log(`   - ${product.name} (${product.type})`);
      });

    } catch (error) {
      console.error('Error seeding product catalog:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove products first (due to foreign key constraints)
      await queryInterface.bulkDelete('products', {
        supplierProductId: {
          [Sequelize.Op.in]: [
            'MMVOUCHER_001', '1VOUCHER_001', 'OTT_001', 'BETWAY_001',
            'HOLLYWOODBETS_001', 'YESPLAY_001', 'DSTV_001', 'NETFLIX_001',
            'FIFAMOBILE_001', 'INTERCAPE_001', 'TENACITY_001', 'GOOGLEPLAY_001'
          ]
        }
      });

      // Remove brands
      await queryInterface.bulkDelete('product_brands', {
        name: {
          [Sequelize.Op.in]: [
            'MMVoucher', '1Voucher', 'OTT', 'Betway', 'HollywoodBets',
            'YesPlay', 'DStv', 'Netflix', 'Fifa Mobile', 'Intercape',
            'Tenacity', 'Google Play'
          ]
        }
      });

      console.log('✅ Product catalog seed data removed');
    } catch (error) {
      console.error('Error removing product catalog seed data:', error);
      throw error;
    }
  }
};
