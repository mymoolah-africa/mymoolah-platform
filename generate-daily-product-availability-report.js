#!/usr/bin/env node
/**
 * Daily Product Availability Report Generator
 * 
 * Generates a daily report of products that were unavailable from suppliers
 * and whether alternatives were used successfully.
 * 
 * Usage:
 *   node scripts/generate-daily-product-availability-report.js [date]
 * 
 * If no date is provided, generates report for yesterday.
 */

const { getUATDatabaseURL } = require('./db-connection-helper');
const productAvailabilityLogger = require('../services/productAvailabilityLogger');

async function main() {
  try {
    // Set DATABASE_URL for models
    process.env.DATABASE_URL = getUATDatabaseURL();
    
    // Load models after setting DATABASE_URL
    const models = require('../models');
    await models.sequelize.authenticate();
    console.log('✅ Database connection established');

    // Parse date argument (YYYY-MM-DD) or use yesterday
    const dateArg = process.argv[2];
    let reportDate = null;
    
    if (dateArg) {
      reportDate = new Date(dateArg);
      if (isNaN(reportDate.getTime())) {
        console.error('❌ Invalid date format. Use YYYY-MM-DD');
        process.exit(1);
      }
    } else {
      // Default to yesterday
      reportDate = new Date();
      reportDate.setDate(reportDate.getDate() - 1);
    }

    console.log(`\n📊 Generating daily product availability report for ${reportDate.toISOString().split('T')[0]}...\n`);

    // Generate report
    const report = await productAvailabilityLogger.generateDailyReport(reportDate);

    if (!report) {
      console.log('⚠️ No report generated (logging may be disabled)');
      process.exit(0);
    }

    // Display report
    console.log('='.repeat(80));
    console.log(`📋 DAILY PRODUCT AVAILABILITY REPORT - ${report.report.date}`);
    console.log('='.repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   Total Issues: ${report.report.totalIssues}`);
    console.log(`   Unique Products Affected: ${report.report.uniqueProductsCount}`);
    console.log(`   Unique Users Affected: ${report.report.uniqueUsersCount}`);
    console.log(`   Alternatives Used: ${report.report.alternativesUsed}`);
    console.log(`   Alternatives Not Used: ${report.report.alternativesNotUsed}`);

    console.log(`\n📦 By Supplier:`);
    Object.entries(report.report.bySupplier).forEach(([code, data]) => {
      console.log(`   ${code} (${data.supplierName || code}):`);
      console.log(`     - Issues: ${data.count}`);
      console.log(`     - Products Affected: ${data.products.length}`);
      if (data.products.length > 0) {
        console.log(`     - Products: ${data.products.slice(0, 5).join(', ')}${data.products.length > 5 ? ` (+${data.products.length - 5} more)` : ''}`);
      }
    });

    console.log(`\n📱 By Product Type:`);
    Object.entries(report.report.byProductType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} issues`);
    });

    console.log(`\n❌ By Error Code:`);
    Object.entries(report.report.byErrorCode).forEach(([code, data]) => {
      console.log(`   ${code}: ${data.count} occurrences`);
      console.log(`     Message: ${data.message}`);
    });

    if (report.logs.length > 0) {
      console.log(`\n📝 Recent Issues (last 10):`);
      report.logs.slice(0, 10).forEach((log, idx) => {
        console.log(`   ${idx + 1}. ${log.productName} (${log.supplierCode})`);
        console.log(`      - Type: ${log.productType}`);
        console.log(`      - Error: ${log.errorCode || 'N/A'} - ${log.errorMessage || 'No message'}`);
        console.log(`      - Alternative Used: ${log.alternativeUsed ? `Yes (${log.alternativeSupplierCode})` : 'No'}`);
        console.log(`      - Time: ${new Date(log.createdAt).toLocaleString()}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Report generation complete');
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating report:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

