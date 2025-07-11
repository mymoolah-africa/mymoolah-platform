const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Bill {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.init();
  }

  init() {
    const db = new sqlite3.Database(this.dbPath);

    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          easyPayNumber TEXT UNIQUE NOT NULL,
          accountNumber TEXT NOT NULL,
          receiverId TEXT NOT NULL,
          customerName TEXT,
          billType TEXT DEFAULT 'utility',
          description TEXT,
          amount INTEGER NOT NULL,
          minAmount INTEGER,
          maxAmount INTEGER,
          dueDate TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating bills table:', err);
        } else {
          console.log('✅ Bills table created successfully');
        }
      });
    });

    db.close();
  }

  /**
   * Create a new bill
   */
  async create(billData) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const {
        easyPayNumber,
        accountNumber,
        receiverId,
        customerName,
        billType,
        description,
        amount,
        minAmount,
        maxAmount,
        dueDate
      } = billData;

      const sql = `
        INSERT INTO bills (
          easyPayNumber, accountNumber, receiverId, customerName, 
          billType, description, amount, minAmount, maxAmount, dueDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        easyPayNumber,
        accountNumber,
        receiverId,
        customerName,
        billType,
        description,
        amount,
        minAmount || amount,
        maxAmount || amount,
        dueDate
      ];

      db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Error creating bill:', err);
          reject(err);
        } else {
          console.log('✅ Bill created successfully:', this.lastID);
          resolve({ id: this.lastID, ...billData });
        }
      });

      db.close();
    });
  }

  /**
   * Find bill by EasyPay number
   */
  async findByEasyPayNumber(easyPayNumber) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'SELECT * FROM bills WHERE easyPayNumber = ?';

      db.get(sql, [easyPayNumber], (err, row) => {
        if (err) {
          console.error('❌ Error finding bill:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });

      db.close();
    });
  }

  /**
   * Find bill by ID
   */
  async findById(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'SELECT * FROM bills WHERE id = ?';

      db.get(sql, [id], (err, row) => {
        if (err) {
          console.error('❌ Error finding bill by ID:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });

      db.close();
    });
  }

  /**
   * Update bill status
   */
  async updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'UPDATE bills SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';

      db.run(sql, [status, id], function(err) {
        if (err) {
          console.error('❌ Error updating bill status:', err);
          reject(err);
        } else {
          console.log('✅ Bill status updated successfully');
          resolve({ id, status });
        }
      });

      db.close();
    });
  }

  /**
   * Get all bills
   */
  async findAll() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'SELECT * FROM bills ORDER BY createdAt DESC';

      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('❌ Error finding all bills:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });

      db.close();
    });
  }

  /**
   * Get bills by status
   */
  async findByStatus(status) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'SELECT * FROM bills WHERE status = ? ORDER BY createdAt DESC';

      db.all(sql, [status], (err, rows) => {
        if (err) {
          console.error('❌ Error finding bills by status:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });

      db.close();
    });
  }

  /**
   * Delete bill
   */
  async delete(id) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);

      const sql = 'DELETE FROM bills WHERE id = ?';

      db.run(sql, [id], function(err) {
        if (err) {
          console.error('❌ Error deleting bill:', err);
          reject(err);
        } else {
          console.log('✅ Bill deleted successfully');
          resolve({ id });
        }
      });

      db.close();
    });
  }

  /**
   * Create test bills for development
   */
  async createTestBills() {
    const testBills = [
      {
        easyPayNumber: '9202100000000000001',
        accountNumber: '0000000000001',
        receiverId: '2021',
        customerName: 'John Doe',
        billType: 'electricity',
        description: 'Monthly electricity bill',
        amount: 15000, // R150.00
        minAmount: 14000, // R140.00
        maxAmount: 16000, // R160.00
        dueDate: '2025-02-15'
      },
      {
        easyPayNumber: '9202100000000000002',
        accountNumber: '0000000000002',
        receiverId: '2021',
        customerName: 'Jane Smith',
        billType: 'water',
        description: 'Monthly water bill',
        amount: 8500, // R85.00
        minAmount: 8000, // R80.00
        maxAmount: 9000, // R90.00
        dueDate: '2025-02-20'
      },
      {
        easyPayNumber: '9202100000000000003',
        accountNumber: '0000000000003',
        receiverId: '2021',
        customerName: 'Bob Johnson',
        billType: 'internet',
        description: 'Monthly internet bill',
        amount: 12000, // R120.00
        minAmount: 12000, // R120.00
        maxAmount: 12000, // R120.00
        dueDate: '2025-02-25'
      }
    ];

    for (const billData of testBills) {
      try {
        await this.create(billData);
        console.log(`✅ Test bill created: ${billData.easyPayNumber}`);
      } catch (error) {
        console.error(`❌ Error creating test bill: ${error.message}`);
      }
    }
  }
}

module.exports = new Bill();