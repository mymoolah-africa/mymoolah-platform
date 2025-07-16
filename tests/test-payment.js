const Bill = require('./models/Bill');
const Payment = require('./models/Payment');

async function testPayment() {
  try {
    console.log('🔍 Testing payment creation...');
    
    // Test data
    const paymentData = {
      easyPayNumber: '9202100000000000001',
      accountNumber: '0000000000001',
      amount: 15000,
      merchantId: 'M001',
      terminalId: 'T001',
      paymentDate: new Date().toISOString(),
      reference: 'REF123',
      echoData: 'test data',
      billId: 1,
      status: 'completed'
    };

    console.log('📋 Payment data:', paymentData);
    
    // Try to create payment
    const payment = await Payment.create(paymentData);
    console.log('✅ Payment created successfully:', payment);
    
  } catch (error) {
    console.error('❌ Error creating payment:', error);
    console.error('❌ Error stack:', error.stack);
  }
}

testPayment();
