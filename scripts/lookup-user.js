#!/usr/bin/env node

/**
 * User Lookup Script
 * 
 * Usage:
 *   node scripts/lookup-user.js <phone|name|userId>
 * 
 * Examples:
 *   node scripts/lookup-user.js 0686772469
 *   node scripts/lookup-user.js "Denise Botes"
 *   node scripts/lookup-user.js 8
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Use proxy connection (same as backend) - works reliably
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
  dialectOptions: isProxyConnection ? {
    // No SSL when using proxy - proxy handles encryption
    ssl: false
  } : {
    // Direct connection may need SSL
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function lookupUser(searchTerm) {
  if (!searchTerm) {
    console.error('❌ Error: Please provide a search term (phone number, name, or user ID)');
    console.log('\nUsage:');
    console.log('  node scripts/lookup-user.js <phone|name|userId>');
    console.log('\nExamples:');
    console.log('  node scripts/lookup-user.js 0686772469');
    console.log('  node scripts/lookup-user.js "Denise Botes"');
    console.log('  node scripts/lookup-user.js 8');
    process.exit(1);
  }

  try {
    console.log(`🔍 Searching for: "${searchTerm}"\n`);
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected! Querying...\n');

    let query;
    let queryParams = {};

    // Check if it's a numeric ID
    if (/^\d+$/.test(searchTerm.trim())) {
      query = `
        SELECT id, "firstName", "lastName", "phoneNumber", "email", "kycStatus", "createdAt"
        FROM users
        WHERE id = :id
        ORDER BY id
      `;
      queryParams = { id: parseInt(searchTerm.trim()) };
    }
    // Check if it looks like a phone number (digits, possibly with + or spaces)
    else if (/^[\d\s\+\-\(\)]+$/.test(searchTerm.trim())) {
      const phoneClean = searchTerm.trim().replace(/[\s\+\-\(\)]/g, '');
      // Handle South African numbers: if starts with 0, also try +27
      let phoneVariants = [searchTerm.trim(), phoneClean];
      if (phoneClean.startsWith('0')) {
        // 0686772469 -> also try 686772469 and +27686772469
        phoneVariants.push(phoneClean.substring(1)); // Remove leading 0
        phoneVariants.push(`+27${phoneClean.substring(1)}`); // Add +27
        phoneVariants.push(`27${phoneClean.substring(1)}`); // Add 27 without +
      } else if (phoneClean.startsWith('27')) {
        // 27686772469 -> also try +27 and 0
        phoneVariants.push(`+${phoneClean}`);
        phoneVariants.push(`0${phoneClean.substring(2)}`); // 0 + last 9 digits
      } else if (phoneClean.startsWith('+27')) {
        // +27686772469 -> also try without + and with 0
        phoneVariants.push(phoneClean.substring(1)); // Remove +
        phoneVariants.push(`0${phoneClean.substring(3)}`); // 0 + last 9 digits
      }
      
      // Build LIKE conditions for all variants
      const likeConditions = phoneVariants.map((_, idx) => `"phoneNumber" LIKE :phone${idx + 1}`).join(' OR ');
      queryParams = {};
      phoneVariants.forEach((variant, idx) => {
        queryParams[`phone${idx + 1}`] = `%${variant}%`;
      });
      
      query = `
        SELECT id, "firstName", "lastName", "phoneNumber", "email", "kycStatus", "createdAt"
        FROM users
        WHERE ${likeConditions}
        ORDER BY id
      `;
    }
    // Otherwise treat as name search
    else {
      const nameParts = searchTerm.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        // First and last name
        query = `
          SELECT id, "firstName", "lastName", "phoneNumber", "email", "kycStatus", "createdAt"
          FROM users
          WHERE "firstName" ILIKE :firstName AND "lastName" ILIKE :lastName
          ORDER BY id
        `;
        queryParams = {
          firstName: `%${nameParts[0]}%`,
          lastName: `%${nameParts.slice(1).join(' ')}%`
        };
      } else {
        // Single name - search both first and last
        query = `
          SELECT id, "firstName", "lastName", "phoneNumber", "email", "kycStatus", "createdAt"
          FROM users
          WHERE "firstName" ILIKE :name OR "lastName" ILIKE :name
          ORDER BY id
        `;
        queryParams = {
          name: `%${nameParts[0]}%`
        };
      }
    }

    const results = await sequelize.query(query, {
      replacements: queryParams,
      type: Sequelize.QueryTypes.SELECT
    });

    // Handle different result formats
    const users = Array.isArray(results) ? results : (results[0] || []);

    if (users.length === 0) {
      console.log('❌ No user found matching your search');
      console.log('\n💡 Tips:');
      console.log('  - Try searching by phone number (with or without +27)');
      console.log('  - Try searching by full name (e.g., "John Doe")');
      console.log('  - Try searching by user ID (numeric)');
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`);
      users.forEach((u, index) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`User #${index + 1}:`);
        console.log(`  👤 User ID:     ${u.id}`);
        console.log(`  📛 Name:        ${u.firstName || 'N/A'} ${u.lastName || 'N/A'}`);
        console.log(`  📱 Phone:       ${u.phoneNumber || 'N/A'}`);
        console.log(`  📧 Email:       ${u.email || 'N/A'}`);
        console.log(`  ✅ KYC Status:  ${u.kycStatus || 'not_started'}`);
        console.log(`  📅 Created:     ${u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        if (index < users.length - 1) console.log('');
      });
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Connection failed. Make sure:');
      console.error('  1. Cloud SQL Proxy is running (check with: ps aux | grep cloud-sql-proxy)');
      console.error('  2. Backend server is running (it uses the proxy)');
      console.error('  3. Proxy is listening on port 6543 (Codespaces) or 5433 (local)');
    }
    await sequelize.close();
    process.exit(1);
  }
}

// Get search term from command line arguments
const searchTerm = process.argv[2];
lookupUser(searchTerm);

