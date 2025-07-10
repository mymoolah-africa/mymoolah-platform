const axios = require('axios');

const API_BASE = 'http://localhost:5050/api/v1';

async function testWalletCorrected() {
  console.log('🧪 Testing MyMoolah Wallet System (Corrected Endpoints)...\n');

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

    // Step 2: Test wallet balance endpoint (corrected)
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

    // Step 3: Test wallet details endpoint (corrected)
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

    // Step 4: Test credit wallet (corrected)
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

    // Step 5: Test debit wallet (corrected)
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

    // Step 6: Test transaction history (corrected)
    console.log('\n6️⃣ Testing Transaction History...');
    const historyResponse = await axios.get(`${API_BASE}/wallet/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Transaction history retrieved successfully!');
    console.log('   Total Transactions:', historyResponse.data.data.transactions.length);

    // Step 7: Test transaction summary (corrected)
    console.log('\n7️⃣ Testing Transaction Summary...');
    const summaryResponse = await axios.get(`${API_BASE}/wallet/transactions/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Transaction summary retrieved successfully!');
    console.log('   Summary data received');

    console.log('\n🎉 All wallet tests passed with corrected endpoints!');
    console.log('\n📊 Summary:');
    console.log('   ✅ User registration creates wallet');
    console.log('   ✅ Wallet balance endpoint working (/wallet/balance)');
    console.log('   ✅ Wallet details endpoint working (/wallet/details)');
    console.log('   ✅ Credit wallet functionality working (/wallet/credit)');
    console.log('   ✅ Debit wallet functionality working (/wallet/debit)');
    console.log('   ✅ Transaction history working (/wallet/transactions)');
    console.log('   ✅ Transaction summary working (/wallet/transactions/summary)');
    console.log('   ✅ JWT authentication for all wallet endpoints');
    console.log('   ✅ Database operations working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Error details:', error.response.data);
    }
  }
}

// Run the test
testWalletCorrected(); 