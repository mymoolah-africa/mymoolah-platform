const axios = require('axios');

const BASE_URL = 'http://localhost:5050/api/v1';
let authToken = '';
let user1WalletId = '';
let user2WalletId = '';

// Test configuration
const testUsers = {
  user1: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@mymoolah.com',
    password: 'password123'
  },
  user2: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@mymoolah.com',
    password: 'password123'
  }
};

async function testWalletFeatures() {
  console.log('🧪 Testing MyMoolah Wallet Features...\n');

  try {
    // Step 1: Register two users
    console.log('1️⃣ Registering test users...');
    
    const user1Response = await axios.post(`${BASE_URL}/auth/register`, testUsers.user1);
    const user2Response = await axios.post(`${BASE_URL}/auth/register`, testUsers.user2);
    
    user1WalletId = user1Response.data.data.user.walletId;
    user2WalletId = user2Response.data.data.user.walletId;
    
    console.log('✅ User 1 registered:', user1Response.data.data.user.email);
    console.log('   Wallet ID:', user1WalletId);
    console.log('✅ User 2 registered:', user2Response.data.data.user.email);
    console.log('   Wallet ID:', user2WalletId);

    // Step 2: Login user1 to get auth token
    console.log('\n2️⃣ Logging in User 1...');
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUsers.user1.email,
      password: testUsers.user1.password
    });
    
    authToken = loginResponse.data.data.token;
    console.log('✅ User 1 logged in successfully');
    console.log('   Token received:', authToken.substring(0, 20) + '...');

    // Step 3: Check wallet balance
    console.log('\n3️⃣ Checking wallet balance...');
    
    const balanceResponse = await axios.get(`${BASE_URL}/wallets/${user1WalletId}/balance`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Wallet balance retrieved:');
    console.log('   Balance:', balanceResponse.data.data.balance);
    console.log('   Currency:', balanceResponse.data.data.currency);
    console.log('   Total Transactions:', balanceResponse.data.data.stats.totalTransactions);

    // Step 4: Send money from user1 to user2
    console.log('\n4️⃣ Sending money from User 1 to User 2...');
    
    const sendMoneyResponse = await axios.post(`${BASE_URL}/wallets/send`, {
      receiverWalletId: user2WalletId,
      amount: 100.00,
      description: 'Test payment to Jane'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Money sent successfully:');
    console.log('   Amount:', sendMoneyResponse.data.data.transaction.amount);
    console.log('   Fee:', sendMoneyResponse.data.data.transaction.fee);
    console.log('   Total Amount:', sendMoneyResponse.data.data.transaction.totalAmount);
    console.log('   New Balance:', sendMoneyResponse.data.data.newBalance);
    console.log('   Transaction ID:', sendMoneyResponse.data.data.transaction.transactionId);

    // Step 5: Check updated wallet balance
    console.log('\n5️⃣ Checking updated wallet balance...');
    
    const updatedBalanceResponse = await axios.get(`${BASE_URL}/wallets/${user1WalletId}/balance`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Updated wallet balance:');
    console.log('   New Balance:', updatedBalanceResponse.data.data.balance);
    console.log('   Total Sent:', updatedBalanceResponse.data.data.stats.totalSent);

    // Step 6: Get transaction history
    console.log('\n6️⃣ Getting transaction history...');
    
    const historyResponse = await axios.get(`${BASE_URL}/wallets/${user1WalletId}/transactions`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Transaction history retrieved:');
    console.log('   Total Transactions:', historyResponse.data.data.transactions.length);
    if (historyResponse.data.data.transactions.length > 0) {
      const latestTransaction = historyResponse.data.data.transactions[0];
      console.log('   Latest Transaction:');
      console.log('     Type:', latestTransaction.type);
      console.log('     Amount:', latestTransaction.amount);
      console.log('     Status:', latestTransaction.status);
    }

    // Step 7: Get wallet statistics
    console.log('\n7️⃣ Getting wallet statistics...');
    
    const statsResponse = await axios.get(`${BASE_URL}/wallets/${user1WalletId}/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Wallet statistics:');
    console.log('   Current Balance:', statsResponse.data.data.currentBalance);
    console.log('   Total Sent:', statsResponse.data.data.stats.totalSent);
    console.log('   Total Received:', statsResponse.data.data.stats.totalReceived);
    console.log('   Total Fees:', statsResponse.data.data.stats.totalFees);

    console.log('\n�� All wallet feature tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ User registration working');
    console.log('   ✅ User login working');
    console.log('   ✅ Wallet balance checking working');
    console.log('   ✅ Money transfer working');
    console.log('   ✅ Transaction history working');
    console.log('   ✅ Wallet statistics working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Error details:', error.response.data);
    }
  }
}

// Run the tests
testWalletFeatures();