#!/usr/bin/env node

/**
 * Check MobileMart Transactions Script
 * 
 * Queries the database to see MobileMart transactions and their status
 */

require('dotenv').config();

// Set DATABASE_URL from db-connection-helper before loading models
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');
process.env.DATABASE_URL = getUATDatabaseURL();

const db = require('../models');
const { VasTransaction, Supplier, sequelize } = db;
const { Op } = require('sequelize');

async function checkTransactions() {
  try {
    console.log('🔍 Checking MobileMart Transactions...\n');
    
    // Find MobileMart supplier
    const mobilemartSupplier = await Supplier.findOne({
      where: { code: 'MOBILEMART' }
    });
    
    if (!mobilemartSupplier) {
      console.log('❌ MobileMart supplier not found');
      return;
    }
    
    console.log(`✅ Found MobileMart supplier: ID ${mobilemartSupplier.id}\n`);
    
    // Find all MobileMart transactions
    const transactions = await VasTransaction.findAll({
      where: {
        [Op.or]: [
          { supplierId: 'MOBILEMART' },
          { metadata: { supplier: 'MOBILEMART' } }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    console.log(`📊 Found ${transactions.length} MobileMart transactions\n`);
    console.log('='.repeat(80));
    
    if (transactions.length === 0) {
      console.log('ℹ️  No MobileMart transactions found in database');
      return;
    }
    
    // Group by status
    const byStatus = {};
    transactions.forEach(tx => {
      const status = tx.status || 'unknown';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(tx);
    });
    
    console.log('\n📊 Transaction Summary by Status:');
    Object.keys(byStatus).forEach(status => {
      console.log(`   ${status}: ${byStatus[status].length}`);
    });
    
    console.log('\n📋 Recent Transactions (last 20):');
    console.log('='.repeat(80));
    
    transactions.slice(0, 20).forEach((tx, index) => {
      console.log(`\n${index + 1}. Transaction ID: ${tx.transactionId || tx.id}`);
      console.log(`   Status: ${tx.status || 'unknown'}`);
      console.log(`   VAS Type: ${tx.vasType || 'unknown'}`);
      console.log(`   Amount: R${(tx.amount / 100).toFixed(2)} (${tx.amount} cents)`);
      console.log(`   Mobile: ${tx.mobileNumber || 'N/A'}`);
      console.log(`   Supplier Product ID: ${tx.supplierProductId || 'N/A'}`);
      console.log(`   Reference: ${tx.reference || 'N/A'}`);
      console.log(`   Created: ${tx.createdAt}`);
      console.log(`   Updated: ${tx.updatedAt}`);
      
      if (tx.metadata) {
        console.log(`   Metadata: ${JSON.stringify(tx.metadata, null, 2).split('\n').join('\n      ')}`);
      }
    });
    
    // Check for failed transactions
    const failed = transactions.filter(tx => tx.status === 'failed');
    if (failed.length > 0) {
      console.log('\n\n❌ Failed Transactions Analysis:');
      console.log('='.repeat(80));
      failed.slice(0, 10).forEach((tx, index) => {
        console.log(`\n${index + 1}. ${tx.transactionId || tx.id}`);
        console.log(`   Error: ${tx.metadata?.errorMessage || tx.metadata?.error || 'No error message'}`);
        console.log(`   Product: ${tx.supplierProductId || 'N/A'}`);
        console.log(`   Created: ${tx.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    await closeAll();
  }
}

checkTransactions()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });
