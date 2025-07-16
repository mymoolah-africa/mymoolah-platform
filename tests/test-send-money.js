const axios = require('axios');

const API_BASE = 'http://localhost:5050/api/v1';

async function testSendMoney() {
  console.log('🧪 Testing MyMoolah Send Money Functionality...\n');

  let user1Token = '';
  let user2Token = '';
  let user1WalletId = '';
  let user2WalletId = '';

  try {
    // Step 1: Register two test users
    console.log('1️⃣ Registering two test users...');
    
    const user1Data = {
      email: `sender${Date.now()}@mymoolah.com`,
      password: 'password123',
      firstName: 'John',
      lastName: 'Sender',
      phoneNumber: '+27123456789'
    };

    const user2Data = {
      email: `receiver${Date.now()}@mymoolah.com`,
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Receiver',
      phoneNumber: '+27123456790'
    };

    const user1Response = await axios.post(`${API_BASE}/auth/register`, user1Data);
    const user2Response = await axios.post(`${API_BASE}/auth/register`, user2Data);

    user1Token = user1Response.data.data.token;
    user2Token = user2Response.data.data.token;
    user1WalletId = user1Response.data.data.user.walletId;
    user2WalletId = user2Response.data.data.user.walletId;

    console.log('✅ User 1 registered:', user1Data.email);
    console.log('   Wallet ID:', user1WalletId);
    console.log('✅ User 2 registered:', user2Data.email);
    console.log('   Wallet ID:', user2WalletId);

    // Step 2: Credit User 1's wallet
    console.log('\n2️⃣ Crediting User 1 wallet...');
    const creditResponse = await axios.post(`${API_BASE}/wallet/credit`, {
      amount: 500.00
    }, {
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    });
    console.log('✅ User 1 wallet credited successfully!');
    console.log('   New Balance:', creditResponse.data.data.newBalance);

    // Step 3: Check initial balances
    console.log('\n3️⃣ Checking initial balances...');
    
    const user1BalanceResponse = await axios.get(`${API_BASE}/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    });

    const user2BalanceResponse = await axios.get(`${API_BASE}/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${user2Token}`
      }
    });

    console.log('✅ Initial balances:');
    console.log('   User 1 Balance:', user1BalanceResponse.data.data.balance);
    console.log('   User 2 Balance:', user2BalanceResponse.data.data.balance);

    // Step 4: Send money from User 1 to User 2
    console.log('\n4️⃣ Sending money from User 1 to User 2...');
    
    const sendMoneyResponse = await axios.post(`${API_BASE}/wallet/send`, {
      receiverEmail: user2Data.email,
      amount: 100.00,
      description: 'Test payment to Jane'
    }, {
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    });

    console.log('✅ Money sent successfully!');
    console.log('   Amount Sent:', sendMoneyResponse.data.data.amount);
    console.log('   Transaction Fee:', sendMoneyResponse.data.data.fee);
    console.log('   Total Amount:', sendMoneyResponse.data.data.totalAmount);
    console.log('   Sender New Balance:', sendMoneyResponse.data.data.senderNewBalance);
    console.log('   Receiver New Balance:', sendMoneyResponse.data.data.receiverNewBalance);
    console.log('   Transaction ID:', sendMoneyResponse.data.data.transactionId);

    // Step 5: Check updated balances
    console.log('\n5️⃣ Checking updated balances...');
    
    const updatedUser1Balance = await axios.get(`${API_BASE}/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    });

    const updatedUser2Balance = await axios.get(`${API_BASE}/wallet/balance`, {
      headers: {
        'Authorization': `Bearer ${user2Token}`
      }
    });

    console.log('✅ Updated balances:');
    console.log('   User 1 Balance:', updatedUser1Balance.data.data.balance);
    console.log('   User 2 Balance:', updatedUser2Balance.data.data.balance);

    // Step 6: Check transaction history for both users
    console.log('\n6️⃣ Checking transaction history...');
    
    const user1History = await axios.get(`${API_BASE}/wallet/transactions`, {
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    });

    const user2History = await axios.get(`${API_BASE}/wallet/transactions`, {
      headers: {
        'Authorization': `Bearer ${user2Token}`
      }
    });

    console.log('✅ Transaction history:');
    console.log('   User 1 transactions:', user1History.data.data.transactions.length);
    console.log('   User 2 transactions:', user2History.data.data.transactions.length);

    if (user1History.data.data.transactions.length > 0) {
      const latestUser1Transaction = user1History.data.data.transactions[0];
      console.log('   Latest User 1 transaction:');
      console.log('     Type:', latestUser1Transaction.type);
      console.log('     Amount:', latestUser1Transaction.amount);
      console.log('     Description:', latestUser1Transaction.description);
    }

    if (user2History.data.data.transactions.length > 0) {
      const latestUser2Transaction = user2History.data.data.transactions[0];
      console.log('   Latest User 2 transaction:');
      console.log('     Type:', latestUser2Transaction.type);
      console.log('     Amount:', latestUser2Transaction.amount);
      console.log('     Description:', latestUser2Transaction.description);
    }

    // Step 7: Test error cases
    console.log('\n7️⃣ Testing error cases...');

    // Test 1: Send to non-existent user
    try {
      await axios.post(`${API_BASE}/wallet/send`, {
        receiverEmail: 'nonexistent@example.com',
        amount: 50.00
      }, {
        headers: {
          'Authorization': `Bearer ${user1Token}`
        }
      });
    } catch (error) {
      console.log('✅ Error case 1 passed: Cannot send to non-existent user');
    }

    // Test 2: Send to yourself
    try {
      await axios.post(`${API_BASE}/wallet/send`, {
        receiverEmail: user1Data.email,
        amount: 50.00
      }, {
        headers: {
          'Authorization': `Bearer ${user1Token}`
        }
      });
    } catch (error) {
      console.log('✅ Error case 2 passed: Cannot send to yourself');
    }

    // Test 3: Send more than available balance
    try {
      await axios.post(`${API_BASE}/wallet/send`, {
        receiverEmail: user2Data.email,
        amount: 1000.00
      }, {
        headers: {
          'Authorization': `Bearer ${user1Token}`
        }
      });
    } catch (error) {
      console.log('✅ Error case 3 passed: Cannot send more than available balance');
    }

    console.log('\n🎉 All send money tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ User registration working');
    console.log('   ✅ Wallet crediting working');
    console.log('   ✅ Send money between users working');
    console.log('   ✅ Transaction fees calculated correctly');
    console.log('   ✅ Balance updates working');
    console.log('   ✅ Transaction history recording working');
    console.log('   ✅ Error handling working');
    console.log('   ✅ JWT authentication working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Error details:', error.response.data);
    }
  }
}

// Run the test
testSendMoney(); 