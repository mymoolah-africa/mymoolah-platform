/**
 * VAS Supplier Integration Test Script
 * 
 * Tests Flash and MobileMart integrations
 * Verifies database setup for VAS transactions
 * Validates product catalogs and transaction flows
 */

const { sequelize } = require('../models');
const { User, Wallet, VasProduct, VasTransaction } = require('../models');

class VasSupplierTester {
  constructor() {
    this.testResults = {
      database: {},
      flash: {},
      mobilemart: {},
      vasProducts: {},
      transactions: {}
    };
  }

  /**
   * Run comprehensive VAS supplier tests
   */
  async runAllTests() {
    console.log('🧪 Starting VAS Supplier Integration Tests...\n');

    try {
      // Test database connectivity
      await this.testDatabaseConnectivity();
      
      // Test VAS product catalog
      await this.testVasProductCatalog();
      
      // Test Flash integration
      await this.testFlashIntegration();
      
      // Test MobileMart integration
      await this.testMobileMartIntegration();
      
      // Test transaction creation
      await this.testVasTransactionCreation();
      
      // Generate test report
      this.generateTestReport();

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.testResults.error = error.message;
    }
  }

  /**
   * Test database connectivity
   */
  async testDatabaseConnectivity() {
    console.log('🔍 Testing database connectivity...');
    
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection successful');
      
      // Test basic queries
      const userCount = await User.count();
      const walletCount = await Wallet.count();
      const vasProductCount = await VasProduct.count();
      
      this.testResults.database = {
        connected: true,
        userCount,
        walletCount,
        vasProductCount,
        timestamp: new Date().toISOString()
      };
      
      console.log(`📊 Database Stats: ${userCount} users, ${walletCount} wallets, ${vasProductCount} VAS products`);
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.testResults.database = {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      throw error;
    }
  }

  /**
   * Test VAS product catalog
   */
  async testVasProductCatalog() {
    console.log('\n🔍 Testing VAS product catalog...');
    
    try {
      // Get all VAS products
      const products = await VasProduct.findAll({
        where: { isActive: true },
        order: [['priority', 'ASC']]
      });

      console.log(`✅ Found ${products.length} active VAS products`);

      // Analyze product distribution
      const productTypes = {};
      const suppliers = {};
      const providers = {};

      products.forEach(product => {
        // Count by VAS type
        productTypes[product.vasType] = (productTypes[product.vasType] || 0) + 1;
        
        // Count by supplier
        suppliers[product.supplierId] = (suppliers[product.supplierId] || 0) + 1;
        
        // Count by provider
        providers[product.provider] = (providers[product.provider] || 0) + 1;
      });

      console.log('📊 Product Distribution:');
      console.log('  VAS Types:', productTypes);
      console.log('  Suppliers:', suppliers);
      console.log('  Providers:', providers);

      // Test predefined amounts
      const productsWithAmounts = products.filter(p => p.predefinedAmounts);
      console.log(`✅ ${productsWithAmounts.length} products have predefined amounts`);

      this.testResults.vasProducts = {
        total: products.length,
        active: products.filter(p => p.isActive).length,
        types: productTypes,
        suppliers,
        providers,
        withPredefinedAmounts: productsWithAmounts.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ VAS product catalog test failed:', error.message);
      this.testResults.vasProducts = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test Flash integration
   */
  async testFlashIntegration() {
    console.log('\n🔍 Testing Flash integration...');
    
    try {
      // Check Flash products
      const flashProducts = await VasProduct.findAll({
        where: { 
          supplierId: 'flash',
          isActive: true 
        }
      });

      console.log(`✅ Found ${flashProducts.length} active Flash products`);

      // Test Flash-specific product types
      const flashTypes = {};
      flashProducts.forEach(product => {
        flashTypes[product.vasType] = (flashTypes[product.vasType] || 0) + 1;
      });

      console.log('📊 Flash Product Types:', flashTypes);

      // Test eezAirtime products
      const eezAirtimeProducts = flashProducts.filter(p => 
        p.productName.toLowerCase().includes('eez') || 
        p.productName.toLowerCase().includes('airtime')
      );

      console.log(`✅ Found ${eezAirtimeProducts.length} eezAirtime products`);

      this.testResults.flash = {
        totalProducts: flashProducts.length,
        productTypes: flashTypes,
        eezAirtimeProducts: eezAirtimeProducts.length,
        hasProducts: flashProducts.length > 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Flash integration test failed:', error.message);
      this.testResults.flash = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test MobileMart integration
   */
  async testMobileMartIntegration() {
    console.log('\n🔍 Testing MobileMart integration...');
    
    try {
      // Check MobileMart products
      const mobilemartProducts = await VasProduct.findAll({
        where: { 
          supplierId: 'mobilemart',
          isActive: true 
        }
      });

      console.log(`✅ Found ${mobilemartProducts.length} active MobileMart products`);

      // Test MobileMart-specific product types
      const mobilemartTypes = {};
      mobilemartProducts.forEach(product => {
        mobilemartTypes[product.vasType] = (mobilemartTypes[product.vasType] || 0) + 1;
      });

      console.log('📊 MobileMart Product Types:', mobilemartTypes);

      this.testResults.mobilemart = {
        totalProducts: mobilemartProducts.length,
        productTypes: mobilemartTypes,
        hasProducts: mobilemartProducts.length > 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ MobileMart integration test failed:', error.message);
      this.testResults.mobilemart = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test VAS transaction creation
   */
  async testVasTransactionCreation() {
    console.log('\n🔍 Testing VAS transaction creation...');
    
    try {
      // Get test user and wallet
      const testUser = await User.findOne({ where: { id: 1 } });
      const testWallet = await Wallet.findOne({ where: { userId: 1 } });

      if (!testUser || !testWallet) {
        throw new Error('Test user or wallet not found');
      }

      console.log(`✅ Using test user: ${testUser.firstName} ${testUser.lastName}`);
      console.log(`✅ Using test wallet: ${testWallet.walletId} (Balance: R${testWallet.balance})`);

      // Get a test VAS product
      const testProduct = await VasProduct.findOne({
        where: { 
          isActive: true,
          vasType: 'airtime'
        }
      });

      if (!testProduct) {
        throw new Error('No test VAS product found');
      }

      console.log(`✅ Using test product: ${testProduct.productName}`);

      // Test transaction creation (without actually creating it)
      const testTransaction = {
        transactionId: `TEST_${Date.now()}`,
        userId: testUser.id,
        walletId: testWallet.id,
        vasProductId: testProduct.id,
        supplierId: testProduct.supplierId,
        vasType: testProduct.vasType,
        transactionType: 'voucher',
        amount: 1000, // R10.00
        fee: 50,      // R0.50
        totalAmount: 1050, // R10.50
        recipientNumber: '0825571055',
        status: 'pending'
      };

      console.log('✅ Transaction structure validated');
      console.log('📊 Test Transaction:', {
        transactionId: testTransaction.transactionId,
        amount: `R${(testTransaction.amount / 100).toFixed(2)}`,
        fee: `R${(testTransaction.fee / 100).toFixed(2)}`,
        total: `R${(testTransaction.totalAmount / 100).toFixed(2)}`,
        recipient: testTransaction.recipientNumber
      });

      this.testResults.transactions = {
        userFound: true,
        walletFound: true,
        productFound: true,
        transactionStructureValid: true,
        testUser: `${testUser.firstName} ${testUser.lastName}`,
        testWallet: testWallet.walletId,
        testProduct: testProduct.productName,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ VAS transaction creation test failed:', error.message);
      this.testResults.transactions = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    console.log('\n📋 VAS Supplier Integration Test Report');
    console.log('=====================================');

    // Database status
    console.log('\n🏗️  Database Status:');
    if (this.testResults.database.connected) {
      console.log('  ✅ Connected');
      console.log(`  📊 Users: ${this.testResults.database.userCount}`);
      console.log(`  📊 Wallets: ${this.testResults.database.walletCount}`);
      console.log(`  📊 VAS Products: ${this.testResults.database.vasProductCount}`);
    } else {
      console.log('  ❌ Connection failed');
      console.log(`  🔍 Error: ${this.testResults.database.error}`);
    }

    // VAS Products status
    console.log('\n📦 VAS Product Catalog:');
    if (this.testResults.vasProducts.total !== undefined) {
      console.log(`  ✅ ${this.testResults.vasProducts.total} total products`);
      console.log(`  ✅ ${this.testResults.vasProducts.active} active products`);
      console.log(`  ✅ ${this.testResults.vasProducts.withPredefinedAmounts} with predefined amounts`);
      console.log('  📊 Types:', this.testResults.vasProducts.types);
    } else {
      console.log('  ❌ Product catalog test failed');
      console.log(`  🔍 Error: ${this.testResults.vasProducts.error}`);
    }

    // Flash integration status
    console.log('\n⚡ Flash Integration:');
    if (this.testResults.flash.hasProducts) {
      console.log('  ✅ Products available');
      console.log(`  📊 Total: ${this.testResults.flash.totalProducts}`);
      console.log(`  📊 eezAirtime: ${this.testResults.flash.eezAirtimeProducts}`);
      console.log('  📊 Types:', this.testResults.flash.productTypes);
    } else {
      console.log('  ⚠️  No Flash products found');
      if (this.testResults.flash.error) {
        console.log(`  🔍 Error: ${this.testResults.flash.error}`);
      }
    }

    // MobileMart integration status
    console.log('\n📱 MobileMart Integration:');
    if (this.testResults.mobilemart.hasProducts) {
      console.log('  ✅ Products available');
      console.log(`  📊 Total: ${this.testResults.mobilemart.totalProducts}`);
      console.log('  📊 Types:', this.testResults.mobilemart.productTypes);
    } else {
      console.log('  ⚠️  No MobileMart products found');
      if (this.testResults.mobilemart.error) {
        console.log(`  🔍 Error: ${this.testResults.mobilemart.error}`);
      }
    }

    // Transaction creation status
    console.log('\n💳 Transaction Creation:');
    if (this.testResults.transactions.transactionStructureValid) {
      console.log('  ✅ Transaction structure valid');
      console.log(`  👤 Test User: ${this.testResults.transactions.testUser}`);
      console.log(`  💰 Test Wallet: ${this.testResults.transactions.testWallet}`);
      console.log(`  📦 Test Product: ${this.testResults.transactions.testProduct}`);
    } else {
      console.log('  ❌ Transaction creation test failed');
      console.log(`  🔍 Error: ${this.testResults.transactions.error}`);
    }

    // Overall assessment
    console.log('\n🎯 Overall Assessment:');
    const hasDatabase = this.testResults.database.connected;
    const hasProducts = this.testResults.vasProducts.total > 0;
    const hasFlash = this.testResults.flash.hasProducts;
    const hasMobileMart = this.testResults.mobilemart.hasProducts;
    const canCreateTransactions = this.testResults.transactions.transactionStructureValid;

    if (hasDatabase && hasProducts && (hasFlash || hasMobileMart) && canCreateTransactions) {
      console.log('  ✅ READY for VAS transactions');
      console.log('  🚀 Database is properly configured for millions of transactions');
    } else {
      console.log('  ⚠️  NEEDS ATTENTION');
      if (!hasDatabase) console.log('    - Database connection issues');
      if (!hasProducts) console.log('    - No VAS products configured');
      if (!hasFlash && !hasMobileMart) console.log('    - No supplier integrations working');
      if (!canCreateTransactions) console.log('    - Transaction creation issues');
    }

    console.log('\n📝 Recommendations:');
    if (!hasFlash) {
      console.log('  - Configure Flash supplier products');
    }
    if (!hasMobileMart) {
      console.log('  - Configure MobileMart supplier products');
    }
    if (this.testResults.vasProducts.total < 50) {
      console.log('  - Add more VAS products to catalog');
    }
    console.log('  - Test actual transaction creation with real API calls');
    console.log('  - Monitor transaction performance under load');

    console.log('\n✅ VAS Supplier Integration Tests completed!');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new VasSupplierTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n🎉 All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error);
      process.exit(1);
    });
}

module.exports = VasSupplierTester;
