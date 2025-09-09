const { Bill, Payment } = require('../models');
const { generateTestEasyPayNumber } = require('../utils/easyPayUtils');

/**
 * Seed EasyPay dummy data for testing
 * This script creates test bills and payments to simulate EasyPay transactions
 */

async function seedEasyPayData() {
  try {
    console.log('🌱 Seeding EasyPay dummy data...');

    // Clear existing data
    await Payment.destroy({ where: {} });
    await Bill.destroy({ where: {} });

    // Create test bills
    const testBills = [
      {
        easyPayNumber: generateTestEasyPayNumber('1234', '10000001'),
        accountNumber: '10000001',
        customerName: 'John Smith',
        amount: 15000, // R150.00
        minAmount: 15000,
        maxAmount: 15000,
        dueDate: '2025-09-15',
        status: 'pending',
        billType: 'electricity',
        description: 'Eskom electricity bill - August 2025',
        receiverId: '1234'
      },
      {
        easyPayNumber: generateTestEasyPayNumber('1234', '10000002'),
        accountNumber: '10000002',
        customerName: 'Jane Doe',
        amount: 25000, // R250.00
        minAmount: 20000,
        maxAmount: 30000,
        dueDate: '2025-09-20',
        status: 'pending',
        billType: 'water',
        description: 'City of Johannesburg water bill - August 2025',
        receiverId: '1234'
      },
      {
        easyPayNumber: generateTestEasyPayNumber('1234', '10000003'),
        accountNumber: '10000003',
        customerName: 'Mike Johnson',
        amount: 8500, // R85.00
        minAmount: 8500,
        maxAmount: 8500,
        dueDate: '2025-09-10',
        status: 'paid',
        billType: 'internet',
        description: 'Telkom internet bill - August 2025',
        receiverId: '1234',
        paidAmount: 8500,
        paidAt: new Date('2025-08-25T10:30:00Z')
      },
      {
        easyPayNumber: generateTestEasyPayNumber('1234', '10000004'),
        accountNumber: '10000004',
        customerName: 'Sarah Wilson',
        amount: 12000, // R120.00
        minAmount: 12000,
        maxAmount: 12000,
        dueDate: '2025-08-30',
        status: 'expired',
        billType: 'gas',
        description: 'Egoli Gas bill - July 2025',
        receiverId: '1234'
      },
      {
        easyPayNumber: generateTestEasyPayNumber('1234', '10000005'),
        accountNumber: '10000005',
        customerName: 'David Brown',
        amount: 45000, // R450.00
        minAmount: 40000,
        maxAmount: 50000,
        dueDate: '2025-09-25',
        status: 'processing',
        billType: 'rates',
        description: 'City of Johannesburg rates bill - August 2025',
        receiverId: '1234'
      }
    ];

    // Insert bills
    const createdBills = await Bill.bulkCreate(testBills);
    console.log(`✅ Created ${createdBills.length} test bills`);

    // Create test payments
    const testPayments = [
      {
        reference: 'PAY-20250814-001',
        easyPayNumber: createdBills[2].easyPayNumber, // Paid bill
        accountNumber: '10000003',
        amount: 8500,
        paymentType: 'bill_payment',
        paymentMethod: 'easypay',
        status: 'completed',
        echoData: '000000000000003|00000001|20250814|103000|6|' + createdBills[2].easyPayNumber,
        paymentDate: new Date('2025-08-25T10:30:00Z'),
        merchantId: '006008800085122',
        terminalId: '01180024',
        transactionId: 'TXN-20250825-103000-001',
        billId: createdBills[2].id,
        responseCode: '0',
        responseMessage: 'Payment successful'
      },
      {
        reference: 'PAY-20250814-002',
        easyPayNumber: createdBills[4].easyPayNumber, // Processing bill
        accountNumber: '10000005',
        amount: 45000,
        paymentType: 'bill_payment',
        paymentMethod: 'easypay',
        status: 'processing',
        echoData: '000000000000005|00000001|20250814|143000|6|' + createdBills[4].easyPayNumber,
        merchantId: '006008800085123',
        terminalId: '01180025',
        billId: createdBills[4].id,
        responseCode: '0',
        responseMessage: 'Payment authorized'
      },
      {
        reference: 'PAY-20250814-003',
        easyPayNumber: generateTestEasyPayNumber('1234', '10000006'),
        accountNumber: '10000006',
        amount: 30000,
        paymentType: 'bill_payment',
        paymentMethod: 'easypay',
        status: 'failed',
        echoData: '000000000000006|00000001|20250814|160000|6|' + generateTestEasyPayNumber('1234', '10000006'),
        merchantId: '006008800085124',
        terminalId: '01180026',
        errorMessage: 'Insufficient funds',
        responseCode: '2',
        responseMessage: 'Payment failed - insufficient funds'
      }
    ];

    // Insert payments
    const createdPayments = await Payment.bulkCreate(testPayments);
    console.log(`✅ Created ${createdPayments.length} test payments`);

    // Update bill status for processing payment
    await createdBills[4].update({ status: 'processing' });

    console.log('🎉 EasyPay dummy data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Bills created: ${createdBills.length}`);
    console.log(`- Payments created: ${createdPayments.length}`);
    console.log('\n🧪 Test EasyPay Numbers:');
    createdBills.forEach((bill, index) => {
      console.log(`${index + 1}. ${bill.easyPayNumber} - ${bill.customerName} - R${(bill.amount / 100).toFixed(2)}`);
    });

  } catch (error) {
    console.error('❌ Error seeding EasyPay data:', error);
    throw error;
  }
}

// Run the seeding function if this script is executed directly
if (require.main === module) {
  seedEasyPayData()
    .then(() => {
      console.log('✅ EasyPay data seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ EasyPay data seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedEasyPayData };
