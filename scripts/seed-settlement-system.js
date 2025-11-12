const { SupplierFloat, Settlement } = require('../models');

async function seedSettlementSystem() {
  console.log('🏦 Seeding Settlement System...\n');

  try {
    // Clear existing data
    await Settlement.destroy({ where: {} });
    await SupplierFloat.destroy({ where: {} });
    console.log('✅ Cleared existing settlement data');

    // Create float accounts for all suppliers
    const floatAccounts = [
      {
        supplierId: 'easypay',
        supplierName: 'EasyPay',
        floatAccountNumber: 'EP_FLOAT_001',
        floatAccountName: 'EasyPay Bill Payments Float',
        currentBalance: 50000.00,
        initialBalance: 50000.00,
        minimumBalance: 10000.00,
        maximumBalance: 100000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        bankAccountNumber: '1234567890',
        bankCode: 'SBZA',
        bankName: 'Standard Bank',
        metadata: {
          supplierType: 'bill_payments',
          commissionRate: 0.025,
          settlementCurrency: 'ZAR'
        }
      },
      {
        supplierId: 'flash',
        supplierName: 'Flash',
        floatAccountNumber: 'FLASH_FLOAT_001',
        floatAccountName: 'Flash VAS Float',
        currentBalance: 75000.00,
        initialBalance: 75000.00,
        minimumBalance: 15000.00,
        maximumBalance: 150000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        bankAccountNumber: '0987654321',
        bankCode: 'FNBA',
        bankName: 'First National Bank',
        metadata: {
          supplierType: 'vas_provider',
          commissionRate: 0.40,
          settlementCurrency: 'ZAR',
          primarySupplier: true
        }
      },
      {
        supplierId: 'mobilemart',
        supplierName: 'MobileMart',
        floatAccountNumber: 'MM_FLOAT_001',
        floatAccountName: 'MobileMart VAS Float',
        currentBalance: 60000.00,
        initialBalance: 60000.00,
        minimumBalance: 12000.00,
        maximumBalance: 120000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        bankAccountNumber: '1122334455',
        bankCode: 'ABSA',
        bankName: 'Absa Bank',
        metadata: {
          supplierType: 'vas_provider',
          commissionRate: 0.35,
          settlementCurrency: 'ZAR',
          secondarySupplier: true
        }
      },
      {
        supplierId: 'peach',
        supplierName: 'Peach Payments',
        floatAccountNumber: 'PEACH_FLOAT_001',
        floatAccountName: 'Peach Payments Float',
        currentBalance: 100000.00,
        initialBalance: 100000.00,
        minimumBalance: 20000.00,
        maximumBalance: 200000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        bankAccountNumber: '5566778899',
        bankCode: 'NEDB',
        bankName: 'Nedbank',
        metadata: {
          supplierType: 'payment_processor',
          commissionRate: 0.025,
          settlementCurrency: 'ZAR',
          primaryPaymentProvider: true
        }
      },
      {
        supplierId: 'dtmercury',
        supplierName: 'dtMercury',
        floatAccountNumber: 'DTM_FLOAT_001',
        floatAccountName: 'dtMercury PayShap Float',
        currentBalance: 80000.00,
        initialBalance: 80000.00,
        minimumBalance: 16000.00,
        maximumBalance: 160000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        bankAccountNumber: '9988776655',
        bankCode: 'CAPT',
        bankName: 'Capitec Bank',
        metadata: {
          supplierType: 'payshap_provider',
          commissionRate: 0.02,
          settlementCurrency: 'ZAR',
          payshapOnly: true
        }
      },
      {
        supplierId: 'zapper',
        supplierName: 'Zapper',
        floatAccountNumber: 'ZAPPER_FLOAT_001',
        floatAccountName: 'Zapper QR Payments Float',
        currentBalance: 0.00,
        initialBalance: 0.00,
        minimumBalance: 0.00,
        maximumBalance: 1000000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        bankAccountNumber: null,
        bankCode: null,
        bankName: null,
        metadata: {
          supplierType: 'qr_payment_processor',
          settlementCurrency: 'ZAR',
          feeStructure: 'per_transaction',
          defaultFeeInclVat: 3.00
        }
      }
    ];

    await SupplierFloat.bulkCreate(floatAccounts);
    console.log(`✅ Created ${floatAccounts.length} supplier float accounts`);

    // Create sample settlement transactions
    const settlements = [
      {
        settlementId: 'SETT_001',
        supplierId: 'easypay',
        floatAccountNumber: 'EP_FLOAT_001',
        settlementType: 'topup',
        settlementDirection: 'inbound',
        amount: 25000.00,
        currency: 'ZAR',
        fee: 0.00,
        netAmount: 25000.00,
        balanceBefore: 50000.00,
        balanceAfter: 75000.00,
        status: 'completed',
        settlementMethod: 'eft',
        bankAccountNumber: '1234567890',
        bankCode: 'SBZA',
        bankName: 'Standard Bank',
        processedAt: new Date('2025-08-14T08:00:00Z'),
        completedAt: new Date('2025-08-14T08:05:00Z'),
        metadata: {
          transactionType: 'float_topup',
          reference: 'EP_TOPUP_001'
        }
      },
      {
        settlementId: 'SETT_002',
        supplierId: 'flash',
        floatAccountNumber: 'FLASH_FLOAT_001',
        settlementType: 'commission',
        settlementDirection: 'outbound',
        amount: 1500.00,
        currency: 'ZAR',
        fee: 0.00,
        netAmount: 1500.00,
        balanceBefore: 75000.00,
        balanceAfter: 73500.00,
        status: 'completed',
        settlementMethod: 'eft',
        bankAccountNumber: '0987654321',
        bankCode: 'FNBA',
        bankName: 'First National Bank',
        processedAt: new Date('2025-08-14T09:00:00Z'),
        completedAt: new Date('2025-08-14T09:02:00Z'),
        metadata: {
          transactionType: 'commission_payout',
          reference: 'FLASH_COMM_001'
        }
      },
      {
        settlementId: 'SETT_003',
        supplierId: 'peach',
        floatAccountNumber: 'PEACH_FLOAT_001',
        settlementType: 'topup',
        settlementDirection: 'inbound',
        amount: 50000.00,
        currency: 'ZAR',
        fee: 0.00,
        netAmount: 50000.00,
        balanceBefore: 100000.00,
        balanceAfter: 150000.00,
        status: 'completed',
        settlementMethod: 'payShap',
        bankAccountNumber: '5566778899',
        bankCode: 'NEDB',
        bankName: 'Nedbank',
        processedAt: new Date('2025-08-14T10:00:00Z'),
        completedAt: new Date('2025-08-14T10:01:00Z'),
        metadata: {
          transactionType: 'float_topup',
          reference: 'PEACH_TOPUP_001'
        }
      },
      {
        settlementId: 'SETT_004',
        supplierId: 'dtmercury',
        floatAccountNumber: 'DTM_FLOAT_001',
        settlementType: 'fee',
        settlementDirection: 'outbound',
        amount: 800.00,
        currency: 'ZAR',
        fee: 0.00,
        netAmount: 800.00,
        balanceBefore: 80000.00,
        balanceAfter: 79200.00,
        status: 'completed',
        settlementMethod: 'payShap',
        bankAccountNumber: '9988776655',
        bankCode: 'CAPT',
        bankName: 'Capitec Bank',
        processedAt: new Date('2025-08-14T11:00:00Z'),
        completedAt: new Date('2025-08-14T11:01:00Z'),
        metadata: {
          transactionType: 'transaction_fees',
          reference: 'DTM_FEES_001'
        }
      },
      {
        settlementId: 'SETT_005',
        supplierId: 'mobilemart',
        floatAccountNumber: 'MM_FLOAT_001',
        settlementType: 'adjustment',
        settlementDirection: 'inbound',
        amount: 5000.00,
        currency: 'ZAR',
        fee: 0.00,
        netAmount: 5000.00,
        balanceBefore: 60000.00,
        balanceAfter: 65000.00,
        status: 'completed',
        settlementMethod: 'eft',
        bankAccountNumber: '1122334455',
        bankCode: 'ABSA',
        bankName: 'Absa Bank',
        processedAt: new Date('2025-08-14T12:00:00Z'),
        completedAt: new Date('2025-08-14T12:03:00Z'),
        metadata: {
          transactionType: 'balance_adjustment',
          reference: 'MM_ADJ_001',
          reason: 'Reconciliation adjustment'
        }
      }
    ];

    await Settlement.bulkCreate(settlements);
    console.log(`✅ Created ${settlements.length} sample settlement transactions`);

    // Update float account balances based on settlements
    for (const settlement of settlements) {
      const floatAccount = await SupplierFloat.findOne({
        where: { floatAccountNumber: settlement.floatAccountNumber }
      });
      
      if (floatAccount) {
        await floatAccount.updateBalance(settlement.netAmount, 
          settlement.settlementDirection === 'inbound' ? 'credit' : 'debit');
      }
    }

    console.log('✅ Updated float account balances');

    // Display summary
    const floatSummary = await SupplierFloat.findAll({
      attributes: ['supplierName', 'currentBalance', 'status', 'settlementMethod']
    });

    console.log('\n📊 Float Account Summary:');
    floatSummary.forEach(float => {
      console.log(`   ${float.supplierName}: R${float.currentBalance.toFixed(2)} (${float.status})`);
    });

    const settlementSummary = await Settlement.findAll({
      attributes: ['settlementType', 'settlementDirection', 'status'],
      group: ['settlementType', 'settlementDirection', 'status']
    });

    console.log('\n📊 Settlement Summary:');
    settlementSummary.forEach(settlement => {
      console.log(`   ${settlement.settlementType} (${settlement.settlementDirection}): ${settlement.status}`);
    });

    console.log('\n🎉 Settlement system seeding completed successfully!');

  } catch (error) {
    console.error('❌ Settlement system seeding failed:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedSettlementSystem()
    .then(() => {
      console.log('\n✅ Settlement system seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Settlement system seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedSettlementSystem;
