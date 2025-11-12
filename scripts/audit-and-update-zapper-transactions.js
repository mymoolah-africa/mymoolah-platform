/**
 * Audit and Update Zapper Transactions
 * 
 * This script:
 * 1. Finds all existing Zapper QR payment transactions
 * 2. Checks if they have proper fee structure, VAT allocation, and float crediting
 * 3. Updates transactions that need correction
 * 4. Creates missing TaxTransaction records
 * 5. Updates Zapper float account balance
 * 
 * Usage:
 *   - In Codespaces: Make sure Cloud SQL Auth Proxy is running, then run this script
 *   - Locally: Ensure DATABASE_URL is set correctly
 */

require('dotenv').config();

// Check if Cloud SQL Auth Proxy is running (Codespaces)
// If proxy is running on port 6543, override DATABASE_URL to use it
const fs = require('fs');
const { execSync } = require('child_process');

let useProxy = false;
let proxyRunning = false;

// Check if proxy is running on port 6543
try {
  // Check if port 6543 is listening
  execSync('nc -z 127.0.0.1 6543 2>/dev/null || true', { stdio: 'ignore' });
  // Alternative check: look for proxy process
  try {
    const proxyPids = execSync('pgrep -f "cloud-sql-proxy.*6543" 2>/dev/null || true', { encoding: 'utf8' }).trim();
    proxyRunning = proxyPids.length > 0;
  } catch (e) {
    // pgrep not available or no matches
  }
  
  // If proxy is running, override DATABASE_URL to use it
  if (proxyRunning && process.env.DATABASE_URL) {
    try {
      const originalUrl = new URL(process.env.DATABASE_URL);
      originalUrl.hostname = '127.0.0.1';
      originalUrl.port = '6543';
      originalUrl.searchParams.set('sslmode', 'disable');
      process.env.DATABASE_URL = originalUrl.toString();
      useProxy = true;
      console.log('ℹ️  Cloud SQL Auth Proxy detected - using proxy connection (127.0.0.1:6543)\n');
    } catch (urlError) {
      console.log('⚠️  Could not parse DATABASE_URL, using as-is\n');
    }
  } else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('127.0.0.1:6543')) {
    useProxy = true;
    console.log('ℹ️  Using Cloud SQL Auth Proxy connection (from DATABASE_URL)\n');
  } else {
    console.log('ℹ️  Using direct database connection');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'not set');
    if (!proxyRunning) {
      console.log('   💡 Tip: In Codespaces, start the proxy first: ./scripts/one-click-restart-and-start.sh\n');
    } else {
      console.log('');
    }
  }
} catch (error) {
  // Fallback to checking DATABASE_URL
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('127.0.0.1:6543')) {
    useProxy = true;
    console.log('ℹ️  Using Cloud SQL Auth Proxy connection (from DATABASE_URL)\n');
  } else {
    console.log('ℹ️  Using direct database connection\n');
  }
}

const { Transaction, SupplierFloat, TaxTransaction, sequelize } = require('../models');
const { Op } = require('sequelize');
const ledgerService = require('../services/ledgerService');
const { v4: uuidv4 } = require('uuid');

const VAT_RATE = Number(process.env.VAT_RATE || 0.15);
const ZAPPER_DEFAULT_FEE_INCL_VAT = Number(process.env.ZAPPER_DEFAULT_FEE_INCL_VAT || 3.00);
const ZAPPER_FLOAT_ACCOUNT_NUMBER = process.env.ZAPPER_FLOAT_ACCOUNT_NUMBER || 'ZAPPER_FLOAT_001';
const LEDGER_ACCOUNT_MM_COMMISSION_CLEARING = process.env.LEDGER_ACCOUNT_MM_COMMISSION_CLEARING || null;
const LEDGER_ACCOUNT_COMMISSION_REVENUE = process.env.LEDGER_ACCOUNT_COMMISSION_REVENUE || null;
const LEDGER_ACCOUNT_VAT_CONTROL = process.env.LEDGER_ACCOUNT_VAT_CONTROL || null;

/**
 * Calculate VAT and net fee from inclusive fee amount
 */
function calculateZapperFeeBreakdown(feeInclVat) {
  const vatAmount = Number((feeInclVat * VAT_RATE / (1 + VAT_RATE)).toFixed(2));
  const netFeeAmount = Number((feeInclVat - vatAmount).toFixed(2));
  return {
    feeInclVat: Number(feeInclVat.toFixed(2)),
    vatAmount,
    netFeeAmount
  };
}

/**
 * Allocate Zapper fee to VAT control and MM revenue accounts
 */
async function allocateZapperFeeAndVat({
  feeInclVat,
  walletTransactionId,
  idempotencyKey,
  userId,
  paymentAmount,
  merchantName
}) {
  try {
    if (!feeInclVat || feeInclVat <= 0) {
      return null;
    }

    const feeBreakdown = calculateZapperFeeBreakdown(feeInclVat);
    const { vatAmount, netFeeAmount } = feeBreakdown;

    // Check if TaxTransaction already exists (only if table exists)
    let existingTaxTx = null;
    let taxTableExists = true;
    try {
      existingTaxTx = await TaxTransaction.findOne({
        where: { originalTransactionId: walletTransactionId }
      });
    } catch (taxTableError) {
      if (taxTableError.message && (taxTableError.message.includes('does not exist') || taxTableError.original?.message?.includes('does not exist'))) {
        taxTableExists = false;
        console.log(`  ⚠️  TaxTransaction table doesn't exist - skipping tax record creation`);
        // Continue with ledger entries even if tax table doesn't exist
      } else {
        throw taxTableError;
      }
    }

    if (!existingTaxTx && taxTableExists) {
      // Create TaxTransaction record (only if table exists)
      const taxTransactionId = `TAX-ZAPPER-${uuidv4()}`;
      const now = new Date();
      const taxPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const taxPayload = {
        taxTransactionId,
        originalTransactionId: walletTransactionId,
        taxCode: 'VAT_15',
        taxName: 'VAT 15%',
        taxType: 'vat',
        baseAmount: netFeeAmount,
        taxAmount: vatAmount,
        totalAmount: feeInclVat,
        taxRate: VAT_RATE,
        calculationMethod: 'inclusive',
        businessContext: 'wallet_user',
        transactionType: 'zapper_qr_payment',
        entityId: 'ZAPPER',
        entityType: 'payment_processor',
        taxPeriod,
        taxYear: now.getFullYear(),
        status: 'calculated',
        metadata: {
          idempotencyKey,
          userId,
          vatRate: VAT_RATE,
          paymentAmount,
          merchantName
        },
      };

      try {
        await TaxTransaction.create(taxPayload);
        console.log(`  ✅ Created TaxTransaction: ${taxTransactionId}`);
      } catch (taxErr) {
        if (taxErr.message && (taxErr.message.includes('does not exist') || taxErr.original?.message?.includes('does not exist'))) {
          console.log(`  ⚠️  TaxTransaction table doesn't exist - skipping tax record`);
        } else {
          console.error(`  ⚠️ Failed to persist tax transaction for Zapper fee:`, taxErr.message);
        }
      }
    } else if (existingTaxTx) {
      console.log(`  ℹ️  TaxTransaction already exists: ${existingTaxTx.taxTransactionId}`);
    }

    // Post ledger entries if accounts are configured
    if (
      LEDGER_ACCOUNT_MM_COMMISSION_CLEARING &&
      LEDGER_ACCOUNT_COMMISSION_REVENUE &&
      LEDGER_ACCOUNT_VAT_CONTROL
    ) {
      // Check if journal entry already exists (by reference)
      const journalRef = `ZAPPER-FEE-${walletTransactionId}`;
      // Note: We can't easily check if journal exists, so we'll try to create it
      // and catch duplicate errors if any
      try {
        await ledgerService.postJournalEntry({
          reference: journalRef,
          description: `Zapper QR payment fee allocation (${merchantName || 'Merchant'})`,
          lines: [
            {
              accountCode: LEDGER_ACCOUNT_MM_COMMISSION_CLEARING,
              dc: 'debit',
              amount: feeInclVat,
              memo: 'Zapper fee clearing',
            },
            {
              accountCode: LEDGER_ACCOUNT_VAT_CONTROL,
              dc: 'credit',
              amount: vatAmount,
              memo: 'VAT payable on Zapper fee (15%)',
            },
            {
              accountCode: LEDGER_ACCOUNT_COMMISSION_REVENUE,
              dc: 'credit',
              amount: netFeeAmount,
              memo: 'Zapper fee revenue (net of VAT)',
            },
          ],
        });
        console.log(`  ✅ Created ledger journal entry: ${journalRef}`);
      } catch (ledgerErr) {
        if (ledgerErr.message.includes('duplicate') || ledgerErr.message.includes('already exists')) {
          console.log(`  ℹ️  Ledger journal entry already exists: ${journalRef}`);
        } else {
          console.error(`  ⚠️  Failed to post ledger journal: ${ledgerErr.message}`);
        }
      }
    } else {
      console.log(`  ⚠️  Ledger accounts not configured, skipping journal entry`);
    }

    return feeBreakdown;
  } catch (err) {
    console.error(`  ❌ Failed to allocate fee/VAT: ${err.message}`);
    return null;
  }
}

async function auditAndUpdateZapperTransactions() {
  console.log('🔍 Auditing Zapper QR Payment Transactions...\n');

  // Test database connection first
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (useProxy) {
      console.error('\n⚠️  Make sure the Cloud SQL Auth Proxy is running:');
      console.error('   ./scripts/one-click-restart-and-start.sh\n');
    } else {
      console.error('\n⚠️  Check your DATABASE_URL configuration\n');
    }
    throw error;
  }

  try {
    // Find all QR payment transactions
    const qrTransactions = await Transaction.findAll({
      where: {
        type: 'payment',
        description: { [Op.like]: '%QR Payment%' }
      },
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${qrTransactions.length} QR payment transactions\n`);

    if (qrTransactions.length === 0) {
      console.log('✅ No Zapper transactions found. Nothing to update.');
      return;
    }

    // Get or create Zapper float account
    let zapperFloat = await SupplierFloat.findOne({
      where: { supplierId: 'zapper', floatAccountNumber: ZAPPER_FLOAT_ACCOUNT_NUMBER }
    });

    if (!zapperFloat) {
      zapperFloat = await SupplierFloat.create({
        supplierId: 'zapper',
        supplierName: 'Zapper',
        floatAccountNumber: ZAPPER_FLOAT_ACCOUNT_NUMBER,
        floatAccountName: 'Zapper QR Payments Float',
        currentBalance: 0.00,
        initialBalance: 0.00,
        minimumBalance: 0.00,
        maximumBalance: 1000000.00,
        settlementPeriod: 'real_time',
        settlementMethod: 'prefunded',
        status: 'active',
        isActive: true,
        metadata: {
          supplierType: 'qr_payment_processor',
          settlementCurrency: 'ZAR'
        }
      });
      console.log(`✅ Created Zapper float account: ${ZAPPER_FLOAT_ACCOUNT_NUMBER}\n`);
    } else {
      console.log(`✅ Zapper float account exists: ${zapperFloat.floatAccountNumber} (Balance: R${zapperFloat.currentBalance.toFixed(2)})\n`);
    }

    let correctedCount = 0;
    let alreadyCorrectCount = 0;
    let totalFloatCredit = 0;
    let totalFeeAmount = 0;

    for (const tx of qrTransactions) {
      console.log(`\n📋 Transaction: ${tx.transactionId}`);
      console.log(`   Amount: R${parseFloat(tx.amount).toFixed(2)}`);
      console.log(`   Fee: R${parseFloat(tx.fee || 0).toFixed(2)}`);
      console.log(`   Description: ${tx.description}`);
      console.log(`   Created: ${tx.createdAt.toISOString()}`);

      const metadata = tx.metadata || {};
      const isZapperTx = metadata.zapperDecoded || metadata.zapperData || tx.description.includes('Zapper');

      if (!isZapperTx) {
        console.log(`   ⚠️  Not a Zapper transaction, skipping`);
        continue;
      }

      // Check if transaction needs correction
      const currentFee = parseFloat(tx.fee || 0);
      const paymentAmount = parseFloat(tx.amount);
      const needsFeeUpdate = currentFee !== ZAPPER_DEFAULT_FEE_INCL_VAT;
      const hasFeeBreakdown = metadata.feeBreakdown && metadata.feeBreakdown.feeInclVat;
      const hasZapperFloat = metadata.zapperFloatAccount === ZAPPER_FLOAT_ACCOUNT_NUMBER;

      // Check if TaxTransaction exists (only if table exists)
      let taxTx = null;
      try {
        taxTx = await TaxTransaction.findOne({
          where: { originalTransactionId: tx.transactionId }
        });
      } catch (taxTableError) {
        if (taxTableError.message && taxTableError.message.includes('does not exist')) {
          console.log(`   ⚠️  TaxTransaction table doesn't exist yet - will skip tax record creation`);
        } else {
          throw taxTableError;
        }
      }

      if (needsFeeUpdate || !hasFeeBreakdown || !hasZapperFloat || !taxTx) {
        console.log(`   🔧 Needs correction:`);
        if (needsFeeUpdate) console.log(`      - Fee is R${currentFee.toFixed(2)}, should be R${ZAPPER_DEFAULT_FEE_INCL_VAT.toFixed(2)}`);
        if (!hasFeeBreakdown) console.log(`      - Missing fee breakdown in metadata`);
        if (!hasZapperFloat) console.log(`      - Missing Zapper float account reference`);
        if (!taxTx) console.log(`      - Missing TaxTransaction record`);

        // Calculate correct fee breakdown
        const feeBreakdown = calculateZapperFeeBreakdown(ZAPPER_DEFAULT_FEE_INCL_VAT);
        const totalDebitAmount = Number((paymentAmount + ZAPPER_DEFAULT_FEE_INCL_VAT).toFixed(2));

        // Update transaction
        await tx.update({
          fee: ZAPPER_DEFAULT_FEE_INCL_VAT,
          metadata: {
            ...metadata,
            feeBreakdown: {
              feeInclVat: feeBreakdown.feeInclVat,
              vatAmount: feeBreakdown.vatAmount,
              netFeeAmount: feeBreakdown.netFeeAmount,
              vatRate: VAT_RATE
            },
            zapperFloatAccount: ZAPPER_FLOAT_ACCOUNT_NUMBER,
            totalDebitAmount: totalDebitAmount,
            correctedAt: new Date().toISOString(),
            correctionReason: 'Fee structure update - added R3.00 fee incl VAT'
          }
        });

        console.log(`   ✅ Updated transaction with fee: R${ZAPPER_DEFAULT_FEE_INCL_VAT.toFixed(2)}`);

        // Credit Zapper float account (if not already credited)
        if (!hasZapperFloat) {
          await zapperFloat.increment('currentBalance', { by: paymentAmount });
          totalFloatCredit += paymentAmount;
          console.log(`   ✅ Credited Zapper float: R${paymentAmount.toFixed(2)}`);
        }

        // Create TaxTransaction if missing (only if table exists)
        if (!taxTx) {
          const merchantName = metadata.merchantName || 'Unknown Merchant';
          try {
            await allocateZapperFeeAndVat({
              feeInclVat: ZAPPER_DEFAULT_FEE_INCL_VAT,
              walletTransactionId: tx.transactionId,
              idempotencyKey: `ZAPPER-${tx.transactionId}`,
              userId: tx.userId,
              paymentAmount: paymentAmount,
              merchantName: merchantName
            });
          } catch (taxError) {
            if (taxError.message && taxError.message.includes('does not exist')) {
              console.log(`   ⚠️  Skipped TaxTransaction creation (table doesn't exist)`);
            } else {
              throw taxError;
            }
          }
        }

        totalFeeAmount += ZAPPER_DEFAULT_FEE_INCL_VAT;
        correctedCount++;
      } else {
        console.log(`   ✅ Transaction is correct`);
        alreadyCorrectCount++;
        totalFeeAmount += currentFee;
      }
    }

    // Reload float account to get updated balance
    await zapperFloat.reload();

    console.log(`\n\n📊 Summary:`);
    console.log(`   Total transactions: ${qrTransactions.length}`);
    console.log(`   Already correct: ${alreadyCorrectCount}`);
    console.log(`   Corrected: ${correctedCount}`);
    console.log(`   Total float credited: R${totalFloatCredit.toFixed(2)}`);
    console.log(`   Total fees: R${totalFeeAmount.toFixed(2)}`);
    console.log(`   Zapper float balance: R${zapperFloat.currentBalance.toFixed(2)}`);
    console.log(`\n✅ Audit and update completed!`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  auditAndUpdateZapperTransactions()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = auditAndUpdateZapperTransactions;

