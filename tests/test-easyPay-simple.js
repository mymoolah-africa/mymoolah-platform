const Bill = require('./models/Bill');

async function testBill() {
  console.log('Testing Bill model...');
  
  try {
    // Test creating a single bill
    const testBill = {
      easyPayNumber: '9202100000000000001',
      accountNumber: '0000000000001',
      receiverId: '2021',
      customerName: 'John Doe',
      billType: 'electricity',
      description: 'Monthly electricity bill',
      amount: 15000, // R150.00
      minAmount: 14000, // R140.00
      maxAmount: 16000, // R160.00
      dueDate: '2025-02-15'
    };

    console.log('Creating test bill...');
    const result = await Bill.create(testBill);
    console.log('✅ Bill created:', result);

    // Get all bills
    console.log('Getting all bills...');
    const bills = await Bill.findAll();
    console.log('✅ All bills:', bills);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBill();
