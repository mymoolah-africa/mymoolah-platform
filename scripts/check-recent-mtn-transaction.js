#!/usr/bin/env node

/**
 * Check recent MTN transaction to verify if it was successfully fulfilled
 * Usage: node scripts/check-recent-mtn-transaction.js
 */

require('dotenv').config();
const { getUATDatabaseURL } = require('../scripts/db-connection-helper');

// Set DATABASE_URL before loading models
process.env.DATABASE_URL = getUATDatabaseURL();

const { VasTransaction, MobileMartTransaction, Beneficiary } = require('../models');

async function checkRecentMTNTransaction() {
  try {
    console.log('🔍 Checking recent MTN transactions...\n');
    
    // Find recent transactions for MTN test beneficiary
    // Try multiple possible names
    let beneficiary = await Beneficiary.findOne({
      where: {
        name: { [require('sequelize').Op.like]: '%MTN Test%' }
      }
    });
    
    if (!beneficiary) {
      beneficiary = await Beneficiary.findOne({
        where: {
          name: { [require('sequelize').Op.like]: '%UAT Test%' }
        }
      });
    }
    
    if (!beneficiary) {
      // Try to find by identifier (0830012300)
      beneficiary = await Beneficiary.findOne({
        where: {
          identifier: { [require('sequelize').Op.like]: '%0830012300%' }
        }
      });
    }
    
    if (!beneficiary) {
      console.log('❌ No MTN test beneficiary found. Searching for any recent data/airtime transactions...\n');
      
      // Get most recent data/airtime transaction regardless of beneficiary
      const recentTx = await VasTransaction.findOne({
        where: {
          vasType: { [require('sequelize').Op.in]: ['airtime', 'data'] }
        },
        order: [['createdAt', 'DESC']],
        include: [{ model: Beneficiary, as: 'Beneficiary' }]
      });
      
      if (recentTx && recentTx.Beneficiary) {
        beneficiary = recentTx.Beneficiary;
        console.log(`✅ Found most recent transaction beneficiary: ${beneficiary.name}\n`);
      } else {
        console.log('❌ No recent transactions found');
        return;
      }
    }
    
    console.log(`✅ Found beneficiary: ${beneficiary.name} (ID: ${beneficiary.id})`);
    console.log(`   Identifier: ${beneficiary.identifier}\n`);
    
    // Get recent transactions for this beneficiary
    const transactions = await VasTransaction.findAll({
      where: {
        beneficiaryId: beneficiary.id,
        vasType: { [require('sequelize').Op.in]: ['airtime', 'data'] }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    if (transactions.length === 0) {
      console.log('❌ No transactions found for this beneficiary');
      return;
    }
    
    console.log(`📊 Found ${transactions.length} recent transaction(s):\n`);
    
    for (const tx of transactions) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Transaction ID: ${tx.transactionId}`);
      console.log(`Reference: ${tx.reference}`);
      console.log(`Type: ${tx.vasType}`);
      console.log(`Amount: R${(tx.amountInCents / 100).toFixed(2)}`);
      console.log(`Status: ${tx.status}`);
      console.log(`Supplier: ${tx.supplierId || 'N/A'}`);
      console.log(`Supplier Reference: ${tx.supplierReference || 'N/A'}`);
      console.log(`Mobile Number: ${tx.mobileNumber || 'N/A'}`);
      console.log(`Created: ${tx.createdAt}`);
      console.log(`Processed: ${tx.processedAt || 'Not processed'}`);
      console.log(`Error Message: ${tx.errorMessage || 'None'}`);
      console.log(`Metadata: ${JSON.stringify(tx.metadata || {}, null, 2)}`);
      
      // Check for MobileMartTransaction record
      if (tx.supplierId === 'MOBILEMART' || tx.supplierReference) {
        const mmTx = await MobileMartTransaction.findOne({
          where: {
            reference: tx.reference
          }
        });
        
        if (mmTx) {
          console.log(`\n📱 MobileMart Transaction Details:`);
          console.log(`   Status: ${mmTx.status}`);
          console.log(`   MobileMart Transaction ID: ${mmTx.transactionId || 'N/A'}`);
          console.log(`   Response Code: ${mmTx.mobilemartResponseCode || 'N/A'}`);
          console.log(`   Response Message: ${mmTx.mobilemartResponseMessage || 'N/A'}`);
          console.log(`   Error Message: ${mmTx.errorMessage || 'None'}`);
          console.log(`   Metadata: ${JSON.stringify(mmTx.metadata || {}, null, 2)}`);
        } else {
          console.log(`\n⚠️  No MobileMartTransaction record found for this transaction`);
        }
      }
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking transactions:', error);
    process.exit(1);
  }
}

checkRecentMTNTransaction();

