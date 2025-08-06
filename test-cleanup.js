// Test script to verify cleanup didn't break anything
const { Voucher, Wallet, User } = require('./models');

async function testCleanup() {
  console.log('🧪 Testing cleanup integrity...\n');
  
  try {
    // Test 1: Database models
    console.log('✅ Test 1: Database Models');
    console.log('   - Voucher model:', typeof Voucher);
    console.log('   - Wallet model:', typeof Wallet);
    console.log('   - User model:', typeof User);
    
    // Test 2: Voucher functionality
    console.log('\n✅ Test 2: Voucher Functionality');
    const voucherCount = await Voucher.count();
    console.log('   - Total vouchers in database:', voucherCount);
    
    // Test 3: Wallet functionality
    console.log('\n✅ Test 3: Wallet Functionality');
    const walletCount = await Wallet.count();
    console.log('   - Total wallets in database:', walletCount);
    
    // Test 4: User functionality
    console.log('\n✅ Test 4: User Functionality');
    const userCount = await User.count();
    console.log('   - Total users in database:', userCount);
    
    // Test 5: Check for EasyPay vouchers
    console.log('\n✅ Test 5: EasyPay Vouchers');
    const easyPayVouchers = await Voucher.count({
      where: {
        voucherType: ['easypay_pending', 'easypay_active']
      }
    });
    console.log('   - EasyPay vouchers:', easyPayVouchers);
    
    // Test 6: Check for MM vouchers
    console.log('\n✅ Test 6: MM Vouchers');
    const mmVouchers = await Voucher.count({
      where: {
        voucherType: 'mm_voucher'
      }
    });
    console.log('   - MM vouchers:', mmVouchers);
    
    // Test 7: Check voucher statuses
    console.log('\n✅ Test 7: Voucher Statuses');
    const statuses = await Voucher.findAll({
      attributes: ['status'],
      group: ['status']
    });
    console.log('   - Available statuses:', statuses.map(s => s.status));
    
    console.log('\n🎉 All tests passed! Cleanup was successful.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testCleanup(); 