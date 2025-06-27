const express = require('express');
const router = express.Router();

// In-memory support tickets store for demo purposes
let tickets = [];
let nextTicketId = 1;

// Create a support ticket
router.post('/', (req, res) => {
  const { user_id, subject, message } = req.body;
  if (!user_id || !subject || !message) {
    return res.status(400).json({ error: 'user_id, subject, and message are required' });
  }
  const ticket = {
    id: nextTicketId++,
    user_id,
    subject,
    message,
    status: 'open',
    created_at: new Date().toISOString()
  };
  tickets.push(ticket);
  res.status(201).json({ ticket });
});

// List support tickets for a user
router.get('/:user_id', (req, res) => {
  const { user_id } = req.params;
  const userTickets = tickets.filter(t => t.user_id == user_id);
  res.json({ tickets: userTickets });
});

module.exports = router;