'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Adding Ria Money Send cross-border remittance service...');

    // Get supplier IDs
    const [flashSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'FLASH'"
    );
    
    const [mobilemartSupplier] = await queryInterface.sequelize.query(
      "SELECT id FROM suppliers WHERE code = 'MOBILEMART'"
    );

    if (flashSupplier.length === 0 || mobilemartSupplier.length === 0) {
      console.log('Required suppliers not found, skipping Ria Money Send addition');
      return;
    }

    const flashSupplierId = flashSupplier[0].id;
    const mobilemartSupplierId = mobilemartSupplier[0].id;

    // Create Ria Money Send brand if it doesn't exist
    const [existingBrand] = await queryInterface.sequelize.query(
      "SELECT id FROM product_brands WHERE name = 'Ria Money Send'"
    );
    
    let riaBrandId;
    if (existingBrand.length === 0) {
      const [newBrand] = await queryInterface.sequelize.query(
        "INSERT INTO product_brands (name, \"logoUrl\", category, tags, \"isActive\", \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, ?, true, NOW(), NOW()) RETURNING id",
        { 
          replacements: [
            'Ria Money Send', 
            '/images/brands/riamoneysend.png',
            'money_transfer',
            JSON.stringify(['ria', 'money_transfer', 'cross_border', 'remittance', 'international'])
          ] 
        }
      );
      riaBrandId = newBrand[0].id;
      console.log('✅ Created brand: Ria Money Send');
    } else {
      riaBrandId = existingBrand[0].id;
      console.log('ℹ️  Brand already exists: Ria Money Send');
    }

    // Check if Ria Money Send product exists
    const [existingProduct] = await queryInterface.sequelize.query(
      "SELECT id FROM products WHERE name = 'Ria Money Send'"
    );

    if (existingProduct.length === 0) {
      // Create Ria Money Send product
      const [newProduct] = await queryInterface.sequelize.query(
        "INSERT INTO products (name, type, \"brandId\", status, \"isFeatured\", \"sortOrder\", description, category, tags, metadata, \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, 'active', true, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id",
        { 
          replacements: [
            'Ria Money Send',
            'cash_out', // Using cash_out type for money transfers
            riaBrandId,
            10, // High priority in Payments & Transfers section
            'Send money globally with Ria Money Send - Fast, secure, and reliable cross-border remittance service',
            'money_transfer',
            JSON.stringify(['money_transfer', 'cross_border', 'remittance', 'international', 'ria']),
            JSON.stringify({
              description: 'Ria Money Send - Global money transfer service',
              validity: 'No expiry',
              terms: 'Standard Ria Money Send terms apply',
              features: [
                'Send money to over 160 countries',
                'Fast transfers in minutes',
                'Competitive exchange rates',
                'Secure and reliable service',
                'Multiple pickup locations worldwide'
              ],
              supportedCountries: [
                'South Africa', 'United States', 'United Kingdom', 'Canada',
                'Australia', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands',
                'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark',
                'Finland', 'Poland', 'Czech Republic', 'Hungary', 'Romania',
                'Bulgaria', 'Croatia', 'Slovenia', 'Slovakia', 'Lithuania',
                'Latvia', 'Estonia', 'Greece', 'Portugal', 'Ireland', 'Luxembourg',
                'Malta', 'Cyprus', 'Iceland', 'Liechtenstein', 'Monaco', 'Andorra',
                'San Marino', 'Vatican City', 'Brazil', 'Argentina', 'Chile',
                'Colombia', 'Peru', 'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay',
                'Venezuela', 'Guyana', 'Suriname', 'French Guiana', 'Mexico',
                'Guatemala', 'Belize', 'El Salvador', 'Honduras', 'Nicaragua',
                'Costa Rica', 'Panama', 'Cuba', 'Jamaica', 'Haiti', 'Dominican Republic',
                'Puerto Rico', 'Trinidad and Tobago', 'Barbados', 'Grenada',
                'Saint Vincent and the Grenadines', 'Saint Lucia', 'Dominica',
                'Antigua and Barbuda', 'Saint Kitts and Nevis', 'Bahamas',
                'India', 'China', 'Japan', 'South Korea', 'Philippines',
                'Vietnam', 'Thailand', 'Malaysia', 'Singapore', 'Indonesia',
                'Myanmar', 'Cambodia', 'Laos', 'Brunei', 'East Timor',
                'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan',
                'Maldives', 'Afghanistan', 'Iran', 'Iraq', 'Syria', 'Lebanon',
                'Jordan', 'Israel', 'Palestine', 'Saudi Arabia', 'Yemen',
                'Oman', 'United Arab Emirates', 'Qatar', 'Bahrain', 'Kuwait',
                'Egypt', 'Libya', 'Tunisia', 'Algeria', 'Morocco', 'Mauritania',
                'Senegal', 'Gambia', 'Guinea-Bissau', 'Guinea', 'Sierra Leone',
                'Liberia', 'Ivory Coast', 'Ghana', 'Togo', 'Benin', 'Nigeria',
                'Cameroon', 'Central African Republic', 'Chad', 'Sudan',
                'South Sudan', 'Ethiopia', 'Eritrea', 'Djibouti', 'Somalia',
                'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Burundi',
                'Democratic Republic of the Congo', 'Republic of the Congo',
                'Gabon', 'Equatorial Guinea', 'São Tomé and Príncipe',
                'Angola', 'Zambia', 'Malawi', 'Mozambique', 'Zimbabwe',
                'Botswana', 'Namibia', 'Lesotho', 'Eswatini', 'Madagascar',
                'Comoros', 'Mauritius', 'Seychelles', 'Cape Verde'
              ]
            })
          ] 
        }
      );
      console.log('✅ Created product: Ria Money Send');
      
      // Create product variants
      await this.createProductVariants(queryInterface, newProduct[0].id, flashSupplierId, mobilemartSupplierId);
    } else {
      console.log('ℹ️  Product already exists: Ria Money Send');
    }

    console.log('✅ Ria Money Send cross-border remittance service added successfully');
  },

  async createProductVariants(queryInterface, productId, flashSupplierId, mobilemartSupplierId) {
    // Define denominations for money transfers (higher amounts)
    const denominations = [50000, 100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000];
    
    // Flash variant (preferred)
    const flashVariant = {
      productId: productId,
      supplierId: flashSupplierId,
      supplierProductId: 'FLASH_RIA_MONEY_SEND_001',
      denominations: JSON.stringify(denominations),
      pricing: JSON.stringify({
        commissionTiers: [
          {
            minAmount: 50000,
            maxAmount: 500000,
            rate: 0.40 // 0.40% commission for Ria
          },
          {
            minAmount: 500001,
            maxAmount: 2000000,
            rate: 0.35
          },
          {
            minAmount: 2000001,
            maxAmount: 10000000,
            rate: 0.30
          }
        ],
        defaultCommissionRate: 0.40,
        fees: {
          processingFee: 0,
          serviceFee: 0
        }
      }),
      constraints: JSON.stringify({
        minAmount: 50000, // R50.00 minimum
        maxAmount: 10000000, // R100,000.00 maximum
        dailyLimit: 10000000,
        monthlyLimit: 100000000,
        requiresRecipient: true,
        requiresKYC: true
      }),
      status: 'active',
      isPreferred: true,
      sortOrder: 1,
      metadata: JSON.stringify({
        description: 'Ria Money Send via Flash',
        processingTime: 'Minutes to hours',
        reliability: 'High',
        exchangeRates: 'Competitive',
        pickupLocations: 'Global network'
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // MobileMart variant (not preferred)
    const mobilemartVariant = {
      productId: productId,
      supplierId: mobilemartSupplierId,
      supplierProductId: 'MOBILEMART_RIA_MONEY_SEND_001',
      denominations: JSON.stringify(denominations),
      pricing: JSON.stringify({
        commissionTiers: [
          {
            minAmount: 50000,
            maxAmount: 500000,
            rate: 0.45 // 0.45% commission for Ria (higher than Flash)
          },
          {
            minAmount: 500001,
            maxAmount: 2000000,
            rate: 0.40
          },
          {
            minAmount: 2000001,
            maxAmount: 10000000,
            rate: 0.35
          }
        ],
        defaultCommissionRate: 0.45,
        fees: {
          processingFee: 50, // R0.50 processing fee
          serviceFee: 0
        }
      }),
      constraints: JSON.stringify({
        minAmount: 50000, // R50.00 minimum
        maxAmount: 10000000, // R100,000.00 maximum
        dailyLimit: 10000000,
        monthlyLimit: 100000000,
        requiresRecipient: true,
        requiresKYC: true
      }),
      status: 'active',
      isPreferred: false,
      sortOrder: 2,
      metadata: JSON.stringify({
        description: 'Ria Money Send via MobileMart',
        processingTime: 'Minutes to hours',
        reliability: 'High',
        exchangeRates: 'Competitive',
        pickupLocations: 'Global network'
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await queryInterface.bulkInsert('product_variants', [flashVariant, mobilemartVariant]);
    console.log('✅ Created product variants for Ria Money Send');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back Ria Money Send service...');

    // Remove the Ria Money Send product (this will cascade to variants)
    await queryInterface.bulkDelete('products', {
      name: 'Ria Money Send'
    });

    // Remove the Ria Money Send brand (only if no other products use it)
    const [productsUsingBrand] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM products WHERE \"brandId\" = (SELECT id FROM product_brands WHERE name = 'Ria Money Send')"
    );
    
    if (productsUsingBrand[0].count === 0) {
      await queryInterface.bulkDelete('product_brands', {
        name: 'Ria Money Send'
      });
      console.log('✅ Removed Ria Money Send brand');
    } else {
      console.log('ℹ️  Ria Money Send brand kept (other products still use it)');
    }

    console.log('✅ Ria Money Send service rolled back successfully');
  }
};





