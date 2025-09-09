const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

// Initialize Sequelize
const sequelize = new Sequelize(config.development);

// Import models
const DtMercuryBank = require('../models/DtMercuryBank')(sequelize);
const DtMercuryTransaction = require('../models/DtMercuryTransaction')(sequelize);

async function seedDtMercuryData() {
  try {
    console.log('🌱 Seeding dtMercury data...');

    // Clear existing data
    await DtMercuryTransaction.destroy({ where: {} });
    await DtMercuryBank.destroy({ where: {} });

    console.log('✅ Cleared existing dtMercury data');

    // Seed banks
    const banks = [
      {
        bankCode: 'SBZA',
        bankName: 'Standard Bank of South Africa',
        shortName: 'Standard Bank',
        supportsRPP: true,
        supportsRTP: true,
        processingTime: 300000, // 5 minutes
        fee: 2.50,
        isActive: true,
        metadata: {
          swiftCode: 'SBZAZAJJ',
          country: 'ZA',
          currency: 'ZAR'
        }
      },
      {
        bankCode: 'FNBA',
        bankName: 'First National Bank',
        shortName: 'FNB',
        supportsRPP: true,
        supportsRTP: true,
        processingTime: 240000, // 4 minutes
        fee: 2.50,
        isActive: true,
        metadata: {
          swiftCode: 'FIRNZAJJ',
          country: 'ZA',
          currency: 'ZAR'
        }
      },
      {
        bankCode: 'ABSA',
        bankName: 'Absa Bank Limited',
        shortName: 'Absa',
        supportsRPP: true,
        supportsRTP: true,
        processingTime: 300000, // 5 minutes
        fee: 2.50,
        isActive: true,
        metadata: {
          swiftCode: 'ABSAZAJJ',
          country: 'ZA',
          currency: 'ZAR'
        }
      },
      {
        bankCode: 'NEDB',
        bankName: 'Nedbank Limited',
        shortName: 'Nedbank',
        supportsRPP: true,
        supportsRTP: true,
        processingTime: 360000, // 6 minutes
        fee: 2.50,
        isActive: true,
        metadata: {
          swiftCode: 'NEDSZAJJ',
          country: 'ZA',
          currency: 'ZAR'
        }
      },
      {
        bankCode: 'CAPT',
        bankName: 'Capitec Bank Limited',
        shortName: 'Capitec',
        supportsRPP: true,
        supportsRTP: true,
        processingTime: 180000, // 3 minutes
        fee: 2.00,
        isActive: true,
        metadata: {
          swiftCode: 'CABLZAJJ',
          country: 'ZA',
          currency: 'ZAR'
        }
      },
      {
        bankCode: 'INVE',
        bankName: 'Investec Bank Limited',
        shortName: 'Investec',
        supportsRPP: true,
        supportsRTP: true,
        processingTime: 300000, // 5 minutes
        fee: 3.00,
        isActive: true,
        metadata: {
          swiftCode: 'INVEZAJJ',
          country: 'ZA',
          currency: 'ZAR'
        }
      },
      {
        bankCode: 'BIDV',
        bankName: 'Bidvest Bank Limited',
        shortName: 'Bidvest',
        supportsRPP: true,
        supportsRTP: true,
        processingTime: 240000, // 4 minutes
        fee: 2.50,
        isActive: true,
        metadata: {
          swiftCode: 'BIDVZAJJ',
          country: 'ZA',
          currency: 'ZAR'
        }
      },
      {
        bankCode: 'AFRI',
        bankName: 'African Bank Limited',
        shortName: 'African Bank',
        supportsRPP: true,
        supportsRTP: true,
        processingTime: 300000, // 5 minutes
        fee: 2.50,
        isActive: true,
        metadata: {
          swiftCode: 'AFRIZAJJ',
          country: 'ZA',
          currency: 'ZAR'
        }
      }
    ];

    await DtMercuryBank.bulkCreate(banks);
    console.log(`✅ Created ${banks.length} dtMercury banks`);

    // Seed transactions
    const transactions = [
      {
        reference: 'DTM001',
        userId: 1,
        paymentType: 'rtp',
        amount: 5000, // R50.00
        recipientAccountNumber: '1234567890',
        recipientBankCode: 'SBZA',
        recipientName: 'John Smith',
        recipientReference: 'Payment for services',
        kycTier: 'tier1',
        kycStatus: 'verified',
        status: 'completed',
        dtmercuryTransactionId: 'DTM_TXN_001',
        dtmercuryResponseCode: '200',
        dtmercuryResponseMessage: 'Transaction completed successfully',
        fee: 2.50,
        processingTime: 180000, // 3 minutes
        metadata: {
          paymentMethod: 'bank_transfer',
          recipientType: 'individual'
        }
      },
      {
        reference: 'DTM002',
        userId: 1,
        paymentType: 'rpp',
        amount: 15000, // R150.00
        recipientAccountNumber: '0987654321',
        recipientBankCode: 'FNBA',
        recipientName: 'Jane Doe',
        recipientReference: 'Invoice payment',
        kycTier: 'tier1',
        kycStatus: 'verified',
        status: 'pending',
        dtmercuryTransactionId: 'DTM_TXN_002',
        dtmercuryResponseCode: '100',
        dtmercuryResponseMessage: 'Request to Pay initiated',
        fee: 2.50,
        metadata: {
          paymentMethod: 'request_to_pay',
          recipientType: 'individual'
        }
      },
      {
        reference: 'DTM003',
        userId: 1,
        paymentType: 'rtp',
        amount: 75000, // R750.00
        recipientAccountNumber: '1122334455',
        recipientBankCode: 'ABSA',
        recipientName: 'ABC Company Ltd',
        recipientReference: 'Business payment',
        kycTier: 'tier2',
        kycStatus: 'verified',
        status: 'processing',
        dtmercuryTransactionId: 'DTM_TXN_003',
        dtmercuryResponseCode: '150',
        dtmercuryResponseMessage: 'Transaction processing',
        fee: 2.50,
        processingTime: 120000, // 2 minutes
        metadata: {
          paymentMethod: 'bank_transfer',
          recipientType: 'business',
          kycVerified: true
        }
      },
      {
        reference: 'DTM004',
        userId: 1,
        paymentType: 'rtp',
        amount: 2500, // R25.00
        recipientAccountNumber: '5566778899',
        recipientBankCode: 'CAPT',
        recipientName: 'Mike Johnson',
        recipientReference: 'Friend payment',
        kycTier: 'tier1',
        kycStatus: 'verified',
        status: 'failed',
        dtmercuryTransactionId: 'DTM_TXN_004',
        dtmercuryResponseCode: '400',
        dtmercuryResponseMessage: 'Invalid account number',
        fee: 2.00,
        errorMessage: 'Account number does not exist',
        metadata: {
          paymentMethod: 'bank_transfer',
          recipientType: 'individual',
          errorType: 'invalid_account'
        }
      },
      {
        reference: 'DTM005',
        userId: 1,
        paymentType: 'rpp',
        amount: 100000, // R1000.00
        recipientAccountNumber: '9988776655',
        recipientBankCode: 'NEDB',
        recipientName: 'XYZ Corporation',
        recipientReference: 'Large payment',
        kycTier: 'tier2',
        kycStatus: 'pending',
        status: 'pending',
        fee: 2.50,
        metadata: {
          paymentMethod: 'request_to_pay',
          recipientType: 'business',
          kycRequired: true,
          amountThreshold: 'high_value'
        }
      }
    ];

    await DtMercuryTransaction.bulkCreate(transactions);
    console.log(`✅ Created ${transactions.length} dtMercury transactions`);

    console.log('🎉 dtMercury data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Banks: ${banks.length}`);
    console.log(`   • Transactions: ${transactions.length}`);
    console.log('\n🔍 Test Data Includes:');
    console.log('   • Different payment types (RPP & RTP)');
    console.log('   • Various transaction statuses');
    console.log('   • Different KYC tiers and statuses');
    console.log('   • Multiple banks with different capabilities');
    console.log('   • Error scenarios and processing times');

  } catch (error) {
    console.error('❌ Error seeding dtMercury data:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDtMercuryData()
    .then(() => {
      console.log('✅ dtMercury seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ dtMercury seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDtMercuryData;
