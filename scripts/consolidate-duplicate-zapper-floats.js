#!/usr/bin/env node
/**
 * Consolidate Duplicate Zapper Float Accounts
 * 
 * This script identifies duplicate Zapper float accounts and consolidates them
 * by transferring balances to the primary account (ZAPPER_FLOAT_001) and
 * deactivating duplicate accounts.
 * 
 * Usage:
 *   node scripts/consolidate-duplicate-zapper-floats.js [--dry-run]
 */

require('dotenv').config();

// Set DATABASE_URL from db-connection-helper before loading models
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');

// Set DATABASE_URL for Sequelize models
process.env.DATABASE_URL = getUATDatabaseURL();

const { SupplierFloat, Transaction, sequelize } = require('../models');
const { Op } = require('sequelize');

const PRIMARY_ACCOUNT_NUMBER = 'ZAPPER_FLOAT_001';
const DRY_RUN = process.argv.includes('--dry-run');

async function consolidateDuplicateZapperFloats() {
  try {
    console.log('🔍 Identifying Duplicate Zapper Float Accounts...\n');
    console.log('='.repeat(80));

    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }

    // Find all Zapper float accounts
    const zapperFloats = await SupplierFloat.findAll({
      where: { supplierId: 'zapper' },
      order: [['createdAt', 'ASC']]
    });

    if (zapperFloats.length === 0) {
      console.log('✅ No Zapper float accounts found.\n');
      await closeAll();
      process.exit(0);
    }

    if (zapperFloats.length === 1) {
      console.log('✅ Only one Zapper float account found. No consolidation needed.\n');
      console.log(`   Account: ${zapperFloats[0].floatAccountNumber} (Balance: R${parseFloat(zapperFloats[0].currentBalance || 0).toFixed(2)})\n`);
      await closeAll();
      process.exit(0);
    }

    console.log(`📊 Found ${zapperFloats.length} Zapper float account(s):\n`);

    // Identify primary account
    let primaryFloat = zapperFloats.find(f => f.floatAccountNumber === PRIMARY_ACCOUNT_NUMBER);
    const duplicateFloats = zapperFloats.filter(f => f.floatAccountNumber !== PRIMARY_ACCOUNT_NUMBER);

    if (!primaryFloat) {
      // If primary doesn't exist, use the oldest account as primary
      primaryFloat = zapperFloats[0];
      console.log(`⚠️  Primary account (${PRIMARY_ACCOUNT_NUMBER}) not found.`);
      console.log(`   Using oldest account as primary: ${primaryFloat.floatAccountNumber}\n`);
    } else {
      console.log(`✅ Primary account found: ${primaryFloat.floatAccountNumber}\n`);
    }

    // Display all accounts
    zapperFloats.forEach((float, index) => {
      const balance = parseFloat(float.currentBalance || 0);
      const isPrimary = float.id === primaryFloat.id;
      const status = isPrimary ? 'PRIMARY' : 'DUPLICATE';
      
      console.log(`${index + 1}. ${isPrimary ? '✅' : '⚠️'} ${float.floatAccountNumber} (${status})`);
      console.log(`   Balance: R${balance.toLocaleString('en-ZA', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2,
        useGrouping: true
      })}`);
      console.log(`   Created: ${float.createdAt}`);
      console.log(`   Status: ${float.status}, Active: ${float.isActive ? 'Yes' : 'No'}\n`);
    });

    // Check for transactions referencing duplicate accounts
    console.log('🔍 Checking for transactions referencing duplicate accounts...\n');
    
    const duplicateAccountNumbers = duplicateFloats.map(f => f.floatAccountNumber);
    let transactionsWithOldAccount = [];

    for (const accountNumber of duplicateAccountNumbers) {
      // Check Transaction metadata for zapperFloatAccount
      const txs = await Transaction.findAll({
        where: {
          [Op.or]: [
            { description: { [Op.like]: `%QR Payment%` } },
            { type: 'payment' }
          ]
        },
        limit: 1000 // Reasonable limit for checking
      });

      const matchingTxs = txs.filter(tx => {
        const metadata = tx.metadata || {};
        return metadata.zapperFloatAccount === accountNumber;
      });

      if (matchingTxs.length > 0) {
        transactionsWithOldAccount.push({
          accountNumber,
          count: matchingTxs.length
        });
        console.log(`   ⚠️  Found ${matchingTxs.length} transaction(s) referencing ${accountNumber}`);
      }
    }

    if (transactionsWithOldAccount.length === 0) {
      console.log('   ✅ No transactions found referencing duplicate accounts\n');
    }

    // Calculate total balance to consolidate
    let totalBalanceToTransfer = 0;
    duplicateFloats.forEach(float => {
      const balance = parseFloat(float.currentBalance || 0);
      totalBalanceToTransfer += balance;
    });

    console.log('='.repeat(80));
    console.log('\n📋 Consolidation Plan:\n');
    console.log(`   Primary Account: ${primaryFloat.floatAccountNumber}`);
    console.log(`   Current Primary Balance: R${parseFloat(primaryFloat.currentBalance || 0).toLocaleString('en-ZA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2,
      useGrouping: true
    })}`);
    console.log(`   Balance to Transfer: R${totalBalanceToTransfer.toLocaleString('en-ZA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2,
      useGrouping: true
    })}`);
    console.log(`   New Primary Balance: R${(parseFloat(primaryFloat.currentBalance || 0) + totalBalanceToTransfer).toLocaleString('en-ZA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2,
      useGrouping: true
    })}`);
    console.log(`   Duplicate Accounts to Deactivate: ${duplicateFloats.length}`);

    if (transactionsWithOldAccount.length > 0) {
      console.log(`   ⚠️  Transactions to Update: ${transactionsWithOldAccount.reduce((sum, t) => sum + t.count, 0)}`);
    }

    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN - No changes made. Run without --dry-run to execute consolidation.\n');
      await closeAll();
      process.exit(0);
    }

    // Confirm before proceeding
    console.log('\n⚠️  This will:');
    console.log('   1. Transfer all balances from duplicate accounts to primary account');
    console.log('   2. Update transaction metadata to reference primary account');
    console.log('   3. Deactivate duplicate accounts');
    console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Perform consolidation
    console.log('🔄 Starting consolidation...\n');

    await sequelize.transaction(async (t) => {
      // Transfer balances
      if (totalBalanceToTransfer > 0) {
        await primaryFloat.increment('currentBalance', {
          by: totalBalanceToTransfer,
          transaction: t
        });
        console.log(`✅ Transferred R${totalBalanceToTransfer.toLocaleString('en-ZA', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2,
          useGrouping: true
        })} to primary account`);
      }

      // Update transaction metadata
      if (transactionsWithOldAccount.length > 0) {
        for (const { accountNumber } of transactionsWithOldAccount) {
          const txs = await Transaction.findAll({
            where: {
              [Op.or]: [
                { description: { [Op.like]: `%QR Payment%` } },
                { type: 'payment' }
              ]
            },
            transaction: t
          });

          let updatedCount = 0;
          for (const tx of txs) {
            const metadata = tx.metadata || {};
            if (metadata.zapperFloatAccount === accountNumber) {
              metadata.zapperFloatAccount = PRIMARY_ACCOUNT_NUMBER;
              await tx.update({ metadata }, { transaction: t });
              updatedCount++;
            }
          }

          if (updatedCount > 0) {
            console.log(`✅ Updated ${updatedCount} transaction(s) to reference ${PRIMARY_ACCOUNT_NUMBER}`);
          }
        }
      }

      // Deactivate duplicate accounts
      for (const float of duplicateFloats) {
        await float.update({
          status: 'closed',
          isActive: false,
          metadata: {
            ...(float.metadata || {}),
            consolidatedAt: new Date().toISOString(),
            consolidatedTo: PRIMARY_ACCOUNT_NUMBER,
            consolidationReason: 'Duplicate account - consolidated to primary'
          }
        }, { transaction: t });
        console.log(`✅ Deactivated duplicate account: ${float.floatAccountNumber}`);
      }
    });

    // Reload primary account to show final balance
    await primaryFloat.reload();
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Consolidation Complete!\n');
    console.log(`   Primary Account: ${primaryFloat.floatAccountNumber}`);
    console.log(`   Final Balance: R${parseFloat(primaryFloat.currentBalance || 0).toLocaleString('en-ZA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2,
      useGrouping: true
    })}`);
    console.log(`   Duplicate Accounts Deactivated: ${duplicateFloats.length}\n`);

    await closeAll();
    console.log('✅ Operation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    
    await closeAll().catch(() => {});
    process.exit(1);
  }
}

// Run the script
consolidateDuplicateZapperFloats();
