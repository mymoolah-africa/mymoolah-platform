const { Voucher, VoucherType, EasyPayVoucher, User } = require('./models');

async function createDummyVouchers() {
  try {
    console.log('🔄 Creating 7 dummy vouchers for user 0825571055...');

    // Find the user by phone number
    const user = await User.findOne({ 
      where: { phoneNumber: '+27825571055' } 
    });

    if (!user) {
      console.error('❌ User with phone number +27825571055 not found');
      return;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);

    // First, let's check what voucher types exist
    const voucherTypes = await VoucherType.findAll();
    console.log(`📋 Available voucher types: ${voucherTypes.length}`);
    voucherTypes.forEach(vt => {
      console.log(`  - ${vt.typeName}: ${vt.displayName}`);
    });

    // Create 5 regular vouchers
    const regularVouchers = [
      {
        userId: user.id,
        voucherCode: `VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 500.00,
        balance: 500.00,
        status: 'active',
        voucherType: 'standard',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        brandLocked: false,
        lockedToId: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        redemptionCount: 0,
        maxRedemptions: 1,
        config: JSON.stringify({ type: 'standard', brand: 'general' }),
        metadata: JSON.stringify({ createdBy: 'dummy-script', purpose: 'testing' })
      },
      {
        userId: user.id,
        voucherCode: `VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 1000.00,
        balance: 750.00,
        status: 'active',
        voucherType: 'premium',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        brandLocked: true,
        lockedToId: 'Woolworths',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        redemptionCount: 1,
        maxRedemptions: 3,
        config: JSON.stringify({ type: 'premium', brand: 'Woolworths' }),
        metadata: JSON.stringify({ createdBy: 'dummy-script', purpose: 'testing' })
      },
      {
        userId: user.id,
        voucherCode: `VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 250.00,
        balance: 0.00,
        status: 'redeemed',
        voucherType: 'standard',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        brandLocked: false,
        lockedToId: null,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        redemptionCount: 1,
        maxRedemptions: 1,
        config: JSON.stringify({ type: 'standard', brand: 'general' }),
        metadata: JSON.stringify({ createdBy: 'dummy-script', purpose: 'testing' })
      },
      {
        userId: user.id,
        voucherCode: `VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 750.00,
        balance: 750.00,
        status: 'active',
        voucherType: 'business',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        brandLocked: true,
        lockedToId: 'Starbucks',
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        redemptionCount: 0,
        maxRedemptions: 2,
        config: JSON.stringify({ type: 'business', brand: 'Starbucks' }),
        metadata: JSON.stringify({ createdBy: 'dummy-script', purpose: 'testing' })
      },
      {
        userId: user.id,
        voucherCode: `VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 1500.00,
        balance: 1500.00,
        status: 'active',
        voucherType: 'premium',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        brandLocked: true,
        lockedToId: 'Checkers',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        redemptionCount: 0,
        maxRedemptions: 5,
        config: JSON.stringify({ type: 'premium', brand: 'Checkers' }),
        metadata: JSON.stringify({ createdBy: 'dummy-script', purpose: 'testing' })
      }
    ];

    // Create 2 EasyPay vouchers
    const easyPayVouchers = [
      {
        userId: user.id,
        easypayCode: `EASY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        mmVoucherCode: `MM-VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 300.00,
        status: 'settled',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        settlementAmount: 300.00,
        settlementMerchant: 'EasyPay',
        settlementTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        callbackReceived: true,
        smsSent: true,
        smsTimestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        callbackData: JSON.stringify({ status: 'settled', merchant: 'EasyPay' }),
        metadata: JSON.stringify({ 
          createdBy: 'dummy-script', 
          purpose: 'testing',
          easypayReference: `EP-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        })
      },
      {
        userId: user.id,
        easypayCode: `EASY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        mmVoucherCode: `MM-VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        originalAmount: 500.00,
        status: 'pending',
        issuedTo: user.phoneNumber,
        issuedBy: 'system',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        settlementAmount: 500.00,
        settlementMerchant: null,
        settlementTimestamp: null,
        callbackReceived: false,
        smsSent: true,
        smsTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        callbackData: null,
        metadata: JSON.stringify({ 
          createdBy: 'dummy-script', 
          purpose: 'testing',
          easypayReference: `EP-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        })
      }
    ];

    // Create regular vouchers
    console.log('\n📦 Creating 5 regular vouchers...');
    const createdRegularVouchers = await Voucher.bulkCreate(regularVouchers);

    // Create EasyPay vouchers
    console.log('📱 Creating 2 EasyPay vouchers...');
    const createdEasyPayVouchers = await EasyPayVoucher.bulkCreate(easyPayVouchers);

    console.log(`\n✅ Successfully created ${createdRegularVouchers.length} regular vouchers:`);
    createdRegularVouchers.forEach((voucher, index) => {
      const status = voucher.status === 'active' ? '🟢' : '🔴';
      console.log(`${index + 1}. ${status} R${voucher.originalAmount} - ${voucher.voucherType} (${voucher.status})`);
    });

    console.log(`\n✅ Successfully created ${createdEasyPayVouchers.length} EasyPay vouchers:`);
    createdEasyPayVouchers.forEach((voucher, index) => {
      const status = voucher.status === 'settled' ? '🟢' : '🟡';
      console.log(`${index + 1}. ${status} R${voucher.originalAmount} - EasyPay (${voucher.status})`);
    });

    console.log('\n🎉 All dummy vouchers created successfully!');
    console.log('📊 User now has realistic voucher collection for testing.');

  } catch (error) {
    console.error('❌ Error creating dummy vouchers:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createDummyVouchers(); 