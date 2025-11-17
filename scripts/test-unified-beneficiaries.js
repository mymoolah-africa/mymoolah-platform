#!/usr/bin/env node
/**
 * Test script for Unified Beneficiary System
 * 
 * This script tests:
 * 1. Migration status (checks if new tables exist)
 * 2. API endpoints for unified beneficiaries
 * 3. Multiple accounts per beneficiary functionality
 * 
 * Usage:
 *   node scripts/test-unified-beneficiaries.js [userId]
 * 
 * If userId is not provided, uses user ID 1 (André)
 */

require('dotenv').config();
const { sequelize, Beneficiary, BeneficiaryPaymentMethod, BeneficiaryServiceAccount, User } = require('../models');
const UnifiedBeneficiaryService = require('../services/UnifiedBeneficiaryService');

const service = new UnifiedBeneficiaryService();

async function checkMigrationStatus() {
  console.log('\n📋 Checking Migration Status...\n');
  
  try {
    // Check if beneficiary_payment_methods table exists
    const paymentMethodsTable = await sequelize.getQueryInterface().showAllTables();
    const hasPaymentMethods = paymentMethodsTable.includes('beneficiary_payment_methods');
    const hasServiceAccounts = paymentMethodsTable.includes('beneficiary_service_accounts');
    
    console.log(`✅ beneficiary_payment_methods table: ${hasPaymentMethods ? 'EXISTS' : 'MISSING'}`);
    console.log(`✅ beneficiary_service_accounts table: ${hasServiceAccounts ? 'EXISTS' : 'MISSING'}`);
    
    if (!hasPaymentMethods || !hasServiceAccounts) {
      console.log('\n⚠️  Migration not run yet. Run: npx sequelize-cli db:migrate --url "$DATABASE_URL"');
      return false;
    }
    
    // Check table structure
    const paymentMethodsColumns = await sequelize.getQueryInterface().describeTable('beneficiary_payment_methods');
    const serviceAccountsColumns = await sequelize.getQueryInterface().describeTable('beneficiary_service_accounts');
    
    console.log(`\n📊 beneficiary_payment_methods columns: ${Object.keys(paymentMethodsColumns).length}`);
    console.log(`📊 beneficiary_service_accounts columns: ${Object.keys(serviceAccountsColumns).length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    return false;
  }
}

async function testCreateBeneficiaryWithMultipleAccounts(userId) {
  console.log('\n🧪 Test 1: Create Beneficiary with Multiple Accounts\n');
  
  try {
    const testName = `Test Neil ${Date.now()}`;
    const testMsisdn = '0798622030';
    
    // 1. Create beneficiary with MyMoolah wallet
    console.log('   Creating beneficiary with MyMoolah wallet...');
    const beneficiary1 = await service.createOrUpdateBeneficiary(userId, {
      name: testName,
      msisdn: testMsisdn,
      serviceType: 'mymoolah',
      serviceData: {
        walletMsisdn: testMsisdn,
        isDefault: true
      },
      isFavorite: false,
      notes: 'Test beneficiary for unified system'
    });
    console.log(`   ✅ Beneficiary created: ID ${beneficiary1.id}, Name: ${beneficiary1.name}`);
    
    // 2. Add bank account #1
    console.log('   Adding first bank account...');
    await service.addOrUpdatePaymentMethod(userId, {
      beneficiaryId: beneficiary1.id,
      serviceType: 'bank',
      serviceData: {
        bankName: 'Standard Bank',
        accountNumber: '1234567890',
        accountType: 'savings',
        branchCode: '051001',
        isDefault: true
      }
    });
    console.log('   ✅ First bank account added');
    
    // 3. Add bank account #2
    console.log('   Adding second bank account...');
    await service.addOrUpdatePaymentMethod(userId, {
      beneficiaryId: beneficiary1.id,
      serviceType: 'bank',
      serviceData: {
        bankName: 'FNB',
        accountNumber: '9876543210',
        accountType: 'cheque',
        branchCode: '250655',
        isDefault: false
      }
    });
    console.log('   ✅ Second bank account added');
    
    // 4. Add electricity meter #1
    console.log('   Adding first electricity meter...');
    await service.addOrUpdateServiceAccount(userId, {
      beneficiaryId: beneficiary1.id,
      serviceType: 'electricity',
      serviceData: {
        meterNumber: '12345678',
        meterType: 'prepaid',
        provider: 'City Power',
        label: 'Home',
        isDefault: true
      }
    });
    console.log('   ✅ First electricity meter added');
    
    // 5. Add electricity meter #2
    console.log('   Adding second electricity meter...');
    await service.addOrUpdateServiceAccount(userId, {
      beneficiaryId: beneficiary1.id,
      serviceType: 'electricity',
      serviceData: {
        meterNumber: '87654321',
        meterType: 'prepaid',
        provider: 'Eskom',
        label: 'Office',
        isDefault: false
      }
    });
    console.log('   ✅ Second electricity meter added');
    
    // 6. Verify all accounts exist
    const paymentMethods = await BeneficiaryPaymentMethod.findAll({
      where: { beneficiaryId: beneficiary1.id }
    });
    const serviceAccounts = await BeneficiaryServiceAccount.findAll({
      where: { beneficiaryId: beneficiary1.id }
    });
    
    console.log(`\n   📊 Payment Methods: ${paymentMethods.length} (expected: 3 - 1 wallet + 2 bank)`);
    console.log(`   📊 Service Accounts: ${serviceAccounts.length} (expected: 2 - 2 electricity meters)`);
    
    if (paymentMethods.length === 3 && serviceAccounts.length === 2) {
      console.log('   ✅ All accounts created successfully');
      return beneficiary1.id;
    } else {
      throw new Error(`Expected 3 payment methods and 2 service accounts, got ${paymentMethods.length} and ${serviceAccounts.length}`);
    }
  } catch (error) {
    console.error('   ❌ Error creating beneficiary:', error.message);
    throw error;
  }
}

async function testGetBeneficiariesByService(userId) {
  console.log('\n🧪 Test 2: Get Beneficiaries by Service Type\n');
  
  try {
    // Test payment beneficiaries
    const paymentBeneficiaries = await service.getBeneficiariesByService(userId, 'payment', '');
    console.log(`   ✅ Payment beneficiaries: ${paymentBeneficiaries.length}`);
    
    // Test electricity beneficiaries
    const electricityBeneficiaries = await service.getBeneficiariesByService(userId, 'electricity', '');
    console.log(`   ✅ Electricity beneficiaries: ${electricityBeneficiaries.length}`);
    
    return true;
  } catch (error) {
    console.error('   ❌ Error getting beneficiaries:', error.message);
    throw error;
  }
}

async function testGetBeneficiaryServices(beneficiaryId) {
  console.log('\n🧪 Test 3: Get All Services for Beneficiary\n');
  
  try {
    const services = await service.getBeneficiaryServices(beneficiaryId);
    console.log(`   ✅ Beneficiary ID: ${services.id}`);
    console.log(`   ✅ Name: ${services.name}`);
    console.log(`   ✅ Payment Methods: ${services.paymentMethods ? 'Present' : 'Missing'}`);
    console.log(`   ✅ Utility Services: ${services.utilityServices ? 'Present' : 'Missing'}`);
    
    return true;
  } catch (error) {
    console.error('   ❌ Error getting beneficiary services:', error.message);
    throw error;
  }
}

async function testDefaultAccountSelection(beneficiaryId) {
  console.log('\n🧪 Test 4: Default Account Selection\n');
  
  try {
    // Get all payment methods
    const paymentMethods = await BeneficiaryPaymentMethod.findAll({
      where: { beneficiaryId, isActive: true },
      order: [['isDefault', 'DESC'], ['createdAt', 'ASC']]
    });
    
    const defaultMethod = paymentMethods.find(m => m.isDefault);
    console.log(`   ✅ Total payment methods: ${paymentMethods.length}`);
    console.log(`   ✅ Default method: ${defaultMethod ? `${defaultMethod.methodType} - ${defaultMethod.accountNumber || defaultMethod.walletMsisdn}` : 'None'}`);
    
    // Get all service accounts
    const serviceAccounts = await BeneficiaryServiceAccount.findAll({
      where: { beneficiaryId, isActive: true, serviceType: 'electricity' },
      order: [['isDefault', 'DESC'], ['createdAt', 'ASC']]
    });
    
    const defaultAccount = serviceAccounts.find(a => a.isDefault);
    console.log(`   ✅ Total electricity meters: ${serviceAccounts.length}`);
    console.log(`   ✅ Default meter: ${defaultAccount ? defaultAccount.serviceData.meterNumber : 'None'}`);
    
    return true;
  } catch (error) {
    console.error('   ❌ Error testing default selection:', error.message);
    throw error;
  }
}

async function cleanupTestData(beneficiaryId) {
  console.log('\n🧹 Cleaning up test data...\n');
  
  try {
    // Delete payment methods
    await BeneficiaryPaymentMethod.destroy({
      where: { beneficiaryId }
    });
    
    // Delete service accounts
    await BeneficiaryServiceAccount.destroy({
      where: { beneficiaryId }
    });
    
    // Delete beneficiary
    await Beneficiary.destroy({
      where: { id: beneficiaryId }
    });
    
    console.log('   ✅ Test data cleaned up');
  } catch (error) {
    console.error('   ⚠️  Error cleaning up:', error.message);
  }
}

async function main() {
  const userId = parseInt(process.argv[2]) || 1;
  
  console.log('🚀 Unified Beneficiary System Test Suite\n');
  console.log(`👤 Testing with User ID: ${userId}\n`);
  
  try {
    // Check migration status
    const migrationOk = await checkMigrationStatus();
    if (!migrationOk) {
      console.log('\n❌ Migration check failed. Please run migrations first.');
      process.exit(1);
    }
    
    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      console.log(`\n❌ User ID ${userId} not found`);
      process.exit(1);
    }
    console.log(`\n✅ User found: ${user.name || user.phoneNumber}\n`);
    
    // Run tests
    const beneficiaryId = await testCreateBeneficiaryWithMultipleAccounts(userId);
    await testGetBeneficiariesByService(userId);
    await testGetBeneficiaryServices(beneficiaryId);
    await testDefaultAccountSelection(beneficiaryId);
    
    // Ask if user wants to keep test data
    console.log('\n✅ All tests passed!\n');
    console.log(`📝 Test beneficiary ID: ${beneficiaryId}`);
    console.log('💡 To keep test data, do not run cleanup. To remove, uncomment cleanup in script.');
    
    // Uncomment to auto-cleanup:
    // await cleanupTestData(beneficiaryId);
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();

