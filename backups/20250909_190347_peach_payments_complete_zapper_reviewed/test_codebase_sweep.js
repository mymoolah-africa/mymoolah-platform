#!/usr/bin/env node

/**
 * 🧪 Test Script for MyMoolah Codebase Sweep System
 * Demonstrates the automatic discovery of support capabilities
 */

require('dotenv').config();
const CodebaseSweepService = require('./services/codebaseSweepService');

async function testCodebaseSweep() {
  console.log('🧪 Testing MyMoolah Codebase Sweep System...\n');
  
  try {
    // Initialize the sweep service
    const sweepService = new CodebaseSweepService();
    
    console.log('🚀 Starting comprehensive codebase sweep...\n');
    
    // Perform the sweep
    const results = await sweepService.performSweep();
    
    console.log('✅ Sweep completed successfully!\n');
    console.log('📊 Results Summary:');
    console.log('==================');
    console.log(`📁 Total Files Analyzed: ${results.codeStructure?.totalFiles || 'N/A'}`);
    console.log(`🔌 API Endpoints Discovered: ${results.apiEndpoints?.length || 0}`);
    console.log(`🗄️ Database Models Found: ${results.databaseModels?.length || 0}`);
    console.log(`📚 Documentation Files: ${results.documentation?.length || 0}`);
    console.log(`❓ Support Questions Generated: ${results.totalSupportQuestions || 0}`);
    console.log(`🕐 Sweep Timestamp: ${results.sweepTimestamp || 'N/A'}`);
    
    if (results.categories) {
      console.log('\n📋 Support Question Categories:');
      console.log('==============================');
      Object.entries(results.categories).forEach(([category, questions]) => {
        console.log(`\n${category.toUpperCase()}:`);
        if (Array.isArray(questions)) {
          questions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
        } else {
          console.log(`  ${questions}`);
        }
      });
    }
    
    // Test the scheduler
    console.log('\n🔄 Testing scheduler (will run for 5 seconds)...');
    await sweepService.startScheduler();
    
    // Wait a bit to see the scheduler in action
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n💡 The codebase sweep system is now:');
    console.log('   - Discovering all possible support questions');
    console.log('   - Running daily to stay up-to-date');
    console.log('   - Automatically updating AI knowledge base');
    console.log('   - Saving results for persistence');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCodebaseSweep().catch(console.error);
}

module.exports = { testCodebaseSweep };
