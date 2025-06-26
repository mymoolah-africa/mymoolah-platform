const { body, validationResult } = require('express-validator');
const express = require('express');
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
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // TODO: Add logic to save user to database

    res.json({
      success: true,
      user_id: 12345,
      message: "Registration successful. Please complete KYC."
    });
  }
);
module.exports = router;