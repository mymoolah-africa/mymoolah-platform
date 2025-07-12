const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SupportMessageModel {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initTable();
  }

  initTable() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  createMessage(ticketId, senderId, message) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO support_messages (ticket_id, sender_id, message) VALUES (?, ?, ?)',
        [ticketId, senderId, message],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  getMessagesByTicket(ticketId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC',
        [ticketId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  deleteMessage(messageId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM support_messages WHERE id = ?',
        [messageId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
}

module.exports = SupportMessageModel; 