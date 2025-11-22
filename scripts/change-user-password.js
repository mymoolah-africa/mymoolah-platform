#!/usr/bin/env node

/**
 * Change User Password Script
 * 
 * Usage:
 *   node scripts/change-user-password.js <identifier> <newPassword>
 * 
 * Examples:
 *   node scripts/change-user-password.js 0686772469 "Denise123!"
 *   node scripts/change-user-password.js "Denise Botes" "Denise123!"
 *   node scripts/change-user-password.js 8 "Denise123!"
 * 
 * This script connects to the database via Cloud SQL Auth Proxy and updates
 * a user's password hash. The password is hashed using bcryptjs with 12 salt rounds.
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Database connection setup (same as lookup-user.js)
const getDatabaseUrl = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('127.0.0.1:6543') || dbUrl.includes('localhost:6543')) {
    return dbUrl;
  } else if (dbUrl.includes('127.0.0.1:5433') || dbUrl.includes('localhost:5433')) {
    return dbUrl;
  } else {
    const match = dbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/);
    if (match) {
      const [, user, password, , database] = match;
      const proxyPort = process.env.PROXY_PORT || '6543';
      return `postgres://${user}:${password}@127.0.0.1:${proxyPort}/${database}`;
    }
  }
  return dbUrl;
};

const sequelize = new Sequelize(getDatabaseUrl(), {
  dialect: 'postgres',
  logging: false,
  pool: { max: 5, min: 0, acquire: 10000, idle: 10000 },
  dialectOptions: {
    ssl: false // Disable SSL for proxy connections
  }
});

// Normalize South African phone number
const normalizePhone = (phone) => {
  if (!phone) return null;
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  // Convert to standard format: 0XXXXXXXXX
  if (cleaned.startsWith('27')) {
    cleaned = '0' + cleaned.substring(2);
  } else if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
};

// Find user by identifier (ID, phone, or name)
const findUser = async (identifier) => {
  const isNumeric = /^\d+$/.test(identifier);
  
  if (isNumeric && identifier.length <= 10) {
    // Likely a user ID
    const [results] = await sequelize.query(
      `SELECT id, email, "firstName", "lastName", "phoneNumber", "accountNumber", "kycStatus", "password_hash"
       FROM users 
       WHERE id = :id
       ORDER BY id DESC
       LIMIT 1`,
      {
        replacements: { id: parseInt(identifier) },
        type: Sequelize.QueryTypes.SELECT
      }
    );
    return results;
  } else if (isNumeric || identifier.includes('+') || identifier.includes('0')) {
    // Likely a phone number
    const normalized = normalizePhone(identifier);
    const variants = [
      normalized,
      normalized.replace(/^0/, '+27'),
      normalized.replace(/^0/, '27'),
      identifier // Original
    ];
    
    const [results] = await sequelize.query(
      `SELECT id, email, "firstName", "lastName", "phoneNumber", "accountNumber", "kycStatus", "password_hash"
       FROM users 
       WHERE "phoneNumber" = ANY(:variants)
       ORDER BY id DESC
       LIMIT 1`,
      {
        replacements: { variants },
        type: Sequelize.QueryTypes.SELECT
      }
    );
    return results;
  } else {
    // Likely a name
    const nameParts = identifier.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    let query = `SELECT id, email, "firstName", "lastName", "phoneNumber", "accountNumber", "kycStatus", "password_hash"
                 FROM users 
                 WHERE "firstName" ILIKE :firstName`;
    const replacements = { firstName: `%${firstName}%` };
    
    if (lastName) {
      query += ` AND "lastName" ILIKE :lastName`;
      replacements.lastName = `%${lastName}%`;
    }
    
    query += ` ORDER BY id DESC LIMIT 1`;
    
    const [results] = await sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });
    return results;
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('❌ Error: Missing arguments');
    console.error('');
    console.error('Usage: node scripts/change-user-password.js <identifier> <newPassword>');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/change-user-password.js 0686772469 "Denise123!"');
    console.error('  node scripts/change-user-password.js "Denise Botes" "Denise123!"');
    console.error('  node scripts/change-user-password.js 8 "Denise123!"');
    console.error('');
    console.error('Identifier can be:');
    console.error('  - User ID (e.g., 8)');
    console.error('  - Phone number (e.g., 0686772469, +27686772469, 27686772469)');
    console.error('  - Name (e.g., "Denise Botes", "Denise")');
    process.exit(1);
  }
  
  const identifier = args[0];
  const newPassword = args[1];
  
  if (!newPassword || newPassword.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long');
    process.exit(1);
  }
  
  try {
    console.log('🔍 Searching for user...');
    console.log(`   Identifier: ${identifier}`);
    
    const user = await findUser(identifier);
    
    if (!user) {
      console.error('❌ No user found matching your search');
      process.exit(1);
    }
    
    console.log('');
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phoneNumber}`);
    console.log(`   Account: ${user.accountNumber}`);
    console.log(`   KYC Status: ${user.kycStatus || 'not_started'}`);
    console.log('');
    
    // Confirm password change
    console.log('🔐 Hashing new password...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('💾 Updating password in database...');
    await sequelize.query(
      `UPDATE users 
       SET "password_hash" = :passwordHash, "updatedAt" = NOW()
       WHERE id = :userId`,
      {
        replacements: { 
          passwordHash,
          userId: user.id 
        },
        type: Sequelize.QueryTypes.UPDATE
      }
    );
    
    console.log('');
    console.log('✅ Password updated successfully!');
    console.log(`   User: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    console.log(`   New password: ${newPassword}`);
    console.log('');
    console.log('⚠️  Note: User will need to log in with the new password');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run the script
main();

