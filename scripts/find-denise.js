#!/usr/bin/env node

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 10000,
    idle: 10000
  }
});

async function findUser() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected! Querying...\n');
    
    // Try by phone first
    const [phoneResults] = await sequelize.query(`
      SELECT id, "firstName", "lastName", "phoneNumber", "kycStatus"
      FROM users
      WHERE "phoneNumber" LIKE '%0686772469%' 
         OR "phoneNumber" LIKE '%686772469%'
         OR "phoneNumber" LIKE '%+27686772469%'
      ORDER BY id
    `);
    
    if (phoneResults.length > 0) {
      console.log('📋 Found by phone number:');
      phoneResults.forEach(u => {
        console.log(`   ✅ User ID: ${u.id}`);
        console.log(`      Name: ${u.firstName} ${u.lastName}`);
        console.log(`      Phone: ${u.phoneNumber}`);
        console.log(`      KYC Status: ${u.kycStatus || 'N/A'}\n`);
      });
    } else {
      console.log('❌ No user found with phone 0686772469\n');
      
      // Try by name
      console.log('Searching by name "Denise Botes"...');
      const [nameResults] = await sequelize.query(`
        SELECT id, "firstName", "lastName", "phoneNumber", "kycStatus"
        FROM users
        WHERE "firstName" ILIKE '%Denise%' AND "lastName" ILIKE '%Botes%'
        ORDER BY id
      `);
      
      if (nameResults.length > 0) {
        console.log('📋 Found by name:');
        nameResults.forEach(u => {
          console.log(`   ✅ User ID: ${u.id}`);
          console.log(`      Name: ${u.firstName} ${u.lastName}`);
          console.log(`      Phone: ${u.phoneNumber}`);
          console.log(`      KYC Status: ${u.kycStatus || 'N/A'}\n`);
        });
      } else {
        console.log('❌ No user found with name "Denise Botes"');
      }
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

findUser();

