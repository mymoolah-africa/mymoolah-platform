const { Transaction, User } = require('./models');
const bcrypt = require('bcryptjs');

async function createDummyTransactions() {
  try {
    console.log('🔄 Creating 10 dummy transactions for user 0825571055...');

    // Find the user by phone number
    const user = await User.findOne({ 
      where: { phoneNumber: '+27825571055' } 
    });

    if (!user) {
      console.error('❌ User with phone number +27825571055 not found');
      return;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);

    // Create 10 realistic dummy transactions
    const dummyTransactions = [
      {
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        walletId: 'WAL-ACC900157731',
        amount: 250.00,
        type: 'debit',
        status: 'completed',
        description: 'Woolworths Grocery Shopping',
        fee: 0,
        currency: 'ZAR',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        walletId: 'WAL-ACC900157731',
        amount: 1500.00,
        type: 'credit',
        status: 'completed',
        description: 'Salary Payment',
        fee: 0,
        currency: 'ZAR',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        walletId: 'WAL-ACC900157731',
        amount: 85.50,
        type: 'debit',
        status: 'completed',
        description: 'Starbucks Coffee',
        fee: 0,
        currency: 'ZAR',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
      },
      {
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        walletId: 'WAL-ACC900157731',
        amount: 1200.00,
        type: 'debit',
        status: 'completed',
        description: 'Electricity Bill Payment',
        fee: 0,
        currency: 'ZAR',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        walletId: 'WAL-ACC900157731',
        amount: 350.00,
        type: 'debit',
        status: 'completed',
        description: 'Uber Transport',
        fee: 0,
        currency: 'ZAR',
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // 6 days ago
      },
      {
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        walletId: 'WAL-ACC900157731',
        amount: 500.00,
        type: 'credit',
        status: 'completed',
        description: 'Friend Payment Received',
        fee: 0,
        currency: 'ZAR',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      {
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        walletId: 'WAL-ACC900157731',
        amount: 75.00,
        type: 'debit',
        status: 'completed',
        description: 'Vodacom Airtime',
        fee: 0,
        currency: 'ZAR',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
      },
      {
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        walletId: 'WAL-ACC900157731',
        amount: 180.00,
        type: 'debit',
        status: 'completed',
        description: 'Restaurant Dinner',
        fee: 0,
        currency: 'ZAR',
        createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) // 9 days ago
      },
      {
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        walletId: 'WAL-ACC900157731',
        amount: 800.00,
        type: 'debit',
        status: 'completed',
        description: 'Internet Bill Payment',
        fee: 0,
        currency: 'ZAR',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      },
      {
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        walletId: 'WAL-ACC900157731',
        amount: 2000.00,
        type: 'credit',
        status: 'completed',
        description: 'Freelance Payment',
        fee: 0,
        currency: 'ZAR',
        createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) // 11 days ago
      }
    ];

    // Create all transactions
    const createdTransactions = await Transaction.bulkCreate(dummyTransactions);

    console.log(`✅ Successfully created ${createdTransactions.length} dummy transactions:`);
    
    createdTransactions.forEach((tx, index) => {
      const sign = tx.type === 'credit' ? '+' : '-';
      const amount = tx.amount;
      console.log(`${index + 1}. ${sign}R${amount.toFixed(2)} - ${tx.description} (${tx.type})`);
    });

    console.log('\n🎉 All dummy transactions created successfully!');
    console.log('📊 User now has realistic transaction history for testing.');

  } catch (error) {
    console.error('❌ Error creating dummy transactions:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createDummyTransactions(); 