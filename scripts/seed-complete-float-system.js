const { ClientFloat, MerchantFloat, MyMoolahTransaction } = require('../models');

async function seedCompleteFloatSystem() {
  console.log('🏦 Seeding Complete MyMoolah Float System...\n');

  try {
    // Clear existing data
    await MyMoolahTransaction.destroy({ where: {} });
    await MerchantFloat.destroy({ where: {} });
    await ClientFloat.destroy({ where: {} });
    console.log('✅ Cleared existing float system data');

    // Create client float accounts for B2B partners
    const clientFloats = [
      {
        clientId: 'ABC_SPORTS',
        clientName: 'ABC Sports Betting',
        clientType: 'sports_betting',
        floatAccountNumber: 'ABC_FLOAT_001',
        floatAccountName: 'ABC Sports Betting Float',
        currentBalance: 250000.00,
        initialBalance: 250000.00,
        minimumBalance: 50000.00,
        maximumBalance: 500000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        integrationType: 'api',
        apiEndpoint: 'https://api.abcsports.co.za/mymoolah/callback',
        webhookUrl: 'https://api.abcsports.co.za/mymoolah/webhook',
        bankAccountNumber: '1234567890',
        bankCode: 'SBZA',
        bankName: 'Standard Bank',
        maxTransactionAmount: 10000.00,
        dailyTransactionLimit: 100000.00,
        monthlyTransactionLimit: 2000000.00,
        metadata: {
          clientType: 'sports_betting',
          employeeCount: 100000,
          integrationMethod: 'api',
          primaryContact: 'tech@abcsports.co.za'
        }
      },
      {
        clientId: 'XYZ_EMPLOYER',
        clientName: 'XYZ Corporation',
        clientType: 'employer',
        floatAccountNumber: 'XYZ_FLOAT_001',
        floatAccountName: 'XYZ Corporation Float',
        currentBalance: 150000.00,
        initialBalance: 150000.00,
        minimumBalance: 30000.00,
        maximumBalance: 300000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        integrationType: 'api',
        apiEndpoint: 'https://api.xyzcorp.co.za/mymoolah/callback',
        webhookUrl: 'https://api.xyzcorp.co.za/mymoolah/webhook',
        bankAccountNumber: '0987654321',
        bankCode: 'FNBA',
        bankName: 'First National Bank',
        maxTransactionAmount: 5000.00,
        dailyTransactionLimit: 50000.00,
        monthlyTransactionLimit: 1000000.00,
        metadata: {
          clientType: 'employer',
          employeeCount: 5000,
          integrationMethod: 'api',
          primaryContact: 'payroll@xyzcorp.co.za'
        }
      },
      {
        clientId: 'GAMING_PLUS',
        clientName: 'Gaming Plus',
        clientType: 'gaming',
        floatAccountNumber: 'GAMING_FLOAT_001',
        floatAccountName: 'Gaming Plus Float',
        currentBalance: 100000.00,
        initialBalance: 100000.00,
        minimumBalance: 20000.00,
        maximumBalance: 200000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        integrationType: 'webhook',
        webhookUrl: 'https://api.gamingplus.co.za/mymoolah/webhook',
        bankAccountNumber: '1122334455',
        bankCode: 'ABSA',
        bankName: 'Absa Bank',
        maxTransactionAmount: 2000.00,
        dailyTransactionLimit: 25000.00,
        monthlyTransactionLimit: 500000.00,
        metadata: {
          clientType: 'gaming',
          employeeCount: 1000,
          integrationMethod: 'webhook',
          primaryContact: 'support@gamingplus.co.za'
        }
      }
    ];

    await ClientFloat.bulkCreate(clientFloats);
    console.log(`✅ Created ${clientFloats.length} client float accounts`);

    // Create merchant float accounts for retail partners
    const merchantFloats = [
      {
        merchantId: 'SHOPRITE_001',
        merchantName: 'Shoprite Checkers',
        merchantType: 'supermarket',
        floatAccountNumber: 'SHOPRITE_FLOAT_001',
        floatAccountName: 'Shoprite Checkers Float',
        currentBalance: 75000.00,
        initialBalance: 75000.00,
        minimumBalance: 15000.00,
        maximumBalance: 150000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        canSellVouchers: true,
        canRedeemVouchers: true,
        voucherSaleCommission: 0.025,
        voucherRedemptionFee: 0.010,
        bankAccountNumber: '5566778899',
        bankCode: 'NEDB',
        bankName: 'Nedbank',
        maxVoucherAmount: 5000.00,
        dailyVoucherLimit: 50000.00,
        storeNumber: 'SR001',
        location: 'Cape Town CBD',
        metadata: {
          merchantType: 'supermarket',
          storeCount: 1500,
          voucherServices: ['sale', 'redemption'],
          primaryContact: 'finance@shoprite.co.za'
        }
      },
      {
        merchantId: 'PICKNPAY_001',
        merchantName: 'Pick n Pay',
        merchantType: 'supermarket',
        floatAccountNumber: 'PICKNPAY_FLOAT_001',
        floatAccountName: 'Pick n Pay Float',
        currentBalance: 60000.00,
        initialBalance: 60000.00,
        minimumBalance: 12000.00,
        maximumBalance: 120000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        canSellVouchers: true,
        canRedeemVouchers: true,
        voucherSaleCommission: 0.025,
        voucherRedemptionFee: 0.010,
        bankAccountNumber: '9988776655',
        bankCode: 'CAPT',
        bankName: 'Capitec Bank',
        maxVoucherAmount: 3000.00,
        dailyVoucherLimit: 30000.00,
        storeNumber: 'PNP001',
        location: 'Johannesburg CBD',
        metadata: {
          merchantType: 'supermarket',
          storeCount: 1200,
          voucherServices: ['sale', 'redemption'],
          primaryContact: 'payments@pnp.co.za'
        }
      },
      {
        merchantId: 'ENGEN_001',
        merchantName: 'Engen Service Station',
        merchantType: 'fuel_station',
        floatAccountNumber: 'ENGEN_FLOAT_001',
        floatAccountName: 'Engen Service Station Float',
        currentBalance: 45000.00,
        initialBalance: 45000.00,
        minimumBalance: 9000.00,
        maximumBalance: 90000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        canSellVouchers: true,
        canRedeemVouchers: false,
        voucherSaleCommission: 0.030,
        voucherRedemptionFee: 0.000,
        bankAccountNumber: '4433221100',
        bankCode: 'INVE',
        bankName: 'Investec',
        maxVoucherAmount: 1000.00,
        dailyVoucherLimit: 10000.00,
        storeNumber: 'ENG001',
        location: 'Durban CBD',
        metadata: {
          merchantType: 'fuel_station',
          storeCount: 800,
          voucherServices: ['sale'],
          primaryContact: 'finance@engen.co.za'
        }
      }
    ];

    await MerchantFloat.bulkCreate(merchantFloats);
    console.log(`✅ Created ${merchantFloats.length} merchant float accounts`);

    // Create sample MyMoolah transactions
    const transactions = [
      // Client Integration Transactions
      {
        transactionId: 'MM_TXN_001',
        reference: 'ABC_EMP_001',
        businessContext: 'client_integration',
        clientId: 'ABC_SPORTS',
        employeeId: 'EMP_001',
        transactionType: 'vas_purchase',
        transactionDirection: 'outbound',
        amount: 100.00,
        currency: 'ZAR',
        fee: 2.50,
        commission: 0.00,
        netAmount: 97.50,
        clientFloatAccount: 'ABC_FLOAT_001',
        supplierFloatAccount: 'FLASH_FLOAT_001',
        balanceBefore: 250000.00,
        balanceAfter: 249900.00,
        productId: 'AIR_MTN_100',
        productName: 'MTN Airtime R100',
        productCategory: 'airtime',
        supplierId: 'flash',
        status: 'completed',
        processedAt: new Date('2025-08-14T10:00:00Z'),
        completedAt: new Date('2025-08-14T10:01:00Z'),
        clientReference: 'ABC_REF_001',
        supplierReference: 'FLASH_REF_001',
        metadata: {
          employeeWallet: 'ABC_EMP_WALLET_001',
          purchaseMethod: 'client_integration'
        }
      },
      {
        transactionId: 'MM_TXN_002',
        reference: 'XYZ_EMP_001',
        businessContext: 'client_integration',
        clientId: 'XYZ_EMPLOYER',
        employeeId: 'EMP_002',
        transactionType: 'vas_purchase',
        transactionDirection: 'outbound',
        amount: 50.00,
        currency: 'ZAR',
        fee: 1.25,
        commission: 0.00,
        netAmount: 48.75,
        clientFloatAccount: 'XYZ_FLOAT_001',
        supplierFloatAccount: 'MM_FLOAT_001',
        balanceBefore: 150000.00,
        balanceAfter: 149950.00,
        productId: 'DATA_VOD_50',
        productName: 'Vodacom Data 50MB',
        productCategory: 'data',
        supplierId: 'mobilemart',
        status: 'completed',
        processedAt: new Date('2025-08-14T11:00:00Z'),
        completedAt: new Date('2025-08-14T11:01:00Z'),
        clientReference: 'XYZ_REF_001',
        supplierReference: 'MM_REF_001',
        metadata: {
          employeeWallet: 'XYZ_EMP_WALLET_002',
          purchaseMethod: 'client_integration'
        }
      },
      // Merchant Voucher Transactions
      {
        transactionId: 'MM_TXN_003',
        reference: 'SHOPRITE_VOUCHER_001',
        businessContext: 'merchant_voucher',
        merchantId: 'SHOPRITE_001',
        transactionType: 'voucher_sale',
        transactionDirection: 'inbound',
        amount: 200.00,
        currency: 'ZAR',
        fee: 0.00,
        commission: 5.00,
        netAmount: 195.00,
        merchantFloatAccount: 'SHOPRITE_FLOAT_001',
        balanceBefore: 75000.00,
        balanceAfter: 75195.00,
        voucherId: 'VOUCHER_001',
        voucherAmount: 200.00,
        status: 'completed',
        processedAt: new Date('2025-08-14T12:00:00Z'),
        completedAt: new Date('2025-08-14T12:01:00Z'),
        merchantReference: 'SHOPRITE_REF_001',
        metadata: {
          voucherType: 'general',
          customerPhone: '0821234567',
          storeLocation: 'Cape Town CBD'
        }
      },
      {
        transactionId: 'MM_TXN_004',
        reference: 'PICKNPAY_REDEMPTION_001',
        businessContext: 'merchant_voucher',
        merchantId: 'PICKNPAY_001',
        transactionType: 'voucher_redemption',
        transactionDirection: 'outbound',
        amount: 150.00,
        currency: 'ZAR',
        fee: 1.50,
        commission: 0.00,
        netAmount: 148.50,
        merchantFloatAccount: 'PICKNPAY_FLOAT_001',
        balanceBefore: 60000.00,
        balanceAfter: 59848.50,
        voucherId: 'VOUCHER_002',
        voucherAmount: 150.00,
        status: 'completed',
        processedAt: new Date('2025-08-14T13:00:00Z'),
        completedAt: new Date('2025-08-14T13:01:00Z'),
        merchantReference: 'PICKNPAY_REF_001',
        metadata: {
          voucherType: 'general',
          customerPhone: '0839876543',
          storeLocation: 'Johannesburg CBD'
        }
      },
      // Wallet User Transactions
      {
        transactionId: 'MM_TXN_005',
        reference: 'WALLET_USER_001',
        businessContext: 'wallet_user',
        userId: 1,
        transactionType: 'vas_purchase',
        transactionDirection: 'outbound',
        amount: 75.00,
        currency: 'ZAR',
        fee: 1.88,
        commission: 0.00,
        netAmount: 73.12,
        supplierFloatAccount: 'FLASH_FLOAT_001',
        balanceBefore: 1000.00,
        balanceAfter: 926.88,
        productId: 'ELEC_ESKOM_75',
        productName: 'Eskom Electricity R75',
        productCategory: 'electricity',
        supplierId: 'flash',
        status: 'completed',
        processedAt: new Date('2025-08-14T14:00:00Z'),
        completedAt: new Date('2025-08-14T14:01:00Z'),
        supplierReference: 'FLASH_REF_002',
        metadata: {
          meterNumber: '123456789',
          customerPhone: '0821234567',
          purchaseMethod: 'wallet_balance'
        }
      },
      // Supplier Settlement Transactions
      {
        transactionId: 'MM_TXN_006',
        reference: 'FLASH_COMMISSION_001',
        businessContext: 'supplier_settlement',
        transactionType: 'commission',
        transactionDirection: 'outbound',
        amount: 500.00,
        currency: 'ZAR',
        fee: 0.00,
        commission: 0.00,
        netAmount: 500.00,
        supplierFloatAccount: 'FLASH_FLOAT_001',
        balanceBefore: 73500.00,
        balanceAfter: 73000.00,
        status: 'completed',
        processedAt: new Date('2025-08-14T15:00:00Z'),
        completedAt: new Date('2025-08-14T15:01:00Z'),
        supplierReference: 'FLASH_COMM_001',
        metadata: {
          settlementType: 'commission_payout',
          period: 'daily',
          transactionCount: 50
        }
      }
    ];

    await MyMoolahTransaction.bulkCreate(transactions);
    console.log(`✅ Created ${transactions.length} sample MyMoolah transactions`);

    // Update float account balances based on transactions
    for (const transaction of transactions) {
      if (transaction.clientFloatAccount) {
        const clientFloat = await ClientFloat.findOne({
          where: { floatAccountNumber: transaction.clientFloatAccount }
        });
        if (clientFloat) {
          await clientFloat.updateBalance(transaction.netAmount, 
            transaction.transactionDirection === 'inbound' ? 'credit' : 'debit');
        }
      }
      
      if (transaction.merchantFloatAccount) {
        const merchantFloat = await MerchantFloat.findOne({
          where: { floatAccountNumber: transaction.merchantFloatAccount }
        });
        if (merchantFloat) {
          await merchantFloat.updateBalance(transaction.netAmount, 
            transaction.transactionDirection === 'inbound' ? 'credit' : 'debit');
        }
      }
    }

    console.log('✅ Updated float account balances');

    // Display summary
    const clientSummary = await ClientFloat.findAll({
      attributes: ['clientName', 'currentBalance', 'status', 'clientType']
    });

    console.log('\n📊 Client Float Account Summary:');
    clientSummary.forEach(client => {
      console.log(`   ${client.clientName} (${client.clientType}): R${client.currentBalance.toFixed(2)} (${client.status})`);
    });

    const merchantSummary = await MerchantFloat.findAll({
      attributes: ['merchantName', 'currentBalance', 'status', 'merchantType']
    });

    console.log('\n📊 Merchant Float Account Summary:');
    merchantSummary.forEach(merchant => {
      console.log(`   ${merchant.merchantName} (${merchant.merchantType}): R${merchant.currentBalance.toFixed(2)} (${merchant.status})`);
    });

    const transactionSummary = await MyMoolahTransaction.findAll({
      attributes: ['businessContext', 'transactionType', 'status'],
      group: ['businessContext', 'transactionType', 'status']
    });

    console.log('\n📊 Transaction Summary:');
    transactionSummary.forEach(txn => {
      console.log(`   ${txn.businessContext} - ${txn.transactionType}: ${txn.status}`);
    });

    console.log('\n🎉 Complete MyMoolah float system seeding completed successfully!');

  } catch (error) {
    console.error('❌ Complete float system seeding failed:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedCompleteFloatSystem()
    .then(() => {
      console.log('\n✅ Complete float system seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Complete float system seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedCompleteFloatSystem;
