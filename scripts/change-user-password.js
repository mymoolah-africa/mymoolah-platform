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
  // Check if we're using proxy (local/Codespaces) or direct connection
  const dbUrl = process.env.DATABASE_URL || '';
  
  // If already using proxy, return as-is (but remove sslmode if present)
  if (dbUrl.includes('127.0.0.1:6543') || dbUrl.includes('localhost:6543') || 
      dbUrl.includes('127.0.0.1:5433') || dbUrl.includes('localhost:5433')) {
    // Remove sslmode parameter - proxy doesn't need SSL
    return dbUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/[?&]ssl=[^&]*/g, '');
  } else {
    // Try to use proxy connection (most reliable)
    const match = dbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);
    if (match) {
      const [, user, password, , database] = match;
      // Use proxy on port 6543 (Codespaces) or 5433 (local)
      const proxyPort = process.env.PROXY_PORT || '6543';
      return `postgres://${user}:${password}@127.0.0.1:${proxyPort}/${database}`;
    }
  }
  return dbUrl;
};

const dbUrl = getDatabaseUrl();
const isProxyConnection = dbUrl.includes('127.0.0.1') || dbUrl.includes('localhost');

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 10000,
    idle: 10000
  },
  dialectOptions: {
    ssl: false // Disable SSL for proxy connections
  }
});

// Find user by identifier (ID, phone, or name)
const findUser = async (identifier) => {
  let query;
  let queryParams = {};
  
  // Check if it's a numeric ID
  if (/^\d+$/.test(identifier.trim()) && identifier.trim().length <= 10) {
    query = `
      SELECT id, email, "firstName", "lastName", "phoneNumber", "accountNumber", "kycStatus", "password_hash"
      FROM users
      WHERE id = :id
      ORDER BY id DESC
      LIMIT 1
    `;
    queryParams = { id: parseInt(identifier.trim()) };
  }
  // Check if it looks like a phone number (digits, possibly with + or spaces)
  else if (/^[\d\s\+\-\(\)]+$/.test(identifier.trim())) {
    const phoneClean = identifier.trim().replace(/[\s\+\-\(\)]/g, '');
    // Handle South African numbers: if starts with 0, also try +27
    let phoneVariants = [identifier.trim()];
    
    // Always include cleaned version
    if (phoneClean !== identifier.trim()) {
      phoneVariants.push(phoneClean);
    }
    
    if (phoneClean.startsWith('0') && phoneClean.length === 10) {
      // 0686772469 -> also try 686772469, +27686772469, 27686772469
      const withoutZero = phoneClean.substring(1);
      phoneVariants.push(withoutZero);
      phoneVariants.push(`+27${withoutZero}`);
      phoneVariants.push(`27${withoutZero}`);
    } else if (phoneClean.startsWith('27') && phoneClean.length === 11) {
      // 27686772469 -> also try +27 and 0
      phoneVariants.push(`+${phoneClean}`);
      phoneVariants.push(`0${phoneClean.substring(2)}`);
    } else if (phoneClean.startsWith('+27') && phoneClean.length === 12) {
      // +27686772469 -> also try without + and with 0
      phoneVariants.push(phoneClean.substring(1));
      phoneVariants.push(`0${phoneClean.substring(3)}`);
    }
    
    // Remove duplicates
    phoneVariants = [...new Set(phoneVariants)];
    
    // Build query with multiple LIKE conditions
    const conditions = phoneVariants.map((variant, idx) => {
      const paramName = `phone${idx + 1}`;
      queryParams[paramName] = `%${variant}%`;
      return `"phoneNumber" LIKE :${paramName}`;
    }).join(' OR ');
    
    query = `
      SELECT id, email, "firstName", "lastName", "phoneNumber", "accountNumber", "kycStatus", "password_hash"
      FROM users
      WHERE ${conditions}
      ORDER BY id DESC
      LIMIT 1
    `;
  }
  // Otherwise treat as name search
  else {
    const nameParts = identifier.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      // First and last name
      query = `
        SELECT id, email, "firstName", "lastName", "phoneNumber", "accountNumber", "kycStatus", "password_hash"
        FROM users
        WHERE "firstName" ILIKE :firstName AND "lastName" ILIKE :lastName
        ORDER BY id DESC
        LIMIT 1
      `;
      queryParams = {
        firstName: `%${nameParts[0]}%`,
        lastName: `%${nameParts.slice(1).join(' ')}%`
      };
    } else {
      // Just first name
      query = `
        SELECT id, email, "firstName", "lastName", "phoneNumber", "accountNumber", "kycStatus", "password_hash"
        FROM users
        WHERE "firstName" ILIKE :firstName OR "lastName" ILIKE :lastName
        ORDER BY id DESC
        LIMIT 1
      `;
      queryParams = {
        firstName: `%${nameParts[0]}%`,
        lastName: `%${nameParts[0]}%`
      };
    }
  }
  
  const [results] = await sequelize.query(query, {
    replacements: queryParams,
    type: Sequelize.QueryTypes.SELECT
  });
  
  return results;
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

