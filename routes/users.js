const { body, validationResult } = require('express-validator');
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db'); // Adjust path if needed
const router = express.Router();

router.post(
  '/register',
  [
    body('mobile_number')
      .matches(/^(\+27|0)[6-8][0-9]{8}$/)
      .withMessage('Invalid South African mobile number'),
    body('id_type')
      .isIn(['sa_id', 'passport'])
      .withMessage('id_type must be "sa_id" or "passport"'),
    body('sa_id_number')
      .if(body('id_type').equals('sa_id'))
      .matches(/^\d{13}$/)
      .withMessage('Invalid SA ID number')
      .optional({ nullable: true }),
    body('passport_number')
      .if(body('id_type').equals('passport'))
      .isString()
      .withMessage('Passport number required for passport id_type')
      .optional({ nullable: true }),
    body('passport_country')
      .if(body('id_type').equals('passport'))
      .isString()
      .withMessage('Passport country required for passport id_type')
      .optional({ nullable: true }),
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      mobile_number, id_type, sa_id_number, passport_number, passport_country,
      first_name, last_name, email, password
    } = req.body;

    try {
      // Check for duplicate user (by email or mobile_number)
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ? OR mobile_number = ?',
        [email, mobile_number]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'User with this email or mobile number already exists.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into database
      const [result] = await pool.query(
        `INSERT INTO users
          (mobile_number, id_type, sa_id_number, passport_number, passport_country, first_name, last_name, email, password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mobile_number, id_type, sa_id_number || null, passport_number || null, passport_country || null,
          first_name, last_name, email, hashedPassword
        ]
      );

      res.json({
        success: true,
        user_id: result.insertId,
        message: "Registration successful. Please complete KYC."
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;