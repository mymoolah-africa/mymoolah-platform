#!/usr/bin/env node
/**
 * Check if users exist in staging database
 * Usage: node scripts/check-staging-users.js [phoneNumber]
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Get database connection from environment
const getDatabaseUrl = () => {
  // For Cloud Run / Staging
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // For local with Cloud SQL Proxy
  const dbPassword = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD;
  if (dbPassword && process.env.DB_HOST && process.env.DB_NAME) {
    const encodedPassword = encodeURIComponent(dbPassword);
    return `postgres://${process.env.DB_USER || 'mymoolah_app'}:${encodedPassword}@${process.env.DB_HOST}/${process.env.DB_NAME}?sslmode=disable`;
  }
  
  throw new Error('DATABASE_URL or DB_PASSWORD/DB_HOST/DB_NAME must be set');
};

const dbUrl = getDatabaseUrl();
console.log('📋 Connecting to database...');
console.log(`📋 Database URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false,
  pool: { max: 5, min: 0, acquire: 10000, idle: 10000 },
  dialectOptions: { ssl: false }
});

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Count total users
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as count FROM users;
    `);
    const totalUsers = results[0].count;
    console.log(`📊 Total users in database: ${totalUsers}\n`);

    if (totalUsers === '0') {
      console.log('❌ No users found in staging database!');
      console.log('💡 You need to migrate users from UAT to staging.\n');
      return;
    }

    // List first 10 users with phone numbers
    console.log('📋 First 10 users (showing phone number formats):');
    const [users] = await sequelize.query(`
      SELECT id, email, "firstName", "lastName", "phoneNumber", status 
      FROM users 
      ORDER BY id 
      LIMIT 10;
    `);

    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    users.forEach(user => {
      console.log(`  ID: ${user.id}, Phone: ${user.phoneNumber || '(none)'}, Email: ${user.email}, Status: ${user.status}`);
    });

    // If phone number provided, search for it
    const phoneNumber = process.argv[2];
    if (phoneNumber) {
      console.log(`\n🔍 Searching for phone number: ${phoneNumber}`);
      
      // Try multiple formats
      const cleaned = phoneNumber.replace(/\D/g, '');
      const formats = [];
      
      if (cleaned.startsWith('0')) {
        formats.push(cleaned); // 0825571055
        formats.push('27' + cleaned.substring(1)); // 27825571055
        formats.push('+27' + cleaned.substring(1)); // +27825571055
      } else if (cleaned.startsWith('27')) {
        formats.push(cleaned); // 27825571055
        formats.push('+' + cleaned); // +27825571055
        formats.push('0' + cleaned.substring(2)); // 0825571055
      } else if (cleaned.startsWith('+27')) {
        formats.push(cleaned); // +27825571055
        formats.push(cleaned.substring(1)); // 27825571055
        formats.push('0' + cleaned.substring(3)); // 0825571055
      } else {
        formats.push(cleaned);
        formats.push('27' + cleaned);
        formats.push('+27' + cleaned);
        formats.push('0' + cleaned);
      }

      console.log(`📋 Searching formats: ${formats.join(', ')}`);

      const [found] = await sequelize.query(`
        SELECT id, email, "firstName", "lastName", "phoneNumber", status 
        FROM users 
        WHERE "phoneNumber" IN (:formats)
        LIMIT 5;
      `, {
        replacements: { formats }
      });

      if (found.length === 0) {
        console.log('❌ User not found with any of these formats');
        console.log('💡 Check if user exists in UAT database and needs to be migrated');
      } else {
        console.log(`✅ Found ${found.length} user(s):`);
        found.forEach(user => {
          console.log(`  ID: ${user.id}, Phone: ${user.phoneNumber}, Email: ${user.email}, Status: ${user.status}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

checkUsers();

