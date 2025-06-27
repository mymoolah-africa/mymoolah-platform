const { body, validationResult } = require('express-validator');
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Place this at the top level, not inside any function:
router.get('/test', (req, res) => res.json({ ok: true }));

// ... your other routes ...
router.post(
  '/register',
  [
    // ... your validation rules ...
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... registration logic ...
    res.json({
      success: true,
      user_id: 12345,
      message: "Registration successful. Please complete KYC."
    });
  }
);

// ... more routes ...

module.exports = router;