const supportTicketModel = require('../models/supportTicketModel');
const supportMessageModel = require('../models/supportMessageModel');
const aiSupportService = require('../services/aiSupportService');

// Create a new support ticket (and initial message, with AI auto-response)
exports.createTicket = async (req, res) => {
  try {
    const { user_id, subject, message, language } = req.body;
    if (!user_id || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Create ticket
    const ticket = await supportTicketModel.createTicket({ user_id, subject, message, language });
    // Create initial message
    await supportMessageModel.createMessage({
      ticket_id: ticket.id,
      sender: 'user',
      message,
      language: language || 'en'
    });

    // AI/NLP auto-response
    let ai_response = null;
    let status = 'open';
    try {
      ai_response = await aiSupportService.getAIResponse(subject, message, language || 'en');
      if (ai_response && !ai_response.toLowerCase().includes('human escalation required')) {
        // Post AI response as a message
        await supportMessageModel.createMessage({
          ticket_id: ticket.id,
          sender: 'ai',
          message: ai_response,
          language: language || 'en'
        });
        // Update ticket as auto_resolved
        await supportTicketModel.updateTicketStatus(ticket.id, 'auto_resolved');
        // Update ai_response field
        await supportTicketModel.updateAIResponse(ticket.id, ai_response);
        status = 'auto_resolved';
      }
    } catch (aiErr) {
      // Log AI error, but don't block ticket creation
      console.error('AI auto-response error:', aiErr);
    }

    res.status(201).json({ id: ticket.id, status, ai_response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// List all tickets for a user
exports.listTicketsByUser = async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const tickets = await supportTicketModel.getTicketsByUser(user_id);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a ticket and its messages
exports.getTicketWithMessages = async (req, res) => {
  try {
    const ticket_id = req.params.id;
    const ticket = await supportTicketModel.getTicketById(ticket_id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const messages = await supportMessageModel.getMessagesByTicket(ticket_id);
    res.json({ ticket, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Post a message to a ticket
exports.postMessage = async (req, res) => {
  try {
    const ticket_id = req.params.id;
    const { sender, message, language } = req.body;
    if (!sender || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const msg = await supportMessageModel.createMessage({
      ticket_id,
      sender,
      message,
      language: language || 'en'
    });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update ticket status
exports.updateStatus = async (req, res) => {
  try {
    const ticket_id = req.params.id;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Missing status' });
    const result = await supportTicketModel.updateTicketStatus(ticket_id, status);
    if (!result.updated) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Escalate ticket to external platform
exports.escalate = async (req, res) => {
  try {
    const ticket_id = req.params.id;
    const { external_id, external_platform } = req.body;
    if (!external_id || !external_platform) {
      return res.status(400).json({ error: 'Missing external_id or external_platform' });
    }
    const result = await supportTicketModel.escalateTicket(ticket_id, external_id, external_platform);
    if (!result.escalated) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ escalated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};