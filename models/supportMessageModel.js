const db = require('../config/db');

// Create a new message for a support ticket
exports.createMessage = async (message) => {
  const [result] = await db.query(
    `INSERT INTO support_messages (ticket_id, sender, message, language, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [message.ticket_id, message.sender, message.message, message.language || 'en']
  );
  return { id: result.insertId };
};

// Get all messages for a ticket
exports.getMessagesByTicket = async (ticket_id) => {
  const [rows] = await db.query(
    `SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC`,
    [ticket_id]
  );
  return rows;
};