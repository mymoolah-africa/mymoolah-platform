const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SupportTicketModel {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initTable();
  }

  initTable() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  createTicket(userId, subject) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO support_tickets (user_id, subject, status) VALUES (?, ?, ?)',
        [userId, subject, 'open'],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  getTicketsByUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  updateStatus(ticketId, status) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE support_tickets SET status = ? WHERE id = ?',
        [status, ticketId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  deleteTicket(ticketId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM support_tickets WHERE id = ?',
        [ticketId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
}

module.exports = SupportTicketModel; 