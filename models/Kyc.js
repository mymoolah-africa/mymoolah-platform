const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Kyc {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initTable();
  }

  // Create the KYC table if it doesn't exist
  initTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS kyc (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        documentType TEXT NOT NULL,
        documentNumber TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewedAt DATETIME,
        reviewerNotes TEXT,
        FOREIGN KEY(userId) REFERENCES users(id)
      )
    `;
    this.db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating KYC table:', err.message);
      } else {
        console.log('✅ KYC table created successfully');
      }
    });
  }

  // Submit KYC document
  async submitKyc({ userId, documentType, documentNumber }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO kyc (userId, documentType, documentNumber, status, submittedAt)
        VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
      `;
      this.db.run(sql, [userId, documentType, documentNumber], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, userId, documentType, documentNumber, status: 'pending' });
        }
      });
    });
  }

  // Get KYC status for a user
  async getKycStatus(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM kyc WHERE userId = ? ORDER BY submittedAt DESC LIMIT 1
      `;
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Update KYC status (admin function)
  async updateKycStatus(kycId, status, reviewerNotes = '') {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE kyc SET status = ?, reviewerNotes = ?, reviewedAt = CURRENT_TIMESTAMP WHERE id = ?
      `;
      this.db.run(sql, [status, reviewerNotes, kycId], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }
}

module.exports = Kyc;
