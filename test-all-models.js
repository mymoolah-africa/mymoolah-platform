const sqlite3 = require('sqlite3').verbose();
const dbPath = require('path').join(__dirname, 'data/mymoolah.db');
const db = new sqlite3.Database(dbPath);

// Clean up test data before running tests
db.serialize(() => {
  db.run("DELETE FROM users WHERE email = 'testuser@example.com';");
  db.run("DELETE FROM wallets WHERE walletId = 'WALLET123';");
  db.run("DELETE FROM bills WHERE easyPayNumber = '9202100000000000001';");
  db.run("DELETE FROM payments WHERE reference = 'REF123456789';");
});
const User = require('./models/User');
const Wallet = require('./models/Wallet');
const Transaction = require('./models/Transaction');
const Bill = require('./models/Bill');
const Payment = require('./models/Payment');
const Kyc = require('./models/Kyc');

function testModel(name, Model) {
  try {
    const instance = new Model();
    if (instance) {
      console.log(`✅ ${name} model: OK`);
    } else {
      console.log(`❌ ${name} model: FAILED`);
    }
  } catch (err) {
    console.log(`❌ ${name} model: FAILED (${err.message})`);
  }
}

console.log('--- Model Instantiation Tests ---');
testModel('User', User);
testModel('Wallet', Wallet);
testModel('Transaction', Transaction);
testModel('Bill', Bill);
testModel('Payment', Payment);
testModel('Kyc', Kyc);

console.log('--- Basic Method Tests ---');
(async () => {
  try {
    const userModel = new User();
    const walletModel = new Wallet();
    const transactionModel = new Transaction();
    const billModel = new Bill();
    const paymentModel = new Payment();
    const kycModel = new Kyc();

    // User test
    const testUser = await userModel.createUser({
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'password123',
      phoneNumber: '+27123456789'
    });
    console.log('✅ User createUser: OK');

    // Wallet test
    const testWallet = await walletModel.createWallet(testUser.id, 'WALLET123');
    console.log('✅ Wallet createWallet: OK');

    // Transaction test
    const testTransaction = await transactionModel.createTransaction({
      senderWalletId: 'WALLET123',
      receiverWalletId: 'WALLET456',
      amount: 100,
      type: 'send',
      description: 'Test transaction',
      fee: 1,
      currency: 'ZAR'
    });
    console.log('✅ Transaction createTransaction: OK');

    // Bill test
    const testBill = await billModel.create({
      easyPayNumber: '9202100000000000001',
      accountNumber: '0000000000001',
      receiverId: '2021',
      customerName: 'Test Customer',
      billType: 'electricity',
      description: 'Test bill',
      amount: 15000,
      minAmount: 14000,
      maxAmount: 16000,
      dueDate: '2025-12-31'
    });
    console.log('✅ Bill create: OK');

    // Payment test
    const testPayment = await paymentModel.create({
      merchantId: 'MERCHANT001',
      terminalId: 'TERMINAL001',
      paymentDate: '2025-07-12',
      reference: 'REF123456789',
      easyPayNumber: '9202100000000000001',
      accountNumber: '0000000000001',
      amount: 15000,
      echoData: 'test-echo-data',
      billId: testBill.id,
      status: 'completed'
    });
    console.log('✅ Payment create: OK');

    // KYC test
    const testKyc = await kycModel.submitKyc({
      userId: testUser.id,
      documentType: 'ID',
      documentNumber: '1234567890123'
    });
    console.log('✅ KYC submitKyc: OK');

    // Clean up
    await userModel.deleteUserByEmail('testuser@example.com');
    await billModel.delete(testBill.id);

    console.log('\n🎉 All model tests completed successfully!');
  } catch (err) {
    console.error('❌ Model test failed:', err);
  }
})();