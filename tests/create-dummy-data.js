const db = require('../models');
const bcrypt = require('bcrypt');

async function createDummyData() {
  console.log('🎭 Creating Comprehensive Dummy Data');
  try {
    // Check if data already exists
    const existingUsers = await db.User.findAll();
    const existingTransactions = await db.Transaction.findAll();
    const existingVouchers = await db.Voucher.findAll();
    
    if (existingUsers.length > 0) {
      console.log('📊 Database already contains data:');
      console.log(`- ${existingUsers.length} users`);
      console.log(`- ${existingTransactions.length} transactions`);
      console.log(`- ${existingVouchers.length} vouchers`);
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        rl.question('Do you want to clear existing data and recreate? (y/N): ', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('✅ Keeping existing data. Database is ready for testing.');
        return;
      }
      
      // Clear existing data in reverse order (children first)
      console.log('🗑️ Clearing existing data...');
      await db.Transaction.destroy({ where: {} });
      await db.Voucher.destroy({ where: {} });
      await db.Wallet.destroy({ where: {} });
      await db.Bill.destroy({ where: {} });
      await db.Notification.destroy({ where: {} });
      await db.VoucherType.destroy({ where: {} });
      await db.User.destroy({ where: {} });
      console.log('✅ Existing data cleared.');
    }

    const users = [];
    const userData = [
      {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '0821234567',
        accountNumber: 'ACC001234567',
        balance: 5000.00,
        status: 'active',
        kycStatus: 'verified'
      },
      {
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '0832345678',
        accountNumber: 'ACC002345678',
        balance: 7500.00,
        status: 'active',
        kycStatus: 'verified'
      },
      {
        email: 'mike.wilson@example.com',
        firstName: 'Mike',
        lastName: 'Wilson',
        phoneNumber: '0843456789',
        accountNumber: 'ACC003456789',
        balance: 3200.00,
        status: 'active',
        kycStatus: 'verified'
      },
      {
        email: 'sarah.jones@example.com',
        firstName: 'Sarah',
        lastName: 'Jones',
        phoneNumber: '0854567890',
        accountNumber: 'ACC004567890',
        balance: 8900.00,
        status: 'active',
        kycStatus: 'verified'
      },
      {
        email: 'david.brown@example.com',
        firstName: 'David',
        lastName: 'Brown',
        phoneNumber: '0865678901',
        accountNumber: 'ACC005678901',
        balance: 4200.00,
        status: 'active',
        kycStatus: 'verified'
      }
    ];

    for (const userInfo of userData) {
      const passwordHash = await bcrypt.hash('password123', 12);
      const user = await db.User.create({
        ...userInfo,
        password_hash: passwordHash,
        kycVerifiedAt: new Date(),
        kycVerifiedBy: 'system'
      });
      users.push(user);
      console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.email})`);
    }

    const wallets = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const wallet = await db.Wallet.create({
        userId: user.id,
        walletId: `WAL-${user.accountNumber}`,
        balance: user.balance,
        currency: 'ZAR',
        status: 'active',
        kycVerified: true,
        kycVerifiedAt: new Date(),
        dailyLimit: 100000.00,
        monthlyLimit: 1000000.00,
        dailySpent: 0.00,
        monthlySpent: 0.00
      });
      wallets.push(wallet);
      console.log(`✅ Created wallet for ${user.firstName}: ${wallet.walletId}`);
    }

    const voucherTypes = [];
    const voucherTypeData = [
      {
        typeName: 'standard',
        displayName: 'Standard Voucher',
        description: 'Basic voucher for general use',
        pricingModel: 'fixed',
        baseRate: 0.00,
        minAmount: 10.00,
        maxAmount: 1000.00,
        isActive: true
      },
      {
        typeName: 'premium',
        displayName: 'Premium Voucher',
        description: 'Premium voucher with enhanced features',
        pricingModel: 'percentage',
        baseRate: 2.50,
        minAmount: 50.00,
        maxAmount: 2000.00,
        isActive: true
      },
      {
        typeName: 'corporate',
        displayName: 'Corporate Voucher',
        description: 'Voucher for corporate clients',
        pricingModel: 'tiered_rate',
        baseRate: 1.50,
        minAmount: 100.00,
        maxAmount: 5000.00,
        isActive: true
      },
      {
        typeName: 'student',
        displayName: 'Student Voucher',
        description: 'Discounted voucher for students',
        pricingModel: 'fixed',
        baseRate: 0.00,
        minAmount: 5.00,
        maxAmount: 500.00,
        isActive: true
      },
      {
        typeName: 'senior',
        displayName: 'Senior Voucher',
        description: 'Special voucher for senior citizens',
        pricingModel: 'percentage',
        baseRate: 1.00,
        minAmount: 20.00,
        maxAmount: 1000.00,
        isActive: true
      },
      {
        typeName: 'promotional',
        displayName: 'Promotional Voucher',
        description: 'Limited time promotional voucher',
        pricingModel: 'fixed',
        baseRate: 0.00,
        minAmount: 10.00,
        maxAmount: 2000.00,
        isActive: true
      }
    ];

    for (const voucherTypeInfo of voucherTypeData) {
      const voucherType = await db.VoucherType.create(voucherTypeInfo);
      voucherTypes.push(voucherType);
      console.log(`✅ Created voucher type: ${voucherType.displayName}`);
    }

    const transactionTypes = ['send', 'receive', 'payment', 'withdrawal', 'deposit', 'transfer'];
    const transactionStatuses = ['completed', 'pending', 'failed'];

    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const user = users[userIndex];
      const wallet = wallets[userIndex];
      
      for (let i = 0; i < 6; i++) {
        const amount = Math.floor(Math.random() * 1000) + 50;
        const transaction = await db.Transaction.create({
          transactionId: `TXN-${user.accountNumber}-${i + 1}`,
          userId: user.id,
          walletId: wallet.walletId,
          amount: amount,
          type: transactionTypes[i],
          status: transactionStatuses[Math.floor(Math.random() * transactionStatuses.length)],
          description: `${transactionTypes[i].charAt(0).toUpperCase() + transactionTypes[i].slice(1)} transaction #${i + 1}`,
          fee: Math.floor(amount * 0.02),
          currency: 'ZAR',
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
        console.log(`✅ Created transaction for ${user.firstName}: ${transaction.transactionId} (${amount} ZAR)`);
      }
    }

    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const user = users[userIndex];
      
      for (let i = 0; i < 6; i++) {
        const voucherType = voucherTypes[i];
        const amount = Math.floor(Math.random() * 500) + 50;
        const voucher = await db.Voucher.create({
          userId: user.id,
          voucherCode: `VOUCHER-${user.accountNumber}-${i + 1}`,
          originalAmount: amount,
          balance: amount,
          status: 'active',
          voucherType: voucherType.typeName,
          issuedTo: `${user.firstName} ${user.lastName}`,
          issuedBy: 'system',
          redemptionCount: 0,
          maxRedemptions: 1
        });
        console.log(`✅ Created voucher for ${user.firstName}: ${voucher.voucherCode} (${amount} ZAR)`);
      }
    }

    const billTypes = ['electricity', 'water', 'internet', 'phone', 'insurance'];
    for (let i = 0; i < 10; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const bill = await db.Bill.create({
        easyPayNumber: `900012341234${i + 1}`,
        accountNumber: `${user.accountNumber}-BILL-${i + 1}`,
        receiverId: `REC${i + 1}`,
        customerName: `${user.firstName} ${user.lastName}`,
        billType: billTypes[Math.floor(Math.random() * billTypes.length)],
        description: `${billTypes[Math.floor(Math.random() * billTypes.length)]} bill`,
        amount: Math.floor(Math.random() * 500) + 100,
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      });
      console.log(`✅ Created bill: ${bill.easyPayNumber} for ${user.firstName}`);
    }

    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const user = users[userIndex];
      
      for (let i = 0; i < 3; i++) {
        const notification = await db.Notification.create({
          userId: user.id,
          title: `Notification ${i + 1} for ${user.firstName}`,
          message: `This is notification ${i + 1} for ${user.firstName} ${user.lastName}`,
          type: ['info', 'success', 'warning'][Math.floor(Math.random() * 3)],
          status: 'unread',
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        });
        console.log(`✅ Created notification for ${user.firstName}`);
      }
    }

    console.log('\n🎉 Dummy Data Creation Complete!');
    console.log(`📊 Summary:`);
    console.log(`- ${users.length} users created`);
    console.log(`- ${wallets.length} wallets created`);
    console.log(`- ${voucherTypes.length} voucher types created`);
    console.log(`- ${users.length * 6} transactions created`);
    console.log(`- ${users.length * 6} vouchers created`);
    console.log(`- 10 bills created`);
    console.log(`- ${users.length * 3} notifications created`);
    
    console.log('\n🔑 Test Credentials:');
    users.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName}: ${user.phoneNumber} / password123`);
    });

  } catch (error) {
    console.error('❌ Error creating dummy data:', error);
  } finally {
    await db.sequelize.close();
  }
}

createDummyData(); 