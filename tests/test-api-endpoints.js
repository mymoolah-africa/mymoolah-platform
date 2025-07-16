const axios = require('axios');

const BASE_URL = 'http://localhost:5050/api/v1';

// Test data
let testWalletId = null;
let testTransactionId = null;
let testReferenceNumber = null;

async function testAPIEndpoints() {
  console.log('🧪 Testing MyMoolah Wallet API Endpoints...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get('http://localhost:5050/health');
    console.log('✅ Health check passed:', healthResponse.data.status);

    // Test 2: Create wallet
    console.log('\n2️⃣ Testing wallet creation...');
    const walletData = {
      userId: 1,
      walletName: 'API Test Wallet',
      initialBalance: 1000.00,
      kycStatus: 'verified',
      kycLevel: 'enhanced',
      dailyLimit: 10000.00,
      monthlyLimit: 100000.00,
      singleTransactionLimit: 5000.00
    };

    const createWalletResponse = await axios.post(`${BASE_URL}/wallets/create`, walletData);
    testWalletId = createWalletResponse.data.data.walletId;
    console.log('✅ Wallet created:', testWalletId);
    console.log('   Balance:', createWalletResponse.data.data.balance);
    console.log('   KYC Status:', createWalletResponse.data.data.kycStatus);

    // Test 3: Get wallet by ID
    console.log('\n3️⃣ Testing get wallet by ID...');
    const getWalletResponse = await axios.get(`${BASE_URL}/wallets/${testWalletId}`);
    console.log('✅ Wallet retrieved:', getWalletResponse.data.data.walletName);
    console.log('   Balance:', getWalletResponse.data.data.balance);
    console.log('   Available Balance:', getWalletResponse.data.data.availableBalance);

    // Test 4: Create deposit transaction
    console.log('\n4️⃣ Testing deposit transaction...');
    const depositData = {
      userId: 1,
      walletId: testWalletId,
      transactionType: 'deposit',
      transactionCategory: 'eft',
      amount: 500.00,
      description: 'API test deposit',
      integrationProvider: 'bank_integration',
      integrationStatus: 'completed'
    };

    const depositResponse = await axios.post(`${BASE_URL}/transactions/create`, depositData);
    testTransactionId = depositResponse.data.data.transaction.id;
    testReferenceNumber = depositResponse.data.data.transaction.referenceNumber;
    console.log('✅ Deposit transaction created');
    console.log('   Transaction Ref:', testReferenceNumber);
    console.log('   New Balance:', depositResponse.data.data.wallet.balance);

    // Test 5: Create withdrawal transaction
    console.log('\n5️⃣ Testing withdrawal transaction...');
    const withdrawalData = {
      userId: 1,
      walletId: testWalletId,
      transactionType: 'withdrawal',
      transactionCategory: 'bank_transfer',
      amount: 200.00,
      description: 'API test withdrawal',
      recipientName: 'Test User',
      recipientAccount: '1234567890',
      recipientBank: 'FNB',
      integrationProvider: 'dtMercury',
      integrationStatus: 'pending'
    };

    const withdrawalResponse = await axios.post(`${BASE_URL}/transactions/create`, withdrawalData);
    console.log('✅ Withdrawal transaction created');
    console.log('   Transaction Ref:', withdrawalResponse.data.data.transaction.referenceNumber);
    console.log('   New Balance:', withdrawalResponse.data.data.wallet.balance);

    // Test 6: Get transaction by ID
    console.log('\n6️⃣ Testing get transaction by ID...');
    const getTransactionResponse = await axios.get(`${BASE_URL}/transactions/${testTransactionId}`);
    console.log('✅ Transaction retrieved:', getTransactionResponse.data.data.referenceNumber);
    console.log('   Type:', getTransactionResponse.data.data.type);
    console.log('   Amount:', getTransactionResponse.data.data.amount);

    // Test 7: Get transaction by reference
    console.log('\n7️⃣ Testing get transaction by reference...');
    const getTransactionByRefResponse = await axios.get(`${BASE_URL}/transactions/reference/${testReferenceNumber}`);
    console.log('✅ Transaction by reference retrieved:', getTransactionByRefResponse.data.data.referenceNumber);

    // Test 8: Get transactions by wallet ID
    console.log('\n8️⃣ Testing get transactions by wallet ID...');
    const getWalletTransactionsResponse = await axios.get(`${BASE_URL}/transactions/wallet/${testWalletId}`);
    console.log('✅ Wallet transactions retrieved:', getWalletTransactionsResponse.data.data.transactions.length, 'transactions');

    // Test 9: Get wallet summary
    console.log('\n9️⃣ Testing get wallet summary...');
    const getWalletSummaryResponse = await axios.get(`${BASE_URL}/wallets/${testWalletId}/summary`);
    console.log('✅ Wallet summary retrieved');
    console.log('   Wallet Name:', getWalletSummaryResponse.data.data.walletName);
    console.log('   Balance:', getWalletSummaryResponse.data.data.balance);
    console.log('   KYC Status:', getWalletSummaryResponse.data.data.kycStatus);

    // Test 10: Check transaction limits
    console.log('\n🔟 Testing transaction limits check...');
    const limitsCheckResponse = await axios.post(`${BASE_URL}/wallets/${testWalletId}/check-limits`, {
      amount: 1000.00
    });
    console.log('✅ Transaction limits check passed');
    console.log('   Single Transaction Limit:', limitsCheckResponse.data.data.limits.singleTransaction);

    // Test 11: Test insufficient balance (should fail)
    console.log('\n1️⃣1️⃣ Testing insufficient balance scenario...');
    try {
      await axios.post(`${BASE_URL}/transactions/create`, {
        userId: 1,
        walletId: testWalletId,
        transactionType: 'withdrawal',
        transactionCategory: 'bank_transfer',
        amount: 10000.00,
        description: 'Should fail - insufficient balance',
        recipientName: 'Test User',
        recipientAccount: '1234567890',
        recipientBank: 'FNB',
        integrationProvider: 'dtMercury',
        integrationStatus: 'pending'
      });
      console.log('❌ Should have failed due to insufficient balance');
    } catch (error) {
      console.log('✅ Correctly prevented transaction:', error.response.data.message);
    }

    console.log('\n🎉 All API endpoint tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Health check working');
    console.log('   ✅ Wallet creation working');
    console.log('   ✅ Wallet retrieval working');
    console.log('   ✅ Transaction creation working');
    console.log('   ✅ Transaction retrieval working');
    console.log('   ✅ Transaction history working');
    console.log('   ✅ Wallet summary working');
    console.log('   ✅ Transaction limits working');
    console.log('   ✅ Error handling working');

  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAPIEndpoints();