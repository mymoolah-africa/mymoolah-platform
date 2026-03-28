'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize } = require('../models');

const SALT_ROUNDS = 12;
const MAX_PIN_ATTEMPTS = parseInt(process.env.USSD_PIN_MAX_ATTEMPTS || '3', 10);
const LOCKOUT_MINUTES = [30, 120, 1440]; // Progressive: 30min, 2hr, 24hr

function isValidSouthAfricanId(idNumber) {
  const digits = (idNumber || '').replace(/\D/g, '');
  if (!/^\d{13}$/.test(digits)) return false;

  // Validate date of birth (digits 1-6: YYMMDD)
  const yy = parseInt(digits.substring(0, 2), 10);
  const mm = parseInt(digits.substring(2, 4), 10);
  const dd = parseInt(digits.substring(4, 6), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  const century = yy <= 49 ? 2000 : 1900;
  const fullYear = century + yy;
  const testDate = new Date(fullYear, mm - 1, dd);
  if (testDate.getFullYear() !== fullYear || testDate.getMonth() !== mm - 1 || testDate.getDate() !== dd) return false;
  if (testDate > new Date()) return false;

  // Citizenship digit (position 11): 0 = SA citizen, 1 = permanent resident
  const citizenship = parseInt(digits[10], 10);
  if (citizenship !== 0 && citizenship !== 1) return false;

  // Luhn checksum
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function isValidPassport(value) {
  const cleaned = (value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6,15}$/.test(cleaned)) return false;
  if (!/[A-Z]/.test(cleaned)) return false;
  if (/^(.)\1+$/.test(cleaned)) return false;
  return true;
}

function validateIdNumber(value) {
  const cleaned = (value || '').trim();
  if (isValidSouthAfricanId(cleaned)) {
    return { valid: true, type: 'south_african_id', normalized: cleaned.replace(/\D/g, '') };
  }
  if (isValidPassport(cleaned)) {
    return { valid: true, type: 'international_passport', normalized: cleaned.toUpperCase() };
  }
  return { valid: false, type: null, normalized: null };
}

function isValidUssdPin(pin) {
  return /^\d{5}$/.test(pin);
}

async function findUserByMsisdn(msisdn) {
  const e164 = msisdn.startsWith('+') ? msisdn : `+${msisdn}`;
  const [rows] = await sequelize.query(
    'SELECT id, "firstName", "lastName", "phoneNumber", "idNumber", "idType", "kycStatus", kyc_tier, status, ussd_pin, ussd_pin_attempts, ussd_locked_until FROM users WHERE "phoneNumber" = $1 LIMIT 1',
    { bind: [e164] }
  );
  return rows[0] || null;
}

async function isUssdLocked(user) {
  if (!user.ussd_locked_until) return false;
  if (new Date(user.ussd_locked_until) > new Date()) return true;
  await sequelize.query(
    'UPDATE users SET ussd_pin_attempts = 0, ussd_locked_until = NULL WHERE id = $1',
    { bind: [user.id] }
  );
  return false;
}

function getLockoutMinutes(attempts) {
  const idx = Math.min(Math.floor(attempts / MAX_PIN_ATTEMPTS) - 1, LOCKOUT_MINUTES.length - 1);
  return LOCKOUT_MINUTES[Math.max(0, idx)];
}

async function verifyUssdPin(userId, pin) {
  const [rows] = await sequelize.query(
    'SELECT id, ussd_pin, ussd_pin_attempts, ussd_locked_until FROM users WHERE id = $1 LIMIT 1',
    { bind: [userId] }
  );
  const user = rows[0];
  if (!user || !user.ussd_pin) return { success: false, reason: 'no_pin' };

  if (await isUssdLocked(user)) {
    const remaining = Math.ceil((new Date(user.ussd_locked_until) - new Date()) / 60000);
    return { success: false, reason: 'locked', minutesRemaining: remaining };
  }

  const match = await bcrypt.compare(pin, user.ussd_pin);
  if (match) {
    await sequelize.query(
      'UPDATE users SET ussd_pin_attempts = 0, ussd_locked_until = NULL WHERE id = $1',
      { bind: [userId] }
    );
    return { success: true };
  }

  const newAttempts = (user.ussd_pin_attempts || 0) + 1;
  if (newAttempts >= MAX_PIN_ATTEMPTS) {
    const lockMinutes = getLockoutMinutes(newAttempts);
    const lockedUntil = new Date(Date.now() + lockMinutes * 60000);
    await sequelize.query(
      'UPDATE users SET ussd_pin_attempts = $1, ussd_locked_until = $2 WHERE id = $3',
      { bind: [newAttempts, lockedUntil, userId] }
    );
    return { success: false, reason: 'locked', minutesRemaining: lockMinutes };
  }

  await sequelize.query(
    'UPDATE users SET ussd_pin_attempts = $1 WHERE id = $2',
    { bind: [newAttempts, userId] }
  );
  const attemptsLeft = MAX_PIN_ATTEMPTS - newAttempts;
  return { success: false, reason: 'wrong_pin', attemptsLeft };
}

async function setUssdPin(userId, pin) {
  const hash = await bcrypt.hash(pin, SALT_ROUNDS);
  await sequelize.query(
    'UPDATE users SET ussd_pin = $1, ussd_pin_attempts = 0, ussd_locked_until = NULL WHERE id = $2',
    { bind: [hash, userId] }
  );
}

async function registerUssdUser(msisdn, firstName, lastName, idNumber, pin) {
  const e164 = msisdn.startsWith('+') ? msisdn : `+${msisdn}`;

  const existing = await findUserByMsisdn(e164);
  if (existing) {
    return { success: false, reason: 'already_registered' };
  }

  const idResult = validateIdNumber(idNumber);
  if (!idResult.valid) {
    return { success: false, reason: 'invalid_id' };
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
  const placeholderEmail = `${e164.replace('+', '')}@ussd.mymoolah.africa`;

  const t = await sequelize.transaction();
  try {
    const [userRows] = await sequelize.query(
      `INSERT INTO users (email, password_hash, "firstName", "lastName", "phoneNumber", "accountNumber",
        "idNumber", "idType", "idVerified", balance, status, "kycStatus", registration_channel, ussd_pin,
        preferred_language, kyc_tier, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 0, 'active', 'ussd_basic', 'ussd', $9, 'en', 0, NOW(), NOW())
       RETURNING id`,
      {
        bind: [placeholderEmail, passwordHash, firstName, lastName, e164, e164,
               idResult.normalized, idResult.type, pinHash],
        transaction: t,
      }
    );

    const userId = userRows[0].id;

    await sequelize.query(
      `INSERT INTO wallets ("userId", balance, currency, "kycVerified", "kycVerifiedAt", "createdAt", "updatedAt")
       VALUES ($1, 0, 'ZAR', true, NOW(), NOW(), NOW())`,
      { bind: [userId], transaction: t }
    );

    await t.commit();
    return { success: true, userId };
  } catch (err) {
    await t.rollback();
    if (err.message && err.message.includes('unique')) {
      return { success: false, reason: 'duplicate' };
    }
    throw err;
  }
}

function isValidName(value) {
  const cleaned = (value || '').trim();
  if (cleaned.length < 1 || cleaned.length > 50) return false;
  if (/^\d+$/.test(cleaned)) return false;
  return /^[a-zA-Z\s'\-]+$/.test(cleaned);
}

function sanitizeName(value) {
  return (value || '').trim().replace(/\s+/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

module.exports = {
  findUserByMsisdn,
  verifyUssdPin,
  setUssdPin,
  registerUssdUser,
  validateIdNumber,
  isValidUssdPin,
  isUssdLocked,
  isValidSouthAfricanId,
  isValidPassport,
  isValidName,
  sanitizeName,
};
