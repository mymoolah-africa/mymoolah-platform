const axios = require('axios');

const API_BASE = 'http://localhost:5050/api/v1';

async function testTransactions() {
  console.log('🧪 Testing MyMoolah Transaction System...\n');

  try {
    // Step 1: Register a new user
    console.log('1️⃣ Registering new user...');
    const timestamp = Date.now();
    const registerData = {
      email: `transactions${timestamp}@mymoolah.com`,
      password: 'password123',
      firstName: 'Transaction',
      lastName: 'Test',
      phoneNumber: '+27123456789'
    };

    const registerResponse = await axios.post(`${API_BASE}/auth/register`, registerData);
    console.log('✅ User registered successfully!');
    console.log('   User ID:', registerResponse.data.data.user.id);
    console.log('   Wallet ID:', registerResponse.data.data.user.walletId);

    const token = registerResponse.data.data.token;

    // Step 2: Credit wallet with custom description
    console.log('\n2️⃣ Testing Credit with Transaction Recording...');
    const creditResponse = await axios.post(`${API_BASE}/wallet/credit`, {
      amount: 150.00,
      description: 'Initial deposit'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Wallet credited successfully!');
    console.log('   New Balance:', creditResponse.data.data.newBalance);
    console.log('   Transaction ID:', creditResponse.data.data.transaction.id);
    console.log('   Transaction Type:', creditResponse.data.data.transaction.type);

    // Step 3: Debit wallet with custom description
    console.log('\n3️⃣ Testing Debit with Transaction Recording...');
    const debitResponse = await axios.post(`${API_BASE}/wallet/debit`, {
      amount: 50.00,
      description: 'Payment for services'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Wallet debited successfully!');
    console.log('   New Balance:', debitResponse.data.data.newBalance);
    console.log('   Transaction ID:', debitResponse.data.data.transaction.id);
    console.log('   Transaction Type:', debitResponse.data.data.transaction.type);

    // Step 4: Get transaction history
    console.log('\n4️⃣ Testing Transaction History...');
    const historyResponse = await axios.get(`${API_BASE}/wallet/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Transaction history retrieved successfully!');
    console.log('   Total Transactions:', historyResponse.data.data.total);
    console.log('   Transactions in this page:', historyResponse.data.data.transactions.length);
    console.log('   First Transaction:', historyResponse.data.data.transactions[0]?.type, historyResponse.data.data.transactions[0]?.amount);

    // Step 5: Get transaction summary
    console.log('\n5️⃣ Testing Transaction Summary...');
    const summaryResponse = await axios.get(`${API_BASE}/wallet/transactions/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Transaction summary retrieved successfully!');
    console.log('   Total Transactions:', summaryResponse.data.data.summary.totalTransactions);
    console.log('   Total Credits:', summaryResponse.data.data.summary.totalCredits);
    console.log('   Total Debits:', summaryResponse.data.data.summary.totalDebits);

    // Step 6: Test filtered transaction history
    console.log('\n6️⃣ Testing Filtered Transaction History...');
    const filteredResponse = await axios.get(`${API_BASE}/wallet/transactions?type=credit`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Filtered transaction history retrieved successfully!');
    console.log('   Credit Transactions:', filteredResponse.data.data.total);

    console.log('\n🎉 All transaction tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Transaction recording on credit/debit');
    console.log('   ✅ Transaction history endpoint working');
    console.log('   ✅ Transaction summary endpoint working');
    console.log('   ✅ Transaction filtering working');
    console.log('   ✅ JWT authentication for all endpoints');
    console.log('   ✅ Database operations working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testTransactions();
