const Wallet = require('./models/Wallet');
const Transaction = require('./models/Transaction');
const WalletService = require('./services/WalletService');

async function testWalletIntegration() {
  console.log('🧪 Testing Integrated Wallet + Transaction Logic...\n');

  try {
    const walletModel = new Wallet();
    const transactionModel = new Transaction();
    const walletService = new WalletService();

    // 1. Create tables
    console.log('1️⃣ Creating tables...');
    await walletModel.createTable();
    await transactionModel.createTable();
    console.log('✅ Tables created');

    // 2. Create a wallet
    console.log('\n2️⃣ Creating wallet...');
    const walletData = {
      userId: 1,
      walletName: 'Integration Test Wallet',
      initialBalance: 1000.00,
      availableBalance: 1000.00,
      kycStatus: 'verified',
      kycLevel: 'enhanced',
      dailyLimit: 10000.00,
      monthlyLimit: 100000.00,
      singleTransactionLimit: 5000.00
    };
    const wallet = await walletModel.createWallet(walletData);
    console.log('✅ Wallet created:', wallet.walletId);

    // 3. Create a deposit transaction
    console.log('\n3️⃣ Creating deposit transaction...');
    const depositTx = {
      userId: wallet.userId,
      walletId: wallet.walletId,
      transactionType: 'deposit',
      transactionCategory: 'eft',
      amount: 500.00,
      description: 'Test deposit',
      integrationProvider: 'bank_integration',
      integrationStatus: 'completed'
    };
    const depositResult = await walletService.createTransactionAndUpdateWallet(depositTx);
    console.log('✅ Deposit transaction created');
    console.log('   Transaction Ref:', depositResult.transaction.referenceNumber);
    console.log('   New Balance:', depositResult.wallet.balance);

    // 4. Create a withdrawal transaction
    console.log('\n4️⃣ Creating withdrawal transaction...');
    const withdrawalTx = {
      userId: wallet.userId,
      walletId: wallet.walletId,
      transactionType: 'withdrawal',
      transactionCategory: 'bank_transfer',
      amount: 200.00,
      description: 'Test withdrawal',
      recipientName: 'Test User',
      recipientAccount: '1234567890',
      recipientBank: 'FNB',
      integrationProvider: 'dtMercury',
      integrationStatus: 'pending'
    };
    const withdrawalResult = await walletService.createTransactionAndUpdateWallet(withdrawalTx);
    console.log('✅ Withdrawal transaction created');
    console.log('   Transaction Ref:', withdrawalResult.transaction.referenceNumber);
    console.log('   New Balance:', withdrawalResult.wallet.balance);

    // 5. Try to create a transaction that exceeds balance
    console.log('\n5️⃣ Testing insufficient balance...');
    try {
      await walletService.createTransactionAndUpdateWallet({
        userId: wallet.userId,
        walletId: wallet.walletId,
        transactionType: 'withdrawal',
        transactionCategory: 'bank_transfer',
        amount: 10000.00,
        description: 'Should fail',
        recipientName: 'Test User',
        recipientAccount: '1234567890',
        recipientBank: 'FNB',
        integrationProvider: 'dtMercury',
        integrationStatus: 'pending'
      });
      console.log('❌ Should have failed due to insufficient balance');
    } catch (error) {
      console.log('✅ Correctly prevented transaction: ' + error.message);
    }

    // 6. Try to create a transaction that exceeds single transaction limit
    console.log('\n6️⃣ Testing single transaction limit...');
    try {
      await walletService.createTransactionAndUpdateWallet({
        userId: wallet.userId,
        walletId: wallet.walletId,
        transactionType: 'withdrawal',
        transactionCategory: 'bank_transfer',
        amount: 6000.00,
        description: 'Should fail - over single tx limit',
        recipientName: 'Test User',
        recipientAccount: '1234567890',
        recipientBank: 'FNB',
        integrationProvider: 'dtMercury',
        integrationStatus: 'pending'
      });
      console.log('❌ Should have failed due to single transaction limit');
    } catch (error) {
      console.log('✅ Correctly prevented transaction: ' + error.message);
    }

    // 7. List all transactions for the wallet
    console.log('\n7️⃣ Listing all transactions for wallet...');
    const txs = await transactionModel.getTransactionsByWalletId(wallet.walletId, 10);
    txs.forEach(tx => {
      console.log(`   [${tx.transaction_type}] R${tx.amount} - ${tx.status} - Ref: ${tx.reference_number}`);
    });

    // 8. Get final wallet summary
    console.log('\n8️⃣ Final wallet summary...');
    const summary = await walletModel.getWalletSummary(wallet.walletId);
    console.log('   Wallet Name:', summary.walletName);
    console.log('   Balance:', summary.balance);
    console.log('   Available Balance:', summary.availableBalance);
    console.log('   KYC Status:', summary.kycStatus);

    // Close database connections
    await walletModel.closeConnection();
    await transactionModel.closeConnection();

    console.log('\n🎉 Integrated wallet + transaction tests completed successfully!');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

testWalletIntegration();
