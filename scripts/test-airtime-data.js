const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

async function testAirtimeData() {
  try {
    console.log('🧪 Testing Airtime Dummy Data...');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Define models
    const AirtimeNetwork = sequelize.define('AirtimeNetwork', {
      id: { type: DataTypes.STRING, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      logo: { type: DataTypes.STRING },
      commission: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
      preferred: { type: DataTypes.BOOLEAN, defaultValue: false },
      voucherAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },
      topUpAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },
      available: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, { tableName: 'airtime_networks', timestamps: true });

    const AirtimeProduct = sequelize.define('AirtimeProduct', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      networkId: { type: DataTypes.STRING, allowNull: false },
      productType: { type: DataTypes.ENUM('voucher', 'topup', 'eezi', 'global'), allowNull: false },
      value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      available: { type: DataTypes.BOOLEAN, defaultValue: true },
      promotional: { type: DataTypes.BOOLEAN, defaultValue: false },
      commission: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
      supplier: { type: DataTypes.STRING, defaultValue: 'Flash' }
    }, { tableName: 'airtime_products', timestamps: true });

    const AirtimePromotion = sequelize.define('AirtimePromotion', {
      id: { type: DataTypes.STRING, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      discountPercentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
      validUntil: { type: DataTypes.DATE, allowNull: false },
      networkId: { type: DataTypes.STRING },
      minAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, { tableName: 'airtime_promotions', timestamps: true });

    const GlobalService = sequelize.define('GlobalService', {
      id: { type: DataTypes.STRING, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      type: { type: DataTypes.STRING, allowNull: false },
      supplier: { type: DataTypes.STRING, defaultValue: 'Flash' },
      commission: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
      available: { type: DataTypes.BOOLEAN, defaultValue: true },
      icon: { type: DataTypes.STRING }
    }, { tableName: 'global_services', timestamps: true });

    // Test networks
    console.log('\n📡 Testing Networks...');
    const networks = await AirtimeNetwork.findAll();
    console.log(`✅ Found ${networks.length} networks`);
    
    networks.forEach(network => {
      console.log(`   - ${network.name} (${network.id}): ${network.commission}% commission, Preferred: ${network.preferred}`);
    });

    // Test products
    console.log('\n🎫 Testing Products...');
    const products = await AirtimeProduct.findAll({ limit: 10 });
    console.log(`✅ Found ${await AirtimeProduct.count()} total products`);
    console.log(`   Sample products:`);
    
    products.forEach(product => {
      console.log(`   - ${product.productType} for ${product.networkId}: R${product.value}, ${product.commission}% commission`);
    });

    // Test promotions
    console.log('\n🎉 Testing Promotions...');
    const promotions = await AirtimePromotion.findAll();
    console.log(`✅ Found ${promotions.length} promotions`);
    
    promotions.forEach(promotion => {
      console.log(`   - ${promotion.title}: ${promotion.discountPercentage}% off, Network: ${promotion.networkId}`);
    });

    // Test global services
    console.log('\n🌍 Testing Global Services...');
    const globalServices = await GlobalService.findAll();
    console.log(`✅ Found ${globalServices.length} global services`);
    
    globalServices.forEach(service => {
      console.log(`   - ${service.name} (${service.type}): ${service.commission}% commission`);
    });

    // Test specific network products
    console.log('\n📱 Testing Vodacom Products...');
    const vodacomProducts = await AirtimeProduct.findAll({
      where: { networkId: 'vodacom' },
      limit: 5
    });
    console.log(`✅ Found ${vodacomProducts.length} Vodacom products (showing first 5)`);
    
    vodacomProducts.forEach(product => {
      console.log(`   - ${product.productType}: R${product.value}`);
    });

    // Test eeziAirtime products
    console.log('\n⚡ Testing eeziAirtime Products...');
    const eeziProducts = await AirtimeProduct.findAll({
      where: { networkId: 'eezi' },
      limit: 5
    });
    console.log(`✅ Found ${await AirtimeProduct.count({ where: { networkId: 'eezi' } })} eeziAirtime products (showing first 5)`);
    
    eeziProducts.forEach(product => {
      console.log(`   - R${product.value} (${product.commission}% commission)`);
    });

    console.log('\n🎉 All Tests Passed!');
    console.log('\n📊 Summary:');
    console.log(`   - Networks: ${networks.length}`);
    console.log(`   - Products: ${await AirtimeProduct.count()}`);
    console.log(`   - Promotions: ${promotions.length}`);
    console.log(`   - Global Services: ${globalServices.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the test
if (require.main === module) {
  testAirtimeData()
    .then(() => {
      console.log('✅ Testing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testAirtimeData };
