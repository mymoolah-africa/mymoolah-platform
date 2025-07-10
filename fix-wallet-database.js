const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/mymoolah.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing wallet database schema...');

// Drop the existing wallets table
db.run('DROP TABLE IF EXISTS wallets', (err) => {
  if (err) {
    console.error('❌ Error dropping table:', err.message);
  } else {
    console.log('✅ Dropped existing wallets table');
    
    // Create the table with correct schema
    const createTableSQL = `
      CREATE TABLE wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        walletId TEXT UNIQUE NOT NULL,
        balance REAL DEFAULT 0.00,
        currency TEXT DEFAULT 'ZAR',
        status TEXT DEFAULT 'active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
      )
    `;

    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating table:', err.message);
      } else {
        console.log('✅ Wallets table created with correct schema');
        console.log('✅ Wallet database schema fixed successfully!');
      }
      db.close();
    });
  }
}); 