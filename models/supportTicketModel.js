const db = require('../config/db');

// Create a new support ticket
exports.createTicket = async (ticket) => {
  const [result] = await db.query(
    `INSERT INTO support_tickets (user_id, subject, message, status, language, created_at, updated_at)
     VALUES (?, ?, ?, 'open', ?, NOW(), NOW())`,
    [ticket.user_id, ticket.subject, ticket.message, ticket.language || 'en']
  );
  return { id: result.insertId };
};

// Get all tickets for a user
exports.getTicketsByUser = async (user_id) => {
  const [rows] = await db.query(
    `SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`,
    [user_id]
  );
  return rows;
};

// Get a ticket by ID
exports.getTicketById = async (id) => {
  const [rows] = await db.query(
    `SELECT * FROM support_tickets WHERE id = ?`,
    [id]
  );
  return rows[0];
};

// Update ticket status
exports.updateTicketStatus = async (id, status) => {
  const [result] = await db.query(
    `UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?`,
    [status, id]
  );
  return { updated: result.affectedRows > 0 };
};

// Update AI response field
exports.updateAIResponse = async (id, ai_response) => {
  await db.query(
    `UPDATE support_tickets SET ai_response = ? WHERE id = ?`,
    [ai_response, id]
  );
};

// Escalate ticket to external platform
exports.escalateTicket = async (id, external_id, external_platform) => {
  const [result] = await db.query(
    `UPDATE support_tickets SET status = 'escalated', external_id = ?, external_platform = ?, escalated_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [external_id, external_platform, id]
  );
  return { escalated: result.affectedRows > 0 };
};