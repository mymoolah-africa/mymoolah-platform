#!/usr/bin/env node

/**
 * Verify User Password Script
 * 
 * Usage:
 *   node scripts/verify-password.js <identifier> <password>
 * 
 * Examples:
 *   node scripts/verify-password.js 0686772469 "Denise123!"
 *   node scripts/verify-password.js 8 "Denise123!"
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Database connection setup (same as change-user-password.js)
const getDatabaseUrl = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('127.0.0.1:6543') || dbUrl.includes('localhost:6543') || 
      dbUrl.includes('127.0.0.1:5433') || dbUrl.includes('localhost:5433')) {
    return dbUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/[?&]ssl=[^&]*/g, '');
  } else {
    const match = dbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);
    if (match) {
      const [, user, password, , database] = match;
      const proxyPort = process.env.PROXY_PORT || '6543';
      return `postgres://${user}:${password}@127.0.0.1:${proxyPort}/${database}`;
    }
  }
  return dbUrl;
};

const dbUrl = getDatabaseUrl();
const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false,
  pool: { max: 5, min: 0, acquire: 10000, idle: 10000 },
  dialectOptions: { ssl: false }
});

// Find user (same logic as change-user-password.js)
const findUser = async (identifier) => {
  let query;
  let queryParams = {};
  
  if (/^\d+$/.test(identifier.trim()) && identifier.trim().length <= 10) {
    query = `SELECT id, email, "firstName", "lastName", "phoneNumber", "password_hash" FROM users WHERE id = :id LIMIT 1`;
    queryParams = { id: parseInt(identifier.trim()) };
  } else if (/^[\d\s\+\-\(\)]+$/.test(identifier.trim())) {
    const phoneClean = identifier.trim().replace(/[\s\+\-\(\)]/g, '');
    let phoneVariants = [identifier.trim()];
    if (phoneClean !== identifier.trim()) phoneVariants.push(phoneClean);
    if (phoneClean.startsWith('0') && phoneClean.length === 10) {
      const withoutZero = phoneClean.substring(1);
      phoneVariants.push(withoutZero, `+27${withoutZero}`, `27${withoutZero}`);
    } else if (phoneClean.startsWith('27') && phoneClean.length === 11) {
      phoneVariants.push(`+${phoneClean}`, `0${phoneClean.substring(2)}`);
    } else if (phoneClean.startsWith('+27') && phoneClean.length === 12) {
      phoneVariants.push(phoneClean.substring(1), `0${phoneClean.substring(3)}`);
    }
    phoneVariants = [...new Set(phoneVariants)];
    const conditions = phoneVariants.map((v, i) => {
      queryParams[`phone${i+1}`] = `%${v}%`;
      return `"phoneNumber" LIKE :phone${i+1}`;
    }).join(' OR ');
    query = `SELECT id, email, "firstName", "lastName", "phoneNumber", "password_hash" FROM users WHERE ${conditions} LIMIT 1`;
  } else {
    const nameParts = identifier.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      query = `SELECT id, email, "firstName", "lastName", "phoneNumber", "password_hash" FROM users WHERE "firstName" ILIKE :firstName AND "lastName" ILIKE :lastName LIMIT 1`;
      queryParams = { firstName: `%${nameParts[0]}%`, lastName: `%${nameParts.slice(1).join(' ')}%` };
    } else {
      query = `SELECT id, email, "firstName", "lastName", "phoneNumber", "password_hash" FROM users WHERE "firstName" ILIKE :firstName OR "lastName" ILIKE :lastName LIMIT 1`;
      queryParams = { firstName: `%${nameParts[0]}%`, lastName: `%${nameParts[0]}%` };
    }
  }
  
  const [results] = await sequelize.query(query, {
    replacements: queryParams,
    type: Sequelize.QueryTypes.SELECT
  });
  return results;
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node scripts/verify-password.js <identifier> <password>');
    process.exit(1);
  }
  
  try {
    const user = await findUser(args[0]);
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }
    
    console.log(`✅ User found: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    console.log(`   Phone: ${user.phoneNumber}`);
    console.log(`   Email: ${user.email}`);
    console.log('');
    
    const isValid = await bcrypt.compare(args[1], user.password_hash);
    if (isValid) {
      console.log('✅ Password is CORRECT!');
    } else {
      console.log('❌ Password is INCORRECT!');
      console.log('');
      console.log('⚠️  Make sure you entered the password exactly as set:');
      console.log(`   Password tested: "${args[1]}"`);
      console.log(`   Length: ${args[1].length} characters`);
      console.log(`   Has spaces? ${args[1].includes(' ') ? 'YES (this might be the issue!)' : 'NO'}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

main();

