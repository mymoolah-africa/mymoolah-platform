const { FlashProduct, FlashTransaction } = require('../models');

/**
 * Seed Flash dummy data for testing
 * Based on Flash DS01 documentation
 */

async function seedFlashData() {
  try {
    console.log('🌱 Seeding Flash dummy data...');

    // Clear existing data
    await FlashTransaction.destroy({ where: {} });
    await FlashProduct.destroy({ where: {} });

    // Create test Flash products based on DS01 documentation
    const testProducts = [
      // Airtime & Data
      { productCode: 1001, productName: 'MTN Airtime', category: 'airtime', provider: 'MTN', commission: 3.00, minAmount: 500, maxAmount: 100000 },
      { productCode: 1002, productName: 'Vodacom Airtime', category: 'airtime', provider: 'Vodacom', commission: 3.00, minAmount: 500, maxAmount: 100000 },
      { productCode: 1003, productName: 'CellC Airtime', category: 'airtime', provider: 'CellC', commission: 3.00, minAmount: 500, maxAmount: 100000 },
      { productCode: 1004, productName: 'Telkom Airtime', category: 'airtime', provider: 'Telkom', commission: 3.00, minAmount: 500, maxAmount: 100000 },
      { productCode: 1005, productName: 'eeziAirtime', category: 'airtime', provider: 'eeziAirtime', commission: 3.50, minAmount: 500, maxAmount: 100000 },
      
      // Electricity
      { productCode: 2001, productName: 'Eskom Prepaid', category: 'electricity', provider: 'Eskom', commission: 0.85, minAmount: 1000, maxAmount: 500000 },
      { productCode: 2002, productName: 'City Power Prepaid', category: 'electricity', provider: 'City Power', commission: 0.85, minAmount: 1000, maxAmount: 500000 },
      { productCode: 2003, productName: 'Ethekwini Prepaid', category: 'electricity', provider: 'Ethekwini', commission: 0.85, minAmount: 1000, maxAmount: 500000 },
      
      // Gaming & Streaming
      { productCode: 3001, productName: 'Netflix Voucher', category: 'streaming', provider: 'Netflix', commission: 3.25, minAmount: 1000, maxAmount: 50000 },
      { productCode: 3002, productName: 'Spotify Voucher', category: 'streaming', provider: 'Spotify', commission: 6.00, minAmount: 1000, maxAmount: 50000 },
      { productCode: 3003, productName: 'Steam Voucher', category: 'gaming', provider: 'Steam', commission: 3.50, minAmount: 1000, maxAmount: 50000 },
      { productCode: 3004, productName: 'Google Play Voucher', category: 'gaming', provider: 'Google Play', commission: 3.10, minAmount: 1000, maxAmount: 50000 },
      
      // Bill Payments
      { productCode: 4001, productName: 'DSTV Payment', category: 'bill_payment', provider: 'DSTV', commission: 3.00, minAmount: 1000, maxAmount: 100000 },
      { productCode: 4002, productName: 'Unipay Payment', category: 'bill_payment', provider: 'Unipay', commission: 2.00, minAmount: 1000, maxAmount: 100000 },
      { productCode: 4003, productName: 'Ekurhuleni Payment', category: 'bill_payment', provider: 'Ekurhuleni', commission: 2.50, minAmount: 1000, maxAmount: 100000 },
      
      // 1Voucher
      { productCode: 5001, productName: '1Voucher Purchase', category: 'voucher', provider: '1Voucher', commission: 1.00, minAmount: 1000, maxAmount: 100000 },
      { productCode: 5002, productName: '1Voucher Disburse', category: 'voucher', provider: '1Voucher', commission: 1.00, minAmount: 1000, maxAmount: 100000 },
      { productCode: 5003, productName: '1Voucher Redeem', category: 'voucher', provider: '1Voucher', commission: 1.00, minAmount: 1000, maxAmount: 100000 }
    ];

    await FlashProduct.bulkCreate(testProducts);
    console.log(`✅ Created ${testProducts.length} Flash products`);

    // Create test Flash transactions
    const testTransactions = [
      {
        reference: 'FLASH001',
        accountNumber: 'FLASH001',
        serviceType: '1voucher',
        operation: 'purchase',
        amount: 5000,
        productCode: 5001,
        status: 'completed',
        flashResponseCode: '00',
        flashResponseMessage: 'Success'
      },
      {
        reference: 'FLASH002',
        accountNumber: 'FLASH001',
        serviceType: 'cellular',
        operation: 'purchase',
        amount: 1000,
        productCode: 1001,
        status: 'completed',
        flashResponseCode: '00',
        flashResponseMessage: 'Success'
      },
      {
        reference: 'FLASH003',
        accountNumber: 'FLASH002',
        serviceType: 'electricity',
        operation: 'purchase',
        amount: 5000,
        productCode: 2001,
        status: 'processing',
        flashResponseCode: '01',
        flashResponseMessage: 'Processing'
      },
      {
        reference: 'FLASH004',
        accountNumber: 'FLASH003',
        serviceType: 'gift_voucher',
        operation: 'purchase',
        amount: 2000,
        productCode: 3001,
        status: 'failed',
        flashResponseCode: '99',
        flashResponseMessage: 'Insufficient funds'
      }
    ];

    await FlashTransaction.bulkCreate(testTransactions);
    console.log(`✅ Created ${testTransactions.length} Flash transactions`);

    console.log('✅ Flash dummy data seeded successfully!');
    console.log('\n📋 Test Data Summary:');
    console.log('- 16 Flash products (airtime, electricity, gaming, streaming, bill payments, vouchers)');
    console.log('- 4 Flash transactions (different statuses and service types)');
    console.log('- Test account numbers: FLASH001, FLASH002, FLASH003');

  } catch (error) {
    console.error('❌ Error seeding Flash data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedFlashData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Failed to seed Flash data:', error);
      process.exit(1);
    });
}

module.exports = seedFlashData;
