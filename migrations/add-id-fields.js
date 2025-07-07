// Migration script to add ID fields to users table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/mymoolah.db');

async function addIdFields() {
  const db = new sqlite3.Database(dbPath);
  
  return new Promise((resolve, reject) => {
    console.log('🔄 Adding ID fields to users table...');
    
    // Add idNumber column
    db.run(`
      ALTER TABLE users 
      ADD COLUMN idNumber TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Error adding idNumber column:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Added idNumber column');
      
      // Add idType column
      db.run(`
        ALTER TABLE users 
        ADD COLUMN idType TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Error adding idType column:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Added idType column');
        
        // Add idVerified column
        db.run(`
          ALTER TABLE users 
          ADD COLUMN idVerified BOOLEAN DEFAULT 0
        `, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('❌ Error adding idVerified column:', err.message);
            reject(err);
            return;
          }
          console.log('✅ Added idVerified column');
          
          // Create index on idNumber
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_users_idNumber 
            ON users(idNumber)
          `, (err) => {
            if (err) {
              console.error('❌ Error creating idNumber index:', err.message);
              reject(err);
              return;
            }
            console.log('✅ Created idNumber index');
            
            db.close();
            console.log('🎉 Migration completed successfully!');
            resolve();
          });
        });
      });
    });
  });
}

// Run migration if called directly
if (require.main === module) {
  addIdFields()
    .then(() => {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addIdFields };
