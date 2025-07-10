const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/mymoolah.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing database schema...');

// Drop the existing users table
db.run('DROP TABLE IF EXISTS users', (err) => {
  if (err) {
    console.error('❌ Error dropping table:', err.message);
  } else {
    console.log('✅ Dropped existing users table');
    
    // Create the table with correct schema
    const createTableSQL = `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        phoneNumber TEXT,
        walletId TEXT UNIQUE,
        balance REAL DEFAULT 0.00,
        status TEXT DEFAULT 'active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating table:', err.message);
      } else {
        console.log('✅ Users table created with correct schema');
        console.log('✅ Database schema fixed successfully!');
      }
      db.close();
    });
  }
}); 