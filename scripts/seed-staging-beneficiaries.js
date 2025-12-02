#!/usr/bin/env node
/**
 * Seed Staging Beneficiaries
 * 
 * Creates test beneficiaries for staging users using the UnifiedBeneficiaryService.
 * This populates the beneficiaries, beneficiary_payment_methods, and 
 * beneficiary_service_accounts tables.
 * 
 * Usage:
 *   node scripts/seed-staging-beneficiaries.js
 * 
 * Environment:
 *   - Run in Codespaces with DATABASE_URL pointing to staging DB via proxy
 * 
 * @date 2025-12-02
 */

const db = require('../models');
const { User } = db;
const UnifiedBeneficiaryService = require('../services/UnifiedBeneficiaryService');

const beneficiaryService = new UnifiedBeneficiaryService();

/**
 * Convert +27XXXXXXXXX to 0XXXXXXXXX
 */
function toLocalFormat(phoneNumber) {
  if (!phoneNumber) return null;
  return phoneNumber.replace(/^\+27/, '0');
}

/**
 * Seed beneficiaries for a user
 */
async function seedBeneficiariesForUser(user) {
  console.log(`\n👤 Seeding beneficiaries for: ${user.firstName} ${user.lastName} (${user.phoneNumber})`);
  
  const userLocalNumber = toLocalFormat(user.phoneNumber);
  
  try {
    // Get all other users (potential beneficiaries)
    const allUsers = await User.findAll({
      where: {
        id: { [db.Sequelize.Op.ne]: user.id } // Exclude current user
      }
    });
    
    let created = 0;
    
    // Create beneficiaries for each other user
    for (const otherUser of allUsers) {
      const beneficiaryLocalNumber = toLocalFormat(otherUser.phoneNumber);
      
      if (!beneficiaryLocalNumber) {
        console.log(`  ⚠️  Skipping ${otherUser.firstName} ${otherUser.lastName} - no valid phone number`);
        continue;
      }
      
      try {
        // Create beneficiary with airtime service (most common use case)
        await beneficiaryService.createOrUpdateBeneficiary(user.id, {
          name: `${otherUser.firstName} ${otherUser.lastName}`,
          msisdn: beneficiaryLocalNumber,
          serviceType: 'airtime',
          serviceData: {
            msisdn: beneficiaryLocalNumber,
            network: getNetwork(beneficiaryLocalNumber),
            isDefault: true
          },
          isFavorite: created === 0, // Make first one favorite
          notes: `Test beneficiary for staging - ${otherUser.email}`
        });
        
        console.log(`  ✅ Created beneficiary: ${otherUser.firstName} ${otherUser.lastName} (${beneficiaryLocalNumber})`);
        created++;
        
      } catch (error) {
        // Might already exist, that's okay
        if (error.message.includes('already exists') || error.message.includes('unique constraint')) {
          console.log(`  ℹ️  Beneficiary already exists: ${otherUser.firstName} ${otherUser.lastName}`);
        } else {
          console.error(`  ❌ Error creating beneficiary ${otherUser.firstName}: ${error.message}`);
        }
      }
    }
    
    console.log(`  📊 Total created: ${created} beneficiaries`);
    
  } catch (error) {
    console.error(`  ❌ Error seeding beneficiaries for user ${user.id}: ${error.message}`);
  }
}

/**
 * Determine network from phone number prefix
 */
function getNetwork(phoneNumber) {
  if (!phoneNumber) return 'vodacom';
  
  const prefix = phoneNumber.substring(0, 3);
  
  // South African network prefixes
  if (prefix === '082' || prefix === '083' || prefix === '084') return 'vodacom';
  if (prefix === '081' || prefix === '060' || prefix === '061') return 'mtn';
  if (prefix === '076' || prefix === '074') return 'cellc';
  if (prefix === '087') return 'telkom';
  
  return 'vodacom'; // Default
}

/**
 * Main seed function
 */
async function seed() {
  console.log('🌱 Seeding Staging Beneficiaries\n');
  console.log('='.repeat(60));
  
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Get all users
    const users = await User.findAll({
      order: [['id', 'ASC']]
    });
    
    if (users.length === 0) {
      console.log('⚠️  No users found in database');
      process.exit(0);
    }
    
    console.log(`\n📊 Found ${users.length} users\n`);
    
    // Seed beneficiaries for each user
    for (const user of users) {
      await seedBeneficiariesForUser(user);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    
    const totalBeneficiaries = await db.Beneficiary.count();
    const totalPaymentMethods = await db.BeneficiaryPaymentMethod.count();
    const totalServiceAccounts = await db.BeneficiaryServiceAccount.count();
    
    console.log(`Total Beneficiaries: ${totalBeneficiaries}`);
    console.log(`Total Payment Methods: ${totalPaymentMethods}`);
    console.log(`Total Service Accounts: ${totalServiceAccounts}`);
    console.log('='.repeat(60));
    
    // Show breakdown by user
    console.log('\n📈 BREAKDOWN BY USER:');
    for (const user of users) {
      const count = await db.Beneficiary.count({ where: { userId: user.id } });
      console.log(`  ${user.firstName} ${user.lastName}: ${count} beneficiaries`);
    }
    
    console.log('\n✅ Seeding completed successfully!');
    console.log('\n💡 Test in staging wallet:');
    console.log('   1. Login as any user');
    console.log('   2. Navigate to Airtime & Data');
    console.log('   3. Click "Select Beneficiary"');
    console.log('   4. You should see the other users as beneficiaries');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

// Run seed
seed();
