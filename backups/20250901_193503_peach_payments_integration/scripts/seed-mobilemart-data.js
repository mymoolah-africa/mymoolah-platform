const { MobileMartProduct, MobileMartTransaction } = require('../models');

/**
 * Seed MobileMart dummy data for testing
 * Based on MobileMart Product Master List and Fulcrum API documentation
 */

async function seedMobileMartData() {
  try {
    console.log('🌱 Seeding MobileMart dummy data...');

    // Clear existing data
    await MobileMartTransaction.destroy({ where: {} });
    await MobileMartProduct.destroy({ where: {} });

    // Create test MobileMart products based on documentation
    const testProducts = [
      // Airtime Products
      { merchantProductId: 'MM_MTN_AIR_001', productName: 'MTN Airtime R10', vasType: 'airtime', provider: 'MTN', commission: 2.50, minAmount: 1000, maxAmount: 1000, isPromotional: false },
      { merchantProductId: 'MM_MTN_AIR_002', productName: 'MTN Airtime R20', vasType: 'airtime', provider: 'MTN', commission: 2.50, minAmount: 2000, maxAmount: 2000, isPromotional: false },
      { merchantProductId: 'MM_MTN_AIR_003', productName: 'MTN Airtime R50', vasType: 'airtime', provider: 'MTN', commission: 2.50, minAmount: 5000, maxAmount: 5000, isPromotional: true, promotionalDiscount: 5.00 },
      { merchantProductId: 'MM_VOD_AIR_001', productName: 'Vodacom Airtime R10', vasType: 'airtime', provider: 'Vodacom', commission: 2.75, minAmount: 1000, maxAmount: 1000, isPromotional: false },
      { merchantProductId: 'MM_VOD_AIR_002', productName: 'Vodacom Airtime R20', vasType: 'airtime', provider: 'Vodacom', commission: 2.75, minAmount: 2000, maxAmount: 2000, isPromotional: false },
      { merchantProductId: 'MM_CELL_AIR_001', productName: 'CellC Airtime R10', vasType: 'airtime', provider: 'CellC', commission: 3.00, minAmount: 1000, maxAmount: 1000, isPromotional: false },
      
      // Data Products
      { merchantProductId: 'MM_MTN_DATA_001', productName: 'MTN 100MB Data', vasType: 'data', provider: 'MTN', commission: 3.50, minAmount: 1500, maxAmount: 1500, isPromotional: false },
      { merchantProductId: 'MM_MTN_DATA_002', productName: 'MTN 500MB Data', vasType: 'data', provider: 'MTN', commission: 3.50, minAmount: 5000, maxAmount: 5000, isPromotional: true, promotionalDiscount: 10.00 },
      { merchantProductId: 'MM_VOD_DATA_001', productName: 'Vodacom 100MB Data', vasType: 'data', provider: 'Vodacom', commission: 3.75, minAmount: 1500, maxAmount: 1500, isPromotional: false },
      { merchantProductId: 'MM_VOD_DATA_002', productName: 'Vodacom 1GB Data', vasType: 'data', provider: 'Vodacom', commission: 3.75, minAmount: 8000, maxAmount: 8000, isPromotional: false },
      
      // Electricity Products
      { merchantProductId: 'MM_ESKOM_ELEC_001', productName: 'Eskom Prepaid R50', vasType: 'electricity', provider: 'Eskom', commission: 1.25, minAmount: 5000, maxAmount: 5000, isPromotional: false },
      { merchantProductId: 'MM_ESKOM_ELEC_002', productName: 'Eskom Prepaid R100', vasType: 'electricity', provider: 'Eskom', commission: 1.25, minAmount: 10000, maxAmount: 10000, isPromotional: true, promotionalDiscount: 2.00 },
      { merchantProductId: 'MM_CITYPOWER_ELEC_001', productName: 'City Power R50', vasType: 'electricity', provider: 'City Power', commission: 1.50, minAmount: 5000, maxAmount: 5000, isPromotional: false },
      
      // Bill Payment Products
      { merchantProductId: 'MM_DSTV_BILL_001', productName: 'DSTV Payment', vasType: 'bill_payment', provider: 'DSTV', commission: 2.00, minAmount: 1000, maxAmount: 50000, isPromotional: false },
      { merchantProductId: 'MM_EDGARS_BILL_001', productName: 'Edgars Account Payment', vasType: 'bill_payment', provider: 'Edgars', commission: 2.50, minAmount: 1000, maxAmount: 100000, isPromotional: false },
      { merchantProductId: 'MM_ACKERMANS_BILL_001', productName: 'Ackermans Account Payment', vasType: 'bill_payment', provider: 'Ackermans', commission: 2.50, minAmount: 1000, maxAmount: 100000, isPromotional: false },
      
      // Gaming Products
      { merchantProductId: 'MM_STEAM_GAME_001', productName: 'Steam R50 Voucher', vasType: 'gaming', provider: 'Steam', commission: 4.00, minAmount: 5000, maxAmount: 5000, isPromotional: false },
      { merchantProductId: 'MM_GOOGLE_GAME_001', productName: 'Google Play R50', vasType: 'gaming', provider: 'Google Play', commission: 3.50, minAmount: 5000, maxAmount: 5000, isPromotional: false },
      
      // Streaming Products
      { merchantProductId: 'MM_NETFLIX_STREAM_001', productName: 'Netflix R100 Voucher', vasType: 'streaming', provider: 'Netflix', commission: 4.50, minAmount: 10000, maxAmount: 10000, isPromotional: false },
      { merchantProductId: 'MM_SPOTIFY_STREAM_001', productName: 'Spotify R50 Voucher', vasType: 'streaming', provider: 'Spotify', commission: 5.00, minAmount: 5000, maxAmount: 5000, isPromotional: true, promotionalDiscount: 15.00 }
    ];

    await MobileMartProduct.bulkCreate(testProducts);
    console.log(`✅ Created ${testProducts.length} MobileMart products`);

    // Create test MobileMart transactions
    const testTransactions = [
      {
        reference: 'MM001',
        vasType: 'airtime',
        merchantProductId: 'MM_MTN_AIR_001',
        amount: 1000,
        mobileNumber: '27821234567',
        status: 'completed',
        mobilemartResponseCode: '00',
        mobilemartResponseMessage: 'Success',
        transactionId: 'MM_TXN_001'
      },
      {
        reference: 'MM002',
        vasType: 'data',
        merchantProductId: 'MM_MTN_DATA_001',
        amount: 1500,
        mobileNumber: '27821234567',
        status: 'completed',
        mobilemartResponseCode: '00',
        mobilemartResponseMessage: 'Success',
        transactionId: 'MM_TXN_002'
      },
      {
        reference: 'MM003',
        vasType: 'electricity',
        merchantProductId: 'MM_ESKOM_ELEC_001',
        amount: 5000,
        meterNumber: '123456789012345',
        status: 'processing',
        mobilemartResponseCode: '01',
        mobilemartResponseMessage: 'Processing',
        transactionId: 'MM_TXN_003'
      },
      {
        reference: 'MM004',
        vasType: 'bill_payment',
        merchantProductId: 'MM_DSTV_BILL_001',
        amount: 5000,
        accountNumber: 'DSTV123456',
        status: 'failed',
        mobilemartResponseCode: '99',
        mobilemartResponseMessage: 'Insufficient funds',
        errorMessage: 'Account has insufficient balance'
      }
    ];

    await MobileMartTransaction.bulkCreate(testTransactions);
    console.log(`✅ Created ${testTransactions.length} MobileMart transactions`);

    console.log('✅ MobileMart dummy data seeded successfully!');
    console.log('\n📋 Test Data Summary:');
    console.log('- 20 MobileMart products (airtime, data, electricity, bill payments, gaming, streaming)');
    console.log('- 4 MobileMart transactions (different statuses and VAS types)');
    console.log('- Promotional products with discounts included');
    console.log('- Test mobile numbers and meter numbers for different VAS types');

  } catch (error) {
    console.error('❌ Error seeding MobileMart data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedMobileMartData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Failed to seed MobileMart data:', error);
      process.exit(1);
    });
}

module.exports = seedMobileMartData;
