/**
 * Diagnostic script to check transactions for a user
 * Usage: node scripts/check-user-transactions.js <userId>
 */

require('dotenv').config();
const { sequelize, Transaction, Wallet, User } = require('../models');

async function checkUserTransactions(userId) {
  try {
    console.log(`\n🔍 Checking transactions for User ID: ${userId}\n`);
    
    // Get user info
    const user = await User.findByPk(userId);
    if (!user) {
      console.log(`❌ User ID ${userId} not found`);
      return;
    }
    console.log(`✅ User found: ${user.firstName} ${user.lastName} (${user.phone})`);
    
    // Get wallet info
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
      console.log(`❌ No wallet found for user ID ${userId}`);
      return;
    }
    console.log(`✅ Wallet found: ${wallet.walletId}, Balance: R${wallet.balance}\n`);
    
    // Get ALL transactions for this user (no filters)
    const allTransactions = await Transaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    
    console.log(`📊 Total transactions in database: ${allTransactions.length}\n`);
    
    if (allTransactions.length === 0) {
      console.log('⚠️  No transactions found in database for this user');
      return;
    }
    
    // Group by type
    const byType = {};
    allTransactions.forEach(tx => {
      const type = tx.type || 'unknown';
      if (!byType[type]) byType[type] = [];
      byType[type].push(tx);
    });
    
    console.log('📋 Transactions by type:');
    Object.keys(byType).forEach(type => {
      console.log(`  ${type}: ${byType[type].length} transaction(s)`);
      byType[type].forEach(tx => {
        console.log(`    - ${tx.transactionId}: R${tx.amount} - ${tx.description || 'No description'} (${tx.status}) - ${tx.createdAt}`);
      });
    });
    
    // Check for deposits specifically
    const deposits = allTransactions.filter(tx => 
      tx.type === 'deposit' || 
      tx.type === 'credit' ||
      (tx.description && tx.description.toLowerCase().includes('deposit'))
    );
    
    console.log(`\n💰 Deposits found: ${deposits.length}`);
    deposits.forEach(tx => {
      console.log(`  - ${tx.transactionId}: R${tx.amount} - ${tx.description || 'No description'} (${tx.status}) - ${tx.createdAt}`);
    });
    
    // Check what would be filtered out
    console.log(`\n🔍 Checking filter logic...`);
    const filteredOut = allTransactions.filter((tx) => {
      const desc = (tx.description || '').toLowerCase();
      const type = (tx.type || '').toLowerCase();
      
      const internalAccountingTypes = [
        'vat_payable',
        'mymoolah_revenue',
        'zapper_float_credit',
        'float_credit',
        'revenue'
      ];
      if (internalAccountingTypes.includes(type)) {
        return true;
      }
      
      if (desc.includes('vat payable') || 
          desc.includes('vat payable to') ||
          desc.includes('vat to') ||
          (desc.includes('vat') && desc.includes('payable'))) {
        return true;
      }
      
      if (desc.includes('mymoolah revenue') ||
          desc.includes('revenue from') ||
          desc.includes('revenue f') ||
          (desc.includes('revenue') && desc.includes('mymoolah'))) {
        return true;
      }
      
      if (desc.includes('float credit') ||
          desc.includes('float credit from') ||
          desc.includes('zapper float credit') ||
          (desc.includes('float') && desc.includes('credit'))) {
        return true;
      }
      
      return false;
    });
    
    console.log(`⚠️  Transactions that would be filtered out: ${filteredOut.length}`);
    filteredOut.forEach(tx => {
      console.log(`  - ${tx.transactionId}: ${tx.type} - ${tx.description || 'No description'}`);
    });
    
    console.log(`\n✅ Transactions that would be shown: ${allTransactions.length - filteredOut.length}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

const userId = process.argv[2] || 1;
checkUserTransactions(parseInt(userId));

