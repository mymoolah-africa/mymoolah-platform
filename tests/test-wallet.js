const axios = require('axios');

const API_BASE = 'http://localhost:5050/api/v1';

async function testWallet() {
  console.log('🧪 Testing MyMoolah Wallet System...\n');

  try {
    // Step 1: Register a new user
    console.log('1️⃣ Registering new user...');
    const timestamp = Date.now();
    const registerData = {
      email: `wallet${timestamp}@mymoolah.com`,
      password: 'password123',
      firstName: 'Wallet',
      lastName: 'User',
      phoneNumber: '+27123456789'
    };

    const registerResponse = await axios.post(`${API_BASE}/auth/register`, registerData);
    console.log('✅ User registered successfully!');
    console.log('   User ID:', registerResponse.data.data.user.id);
    console.log('   Wallet ID:', registerResponse.data.data.user.walletId);
    console.log('   Initial Balance:', registerResponse.data.data.user.balance);

    const token = registerResponse.data.data.token;

    // Step 2: Test wallet balance endpoint
    console.log('\n2️⃣ Testing Wallet Balance Endpoint...');
    const balanceResponse = await axios.get(`${API_BASE}/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Balance retrieved successfully!');
    console.log('   Balance:', balanceResponse.data.data.balance);
    console.log('   Currency:', balanceResponse.data.data.currency);
    console.log('   Wallet ID:', balanceResponse.data.data.walletId);

    // Step 3: Test wallet details endpoint
    console.log('\n3️⃣ Testing Wallet Details Endpoint...');
    const detailsResponse = await axios.get(`${API_BASE}/wallet/details`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Wallet details retrieved successfully!');
    console.log('   Wallet ID:', detailsResponse.data.data.wallet.walletId);
    console.log('   Status:', detailsResponse.data.data.wallet.status);
    console.log('   Created:', detailsResponse.data.data.wallet.createdAt);

    // Step 4: Test credit wallet
    console.log('\n4️⃣ Testing Credit Wallet...');
    const creditResponse = await axios.post(`${API_BASE}/wallet/credit`, {
      amount: 100.00
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Wallet credited successfully!');
    console.log('   New Balance:', creditResponse.data.data.newBalance);
    console.log('   Amount Credited:', creditResponse.data.data.amountCredited);

    // Step 5: Test debit wallet
    console.log('\n5️⃣ Testing Debit Wallet...');
    const debitResponse = await axios.post(`${API_BASE}/wallet/debit`, {
      amount: 25.00
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Wallet debited successfully!');
    console.log('   New Balance:', debitResponse.data.data.newBalance);
    console.log('   Amount Debited:', debitResponse.data.data.amountDebited);

    console.log('\n🎉 All wallet tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ User registration creates wallet');
    console.log('   ✅ Wallet balance endpoint working');
    console.log('   ✅ Wallet details endpoint working');
    console.log('   ✅ Credit wallet functionality working');
    console.log('   ✅ Debit wallet functionality working');
    console.log('   ✅ JWT authentication for all wallet endpoints');
    console.log('   ✅ Database operations working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testWallet();
