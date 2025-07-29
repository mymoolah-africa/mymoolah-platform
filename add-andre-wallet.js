const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'data', 'mymoolah.db');
const db = new sqlite3.Database(dbPath);

// Add wallet for Andre Botes (user ID 6)
const addAndreWallet = () => {
  const walletData = {
    walletId: 'WAL20250729123461ANDRE',
    userId: 6,
    balance: 5000.00,
    status: 'active',
    account_number: '27825571055',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const query = `
    INSERT INTO wallets (walletId, userId, balance, status, account_number, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    walletData.walletId,
    walletData.userId,
    walletData.balance,
    walletData.status,
    walletData.account_number,
    walletData.created_at,
    walletData.updated_at
  ], function(err) {
    if (err) {
      console.error('❌ Error adding wallet for Andre:', err.message);
    } else {
      console.log('✅ Successfully added wallet for Andre Botes!');
      console.log('Wallet ID:', walletData.walletId);
      console.log('Balance: R', walletData.balance);
      console.log('Account Number:', walletData.account_number);
    }
    db.close();
  });
};

// Run the script
addAndreWallet(); 