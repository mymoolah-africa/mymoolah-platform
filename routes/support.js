const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');

// Create a new support ticket
router.post('/', supportController.createTicket);

// List all tickets for a user
router.get('/', supportController.listTicketsByUser);

// Get a ticket and its messages
router.get('/:id', supportController.getTicketWithMessages);

// Post a message to a ticket
router.post('/:id/message', supportController.postMessage);

// Update ticket status
router.patch('/:id/status', supportController.updateStatus);

// Escalate ticket to external platform
router.post('/:id/escalate', supportController.escalate);

module.exports = router;