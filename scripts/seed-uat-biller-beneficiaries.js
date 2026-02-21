#!/usr/bin/env node
/**
 * Seed UAT Bill Payment Beneficiaries
 *
 * Adds MobileMart UAT test beneficiaries for bill payment overlay:
 * - 2x DSTV accounts (135609708, 135520754)
 * - PEP beneficiaries (Pepkor Trading)
 * - Pay@ Oudtshoorn Municipality (11347901450000300)
 *
 * Per: integrations/mobilemart/MOBILEMART_UAT_TEST_NUMBERS.md
 *
 * Usage:
 *   node scripts/seed-uat-biller-beneficiaries.js
 *
 * Environment:
 *   - Uses db-connection-helper.js for UAT connection (DB_PASSWORD + proxy)
 *   - Start proxy first in Codespaces: ./scripts/one-click-restart-and-start.sh
 *
 * @date 2026-02-21
 */

require('dotenv').config();

// Always use db-connection-helper for DB connection (UAT)
const { getUATDatabaseURL } = require('./db-connection-helper');
process.env.DATABASE_URL = getUATDatabaseURL();

const db = require('../models');
const { User } = db;
const sequelize = db.sequelize;
const UnifiedBeneficiaryService = require('../services/UnifiedBeneficiaryService');

const beneficiaryService = new UnifiedBeneficiaryService();

// UAT test accounts from MobileMart UAT API credentials
const UAT_BILLER_BENEFICIARIES = [
  // DSTV - 2 accounts per UAT docs
  { accountNumber: '135609708', billerName: 'DSTV', displayName: 'DSTV UAT 1' },
  { accountNumber: '135520754', billerName: 'DSTV', displayName: 'DSTV UAT 2' },
  // Pay@ Oudtshoorn Municipality
  { accountNumber: '11347901450000300', billerName: 'Oudtshoorn Municipality', displayName: 'Oudtshoorn Pay@' },
  // PEP - Pepkor Trading (Pty) Ltd - retail category from UAT
  { accountNumber: '1234567890', billerName: 'Pepkor Trading (Pty) Ltd', displayName: 'Pep UAT Test' }
];

/**
 * Resolve biller names from ProductVariant to match overlay display
 * Overlay uses provider or product.name from bill-payment variants
 */
async function resolveBillerNames() {
  const { QueryTypes } = require('sequelize');
  const results = await sequelize.query(
    `SELECT DISTINCT pv.provider, p.name as product_name
     FROM product_variants pv
     JOIN products p ON pv."productId" = p.id
     WHERE p.type = 'bill_payment' AND pv.status = 'active'
     ORDER BY pv.provider`,
    { type: QueryTypes.SELECT }
  );

  const providerMap = {};
  results.forEach((r) => {
    const displayName = r.product_name || r.provider;
    providerMap[(r.provider || '').toLowerCase()] = displayName || r.provider;
    if (r.product_name) {
      providerMap[(r.product_name || '').toLowerCase()] = displayName || r.provider;
    }
  });
  return providerMap;
}

/**
 * Resolve biller names - try to match UAT beneficiaries to actual DB providers
 */
async function getBillerNameForDisplay(candidateName, providerMap) {
  const lower = (candidateName || '').toLowerCase();
  if (providerMap[lower]) return providerMap[lower];

  // Fuzzy match: DSTV
  if (lower.includes('dstv')) {
    const match = Object.keys(providerMap).find((k) => k.includes('dstv') || k.includes('multichoice'));
    return match ? providerMap[match] : 'DSTV';
  }
  // Pepkor
  if (lower.includes('pep') || lower.includes('pepkor')) {
    const match = Object.keys(providerMap).find((k) => k.includes('pep') || k.includes('pepkor'));
    return match ? providerMap[match] : 'Pepkor Trading (Pty) Ltd';
  }
  // Oudtshoorn
  if (lower.includes('oudtshoorn') || lower.includes('pay@')) {
    const match = Object.keys(providerMap).find((k) => k.includes('oudtshoorn') || k.includes('municipality'));
    return match ? providerMap[match] : 'Oudtshoorn Municipality';
  }

  return candidateName;
}

/**
 * Seed UAT biller beneficiaries for a user
 */
async function seedBillerBeneficiariesForUser(user) {
  console.log(`\n👤 Seeding UAT biller beneficiaries for: ${user.firstName} ${user.lastName} (${user.phoneNumber})`);

  let providerMap = {};
  try {
    providerMap = await resolveBillerNames();
  } catch (e) {
    console.warn('  ⚠️  Could not resolve provider names, using defaults');
  }

  let created = 0;
  for (const entry of UAT_BILLER_BENEFICIARIES) {
    const billerName = await getBillerNameForDisplay(entry.billerName, providerMap);
    try {
      await beneficiaryService.createOrUpdateBeneficiary(user.id, {
        name: entry.displayName,
        msisdn: null, // Will use NON_MSI_ for biller
        serviceType: 'biller',
        serviceData: {
          accountNumber: entry.accountNumber,
          billerName: billerName,
          isDefault: true
        },
        isFavorite: created === 0,
        notes: `UAT test beneficiary - ${entry.billerName}`
      });
      console.log(`  ✅ ${entry.displayName} (${entry.accountNumber}) → ${billerName}`);
      created++;
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('unique constraint')) {
        console.log(`  ℹ️  Already exists: ${entry.displayName}`);
      } else {
        console.error(`  ❌ ${entry.displayName}: ${error.message}`);
      }
    }
  }

  console.log(`  📊 Processed: ${UAT_BILLER_BENEFICIARIES.length} UAT beneficiaries`);
}

/**
 * Main
 */
async function seed() {
  console.log('🌱 Seeding UAT Bill Payment Beneficiaries\n');
  console.log('='.repeat(60));
  console.log('Per: integrations/mobilemart/MOBILEMART_UAT_TEST_NUMBERS.md');
  console.log('  - DSTV: 135609708, 135520754');
  console.log('  - Pay@: 11347901450000300 (Oudtshoorn)');
  console.log('  - PEP: 1234567890 (Pepkor - placeholder if no UAT number)');
  console.log('='.repeat(60));

  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established');

    const users = await User.findAll({ order: [['id', 'ASC']] });

    if (users.length === 0) {
      console.log('⚠️  No users found');
      process.exit(0);
    }

    console.log(`\n📊 Found ${users.length} users\n`);

    for (const user of users) {
      await seedBillerBeneficiariesForUser(user);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));

    const { BeneficiaryServiceAccount } = db;
    const billerCount = await BeneficiaryServiceAccount.count({
      where: { serviceType: 'biller' }
    });
    console.log(`Biller service accounts: ${billerCount}`);
    console.log('='.repeat(60));

    console.log('\n✅ Seeding completed!');
    console.log('\n💡 Test in Bill Payment overlay:');
    console.log('   1. Login as any user');
    console.log('   2. Navigate to Bill Payments');
    console.log('   3. Search or select DSTV, Pepkor, or Oudtshoorn');
    console.log('   4. UAT beneficiaries should appear in Select Recipient');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

seed();
