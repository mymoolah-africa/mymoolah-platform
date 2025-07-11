const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Payment {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.init();
  }

  init() {
    const db = new sqlite3.Database(this.dbPath);

    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          merchantId TEXT,
          terminalId TEXT,
          paymentDate TEXT NOT NULL,
          reference TEXT NOT NULL,
          easyPayNumber TEXT NOT NULL,
          accountNumber TEXT NOT NULL,
          amount INTEGER NOT NULL,
          echoData TEXT,
          billId INTEGER,
          status TEXT DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (billId) REFERENCES bills (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating payments table:', err);
        } else {
          console.log('✅ Payments table created successfully');
        }
      });
    });

    db.close();
  }

  /**
   * Create a new payment record
   */
  async create(paymentData) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const {
        merchantId,
        terminalId,
        paymentDate,
        reference,
        easyPayNumber,
        accountNumber,
        amount,
        echoData,
        billId,
        status
      } = paymentData;

      const sql = `
        INSERT INTO payments (
          merchantId, terminalId, paymentDate, reference, 
          easyPayNumber, accountNumber, amount, echoData, billId, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        merchantId,
        terminalId,
        paymentDate,
        reference,
        easyPayNumber,
        accountNumber,
        amount,
        echoData,
        billId,
        status || 'completed'
      ];

      db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Error creating payment:', err);
          reject(err);
        } else {
          console.log('✅ Payment created successfully:', this.lastID);
          resolve({ id: this.lastID, ...paymentData });
        }
      });

      db.close();
    });
  }

  /**
   * Find payment by ID
   */
  async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'SELECT * FROM payments WHERE id = ?';

      db.get(sql, [id], (err, row) => {
        if (err) {
          console.error('❌ Error finding payment by ID:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });

      db.close();
    });
  }

  /**
   * Find payment by reference
   */
  async findByReference(reference) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'SELECT * FROM payments WHERE reference = ?';

      db.get(sql, [reference], (err, row) => {
        if (err) {
          console.error('❌ Error finding payment by reference:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });

      db.close();
    });
  }

  /**
   * Find payments by EasyPay number
   */
  async findByEasyPayNumber(easyPayNumber) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'SELECT * FROM payments WHERE easyPayNumber = ? ORDER BY createdAt DESC';

      db.all(sql, [easyPayNumber], (err, rows) => {
        if (err) {
          console.error('❌ Error finding payments by EasyPay number:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });

      db.close();
    });
  }

  /**
   * Update payment status
   */
  async updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'UPDATE payments SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';

      db.run(sql, [status, id], function(err) {
        if (err) {
          console.error('❌ Error updating payment status:', err);
          reject(err);
        } else {
          console.log('✅ Payment status updated successfully');
          resolve({ id, status });
        }
      });

      db.close();
    });
  }

  /**
   * Get all payments
   */
  async findAll() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'SELECT * FROM payments ORDER BY createdAt DESC';

      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('❌ Error finding all payments:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });

      db.close();
    });
  }

  /**
   * Get payments by status
   */
  async findByStatus(status) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'SELECT * FROM payments WHERE status = ? ORDER BY createdAt DESC';

      db.all(sql, [status], (err, rows) => {
        if (err) {
          console.error('❌ Error finding payments by status:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });

      db.close();
    });
  }

  /**
   * Get payment statistics
   */
  async getStatistics() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = `
        SELECT 
          COUNT(*) as totalPayments,
          SUM(amount) as totalAmount,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedPayments,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completedAmount,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingPayments,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pendingAmount
        FROM payments
      `;

      db.get(sql, [], (err, row) => {
        if (err) {
          console.error('❌ Error getting payment statistics:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });

      db.close();
    });
  }

  /**
   * Get payments with bill information
   */
  async findWithBillInfo() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = `
        SELECT 
          p.*,
          b.customerName,
          b.billType,
          b.description as billDescription
        FROM payments p
        LEFT JOIN bills b ON p.billId = b.id
        ORDER BY p.createdAt DESC
      `;

      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('❌ Error finding payments with bill info:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });

      db.close();
    });
  }

  /**
   * Delete payment
   */
  async delete(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'DELETE FROM payments WHERE id = ?';

      db.run(sql, [id], function(err) {
        if (err) {
          console.error('❌ Error deleting payment:', err);
          reject(err);
        } else {
          console.log('✅ Payment deleted successfully');
          resolve({ id });
        }
      });

      db.close();
    });
  }
}

module.exports = new Payment();