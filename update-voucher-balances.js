const { Voucher, User } = require('./models');

async function updateVoucherBalances() {
  try {
    console.log('🔄 Updating voucher balances for user 0825571055...');

    // Find the user by phone number
    const user = await User.findOne({ 
      where: { phoneNumber: '+27825571055' } 
    });

    if (!user) {
      console.error('❌ User with phone number +27825571055 not found');
      return;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);

    // Get all active vouchers for the user
    const activeVouchers = await Voucher.findAll({
      where: { 
        userId: user.id,
        status: 'active'
      }
    });

    console.log(`📋 Found ${activeVouchers.length} active vouchers to update`);

    // Update existing vouchers with realistic balances
    const balanceUpdates = [
      // Fully unredeemed vouchers
      { id: activeVouchers[0]?.id, balance: 500.00, redemptionCount: 0 },
      { id: activeVouchers[1]?.id, balance: 1000.00, redemptionCount: 0 },
      { id: activeVouchers[2]?.id, balance: 750.00, redemptionCount: 0 },
      { id: activeVouchers[3]?.id, balance: 1500.00, redemptionCount: 0 },
      
      // Partially redeemed vouchers
      { id: activeVouchers[4]?.id, balance: 250.00, redemptionCount: 1 }, // R500 original, R250 redeemed
      { id: activeVouchers[5]?.id, balance: 400.00, redemptionCount: 1 }, // R1000 original, R600 redeemed
      { id: activeVouchers[6]?.id, balance: 375.00, redemptionCount: 1 }, // R750 original, R375 redeemed
      { id: activeVouchers[7]?.id, balance: 900.00, redemptionCount: 1 }, // R1500 original, R600 redeemed
    ];

    // Update existing vouchers
    for (const update of balanceUpdates) {
      if (update.id) {
        await Voucher.update(
          { 
            balance: update.balance,
            redemptionCount: update.redemptionCount
          },
          { where: { id: update.id } }
        );
        console.log(`✅ Updated voucher ${update.id}: R${update.balance} balance (${update.redemptionCount} redemptions)`);
      }
    }

    // Create new vouchers with different redemption scenarios
    const newVouchers = [
      // Fully unredeemed vouchers
      {
        userId: user.id,
        voucherCode: `VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 800.00,
        balance: 800.00,
        status: 'active',
        voucherType: 'premium',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        brandLocked: true,
        lockedToId: 'Pick n Pay',
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        redemptionCount: 0,
        maxRedemptions: 3,
        config: JSON.stringify({ type: 'premium', brand: 'Pick n Pay' }),
        metadata: JSON.stringify({ createdBy: 'balance-update-script', purpose: 'testing' })
      },
      {
        userId: user.id,
        voucherCode: `VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 1200.00,
        balance: 1200.00,
        status: 'active',
        voucherType: 'business',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        brandLocked: true,
        lockedToId: 'Clicks',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        redemptionCount: 0,
        maxRedemptions: 4,
        config: JSON.stringify({ type: 'business', brand: 'Clicks' }),
        metadata: JSON.stringify({ createdBy: 'balance-update-script', purpose: 'testing' })
      },
      
      // Partially redeemed vouchers
      {
        userId: user.id,
        voucherCode: `VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 600.00,
        balance: 300.00, // 50% redeemed
        status: 'active',
        voucherType: 'standard',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        brandLocked: false,
        lockedToId: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        redemptionCount: 1,
        maxRedemptions: 2,
        config: JSON.stringify({ type: 'standard', brand: 'general' }),
        metadata: JSON.stringify({ createdBy: 'balance-update-script', purpose: 'testing' })
      },
      {
        userId: user.id,
        voucherCode: `VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 900.00,
        balance: 450.00, // 50% redeemed
        status: 'active',
        voucherType: 'premium',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        brandLocked: true,
        lockedToId: 'Dis-Chem',
        expiresAt: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
        redemptionCount: 1,
        maxRedemptions: 3,
        config: JSON.stringify({ type: 'premium', brand: 'Dis-Chem' }),
        metadata: JSON.stringify({ createdBy: 'balance-update-script', purpose: 'testing' })
      },
      {
        userId: user.id,
        voucherCode: `VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 1800.00,
        balance: 600.00, // 67% redeemed
        status: 'active',
        voucherType: 'premium',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        brandLocked: true,
        lockedToId: 'Game',
        expiresAt: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
        redemptionCount: 2,
        maxRedemptions: 5,
        config: JSON.stringify({ type: 'premium', brand: 'Game' }),
        metadata: JSON.stringify({ createdBy: 'balance-update-script', purpose: 'testing' })
      }
    ];

    // Create new vouchers
    console.log('\n📦 Creating new vouchers with realistic balances...');
    const createdVouchers = await Voucher.bulkCreate(newVouchers);

    console.log(`\n✅ Successfully created ${createdVouchers.length} new vouchers:`);
    createdVouchers.forEach((voucher, index) => {
      const redemptionStatus = voucher.redemptionCount === 0 ? '🟢 Unredeemed' : '🟡 Partially Redeemed';
      const percentageUsed = ((voucher.originalAmount - voucher.balance) / voucher.originalAmount * 100).toFixed(0);
      console.log(`${index + 1}. ${redemptionStatus} R${voucher.originalAmount} → R${voucher.balance} (${percentageUsed}% used) - ${voucher.voucherType}`);
    });

    // Get updated voucher summary
    const updatedVouchers = await Voucher.findAll({
      where: { 
        userId: user.id,
        status: 'active'
      },
      order: [['createdAt', 'DESC']]
    });

    console.log('\n📊 Updated Voucher Summary:');
    console.log(`Total Active Vouchers: ${updatedVouchers.length}`);
    
    const totalOriginalValue = updatedVouchers.reduce((sum, v) => sum + parseFloat(v.originalAmount), 0);
    const totalRemainingBalance = updatedVouchers.reduce((sum, v) => sum + parseFloat(v.balance), 0);
    const totalRedeemed = totalOriginalValue - totalRemainingBalance;
    
    console.log(`Total Original Value: R${totalOriginalValue.toFixed(2)}`);
    console.log(`Total Remaining Balance: R${totalRemainingBalance.toFixed(2)}`);
    console.log(`Total Redeemed: R${totalRedeemed.toFixed(2)}`);
    console.log(`Redemption Rate: ${((totalRedeemed / totalOriginalValue) * 100).toFixed(1)}%`);

    console.log('\n🎉 Voucher balances updated successfully!');
    console.log('📱 User now has realistic voucher balances for testing.');

  } catch (error) {
    console.error('❌ Error updating voucher balances:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
updateVoucherBalances(); 