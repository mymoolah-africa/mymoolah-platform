#!/usr/bin/env node
/**
 * Reconcile ALL wallet balances in UAT and Staging
 * 
 * Recalculates balances from completed transactions for all users
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

function getSequelize(url, label) {
  if (!url) {
    console.error(`❌ Missing database URL for ${label}.`);
    process.exit(1);
  }

  return new Sequelize(url, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: false },
  });
}

async function reconcileWallets(sequelize, label) {
  console.log(`\n🔍 Reconciling ${label} Wallets...\n`);
  
  // Get all wallets
  const wallets = await sequelize.query(
    `SELECT id, "walletId", "userId", balance FROM wallets ORDER BY id`,
    { type: QueryTypes.SELECT }
  );
  
  console.log(`📊 Found ${wallets.length} wallets\n`);
  
  let fixed = 0;
  let alreadyCorrect = 0;
  let errors = 0;
  
  for (const wallet of wallets) {
    try {
      // Calculate correct balance from completed transactions only
      const [result] = await sequelize.query(
        `SELECT 
          SUM(CASE 
            WHEN type IN ('deposit', 'receive', 'refund', 'cashback', 'reward', 'zapper_float_credit', 'mymoolah_revenue') 
            AND status = 'completed' 
            THEN amount 
            ELSE 0 
          END) -
          SUM(CASE 
            WHEN type IN ('withdrawal', 'send', 'purchase', 'payment', 'fee', 'zapper_payment', 'zapper_fee') 
            AND status = 'completed' 
            THEN amount 
            ELSE 0 
          END) as calculated_balance
         FROM transactions
         WHERE "walletId" = :walletId`,
        {
          replacements: { walletId: wallet.walletId },
          type: QueryTypes.SELECT
        }
      );
      
      const calculatedBalance = parseFloat(result.calculated_balance || 0);
      const storedBalance = parseFloat(wallet.balance);
      const difference = calculatedBalance - storedBalance;
      
      if (Math.abs(difference) > 0.001) {
        // Balance needs fixing
        await sequelize.query(
          `UPDATE wallets 
           SET balance = :balance, 
               "updatedAt" = NOW()
           WHERE "walletId" = :walletId`,
          {
            replacements: { 
              balance: calculatedBalance, 
              walletId: wallet.walletId 
            }
          }
        );
        
        console.log(`✅ Fixed ${wallet.walletId} (User ${wallet.userId})`);
        console.log(`   Stored: R ${storedBalance.toFixed(2)} → Calculated: R ${calculatedBalance.toFixed(2)} (Diff: R ${difference.toFixed(2)})`);
        fixed++;
      } else {
        console.log(`✓  ${wallet.walletId} (User ${wallet.userId}) - Already correct: R ${storedBalance.toFixed(2)}`);
        alreadyCorrect++;
      }
      
    } catch (error) {
      console.error(`❌ Error reconciling ${wallet.walletId}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 ${label} Reconciliation Summary:`);
  console.log(`   Fixed: ${fixed} wallets`);
  console.log(`   Already Correct: ${alreadyCorrect} wallets`);
  console.log(`   Errors: ${errors} wallets`);
  
  return { fixed, alreadyCorrect, errors };
}

async function main() {
  console.log('🔍 Reconciling ALL Wallet Balances');
  console.log('═══════════════════════════════════\n');

  const uatUrl = process.env.UAT_DATABASE_URL || process.env.DATABASE_URL;
  const stagingUrl = process.env.STAGING_DATABASE_URL;

  if (!uatUrl || !stagingUrl) {
    console.error('❌ Both UAT_DATABASE_URL and STAGING_DATABASE_URL are required.');
    process.exit(1);
  }

  const uat = getSequelize(uatUrl, 'UAT');
  const staging = getSequelize(stagingUrl, 'Staging');

  try {
    console.log('🔌 Connecting to databases...');
    await uat.authenticate();
    await staging.authenticate();
    console.log('✅ Connected to both databases');

    // Reconcile UAT
    const uatResults = await reconcileWallets(uat, 'UAT');
    
    // Reconcile Staging
    const stagingResults = await reconcileWallets(staging, 'Staging');

    console.log('\n✅ All wallets reconciled!\n');
    
    console.log('📊 Total Summary:');
    console.log(`   UAT: ${uatResults.fixed} fixed, ${uatResults.alreadyCorrect} correct, ${uatResults.errors} errors`);
    console.log(`   Staging: ${stagingResults.fixed} fixed, ${stagingResults.alreadyCorrect} correct, ${stagingResults.errors} errors\n`);

  } catch (error) {
    console.error('\n❌ Reconciliation failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exitCode = 1;
  } finally {
    await uat.close();
    await staging.close();
  }
}

main();

