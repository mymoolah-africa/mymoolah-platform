const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/clients - List all clients
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clients');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;