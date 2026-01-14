#!/usr/bin/env node
/**
 * Generate Flash Reconciliation CSV File
 * 
 * Generates a CSV reconciliation file for Flash as per their requirements:
 * - Date
 * - Product_id
 * - Product_description
 * - Amount
 * - Partner_transaction_reference
 * - Flash_transactionID
 * - Transaction_state
 * 
 * Usage:
 *   node scripts/generate-flash-reconciliation-file.js [startDate] [endDate] [outputPath]
 * 
 * Examples:
 *   # Generate for today
 *   node scripts/generate-flash-reconciliation-file.js
 * 
 *   # Generate for specific date range
 *   node scripts/generate-flash-reconciliation-file.js 2026-01-01 2026-01-31
 * 
 *   # Generate with custom output path
 *   node scripts/generate-flash-reconciliation-file.js 2026-01-01 2026-01-31 ./flash_recon_20260131.csv
 */

require('dotenv').config();

// Set DATABASE_URL from db-connection-helper before loading models
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');
process.env.DATABASE_URL = getUATDatabaseURL();

const db = require('../models');
const FlashReconciliationFileGenerator = require('../services/reconciliation/FlashReconciliationFileGenerator');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs').promises;

const { VasTransaction, ProductVariant, Product, Supplier } = db;
const { Op } = require('sequelize');

async function generateFlashReconciliationFile() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const startDate = args[0] ? moment(args[0]).startOf('day') : moment().startOf('day');
    const endDate = args[1] ? moment(args[1]).endOf('day') : moment().endOf('day');
    const outputPath = args[2] || path.join(process.cwd(), `flash_recon_${moment().format('YYYYMMDD')}.csv`);

    console.log('🔍 Generating Flash Reconciliation File...\n');
    console.log('='.repeat(60));
    console.log(`📅 Date Range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);
    console.log(`📁 Output File: ${outputPath}\n`);

    // Find Flash supplier
    const flashSupplier = await Supplier.findOne({
      where: { 
        code: { [Op.iLike]: 'FLASH' }
      }
    });

    if (!flashSupplier) {
      console.error('❌ Flash supplier not found in database');
      process.exit(1);
    }

    console.log(`✅ Found Flash supplier: ${flashSupplier.name} (ID: ${flashSupplier.id})\n`);

    // Query Flash transactions within date range
    // Note: VasTransaction doesn't have direct ProductVariant association
    // We'll query transactions and then fetch product info separately
    const transactions = await VasTransaction.findAll({
      where: {
        supplierId: { [Op.iLike]: 'FLASH' },
        createdAt: {
          [Op.between]: [startDate.toDate(), endDate.toDate()]
        }
      },
      order: [['createdAt', 'ASC']]
    });

    console.log(`📊 Found ${transactions.length} Flash transactions in date range\n`);

    if (transactions.length === 0) {
      console.log('⚠️  No transactions found. Generating empty file with header only.');
    }

    // Fetch product variants for transactions (vasProductId references ProductVariant.id)
    const productIds = [...new Set(transactions.map(t => t.vasProductId).filter(Boolean))];
    let productVariants = [];
    let productVariantMap = new Map();
    
    if (productIds.length > 0) {
      productVariants = await ProductVariant.findAll({
        where: { id: { [Op.in]: productIds } },
        include: [
          {
            model: Product,
            as: 'product',
            required: false
          }
        ]
      });
      productVariantMap = new Map(productVariants.map(pv => [pv.id, pv]));
    }

    // Transform transactions to format expected by FlashReconciliationFileGenerator
    const formattedTransactions = transactions.map(txn => {
      // Get product info from map
      const productVariant = productVariantMap.get(txn.vasProductId);
      const product = productVariant?.product;
      
      // Get supplier reference from metadata or supplierReference field
      const supplierRef = txn.supplierReference || 
                         (txn.metadata && typeof txn.metadata === 'object' ? txn.metadata.supplierReference : null) || 
                         (txn.metadata && typeof txn.metadata === 'object' ? txn.metadata.flashTransactionId : null) ||
                         (txn.metadata && typeof txn.metadata === 'object' ? txn.metadata.transactionId : null) ||
                         '';

      return {
        transaction_id: txn.transactionId,
        reference_number: txn.transactionId, // MMTP transaction ID as partner reference
        product_id: productVariant?.supplierProductCode || txn.supplierProductId || '',
        product_name: product?.name || productVariant?.name || 'Unknown Product',
        product_variant: productVariant,
        amount: parseFloat((txn.amount / 100).toFixed(2)), // Convert cents to Rands
        supplier_reference: supplierRef, // Flash transaction ID
        supplier_transaction_id: supplierRef,
        status: txn.status || 'unknown',
        createdAt: txn.createdAt
      };
    });

    // Use settlement date (end date of range)
    const settlementDate = endDate.toDate();

    // Generate CSV file
    const generator = new FlashReconciliationFileGenerator();
    const generatedPath = await generator.generate(
      formattedTransactions,
      settlementDate,
      outputPath
    );

    console.log('='.repeat(60));
    console.log('✅ Flash reconciliation file generated successfully!');
    console.log(`📁 File: ${generatedPath}`);
    console.log(`📊 Transactions: ${transactions.length}`);
    console.log(`📅 Settlement Date: ${endDate.format('YYYY-MM-DD')}`);
    
    // Show file stats
    const stats = await fs.stat(generatedPath);
    console.log(`📦 File Size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // Show first few lines as preview
    const content = await fs.readFile(generatedPath, 'utf-8');
    const lines = content.split('\n');
    console.log('\n📋 File Preview (first 5 lines):');
    console.log('-'.repeat(60));
    lines.slice(0, 5).forEach((line, idx) => {
      console.log(`${idx + 1}. ${line}`);
    });
    if (lines.length > 5) {
      console.log(`... and ${lines.length - 5} more lines`);
    }

    console.log('\n✅ Ready to upload to Flash!');

  } catch (error) {
    console.error('❌ Error generating Flash reconciliation file:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closeAll();
  }
}

// Run generator
generateFlashReconciliationFile().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
