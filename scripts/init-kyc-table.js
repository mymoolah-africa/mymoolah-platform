const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '../data/mymoolah.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

console.log('🔧 Initializing KYC table...');

// Create KYC table
const createKycTable = `
CREATE TABLE IF NOT EXISTS kyc (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  documentType TEXT NOT NULL,
  documentNumber TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewedAt DATETIME,
  reviewerNotes TEXT,
  FOREIGN KEY (userId) REFERENCES users(id)
);
`;

db.run(createKycTable, (err) => {
  if (err) {
    console.error('❌ Error creating KYC table:', err.message);
  } else {
    console.log('✅ KYC table created successfully');
    
    // Insert some sample KYC data for testing
    const sampleKycData = [
      {
        userId: 1,
        documentType: 'ID Card',
        documentNumber: 'ID123456789',
        status: 'approved',
        reviewerNotes: 'Document verified successfully'
      },
      {
        userId: 2,
        documentType: 'Passport',
        documentNumber: 'PASS987654321',
        status: 'pending',
        reviewerNotes: null
      },
      {
        userId: 3,
        documentType: 'Driver License',
        documentNumber: 'DL456789123',
        status: 'rejected',
        reviewerNotes: 'Document expired'
      }
    ];

    const insertKyc = `
      INSERT INTO kyc (userId, documentType, documentNumber, status, reviewerNotes)
      VALUES (?, ?, ?, ?, ?)
    `;

    let completed = 0;
    sampleKycData.forEach((data) => {
      db.run(insertKyc, [
        data.userId,
        data.documentType,
        data.documentNumber,
        data.status,
        data.reviewerNotes
      ], (err) => {
        if (err) {
          console.error('❌ Error inserting KYC data:', err.message);
        } else {
          completed++;
          if (completed === sampleKycData.length) {
            console.log('✅ Sample KYC data inserted successfully');
            console.log('🎉 KYC table initialization complete!');
            db.close();
          }
        }
      });
    });
  }
}); 