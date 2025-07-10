const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/mymoolah.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing transactions table schema...');

db.run('DROP TABLE IF EXISTS transactions', (err) => {
  if (err) {
    console.error('❌ Error dropping transactions table:', err.message);
  } else {
    console.log('✅ Dropped existing transactions table');
    const createTableSQL = `
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        walletId TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'completed',
        reference TEXT,
        metadata TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(walletId) REFERENCES wallets(walletId)
      )
    `;
    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating transactions table:', err.message);
      } else {
        console.log('✅ Transactions table created with correct schema');
        console.log('✅ Transactions database schema fixed successfully!');
      }
      db.close();
    });
  }
}); 