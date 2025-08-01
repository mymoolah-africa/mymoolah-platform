// tests/ai-models-test.js

const db = require('../models');
const bcrypt = require('bcrypt');

async function testModelCRUD() {
  console.log('🧪 MyMoolah Model CRUD Test');
  
  try {
    // Get all models
    const models = Object.keys(db);
    console.log('Models found:', models);

    // Create a valid bcrypt hash for testing
    const validPasswordHash = await bcrypt.hash('testpassword123', 12);

    // Test models in dependency order (parents first, then children)
    const testOrder = [
      'User',           // Parent for many models
      'VoucherType',    // Parent for Voucher
      'SupportTicket',  // Parent for SupportMessage
      'Bill',           // Independent
      'Wallet',         // Depends on User
      'Kyc',           // Depends on User
      'Payment',        // Depends on User/Wallet
      'Transaction',    // Depends on User/Wallet
      'EasyPayVoucher', // Independent
      'Notification',   // Depends on User
      'SupportMessage', // Depends on SupportTicket/User
      'Voucher'        // Depends on VoucherType/User
    ];

    let createdRecords = {};
    let recordsToDelete = [];
    let testCounter = 1;

    for (const modelName of testOrder) {
      console.log(`\n🔹 Testing model: ${modelName}`);
      
      try {
        const Model = db[modelName];
        
        // Prepare test data based on model dependencies
        let testData = {};
        
        switch (modelName) {
          case 'User':
            testData = {
              email: `testuser${testCounter}@example.com`,
              password_hash: validPasswordHash,
              firstName: 'Test',
              lastName: 'User',
              phoneNumber: `082123456${testCounter}`,
              accountNumber: `ACC${testCounter}123456`,
              balance: 0.00,
              status: 'active',
              kycStatus: 'not_started'
            };
            break;
            
          case 'VoucherType':
            testData = {
              typeName: `standard_${testCounter}`,
              displayName: `Standard Voucher ${testCounter}`,
              pricingModel: 'fixed_rate',
              baseRate: 1.0,
              minAmount: 5.0,
              maxAmount: 4000.0,
              isActive: true
            };
            break;
            
          case 'SupportTicket':
            testData = {
              userId: createdRecords.User ? createdRecords.User.id : 1,
              subject: `Test Support Ticket ${testCounter}`,
              status: 'open',
              priority: 'medium',
              category: 'general'
            };
            break;
            
          case 'Bill':
            testData = {
              easyPayNumber: `9000123412341${testCounter}`,
              accountNumber: `123456789${testCounter}`,
              receiverId: `202${testCounter}`,
              billType: 'utility',
              amount: 1000,
              dueDate: '2025-12-31',
              status: 'pending'
            };
            break;
            
          case 'Wallet':
            testData = {
              userId: createdRecords.User ? createdRecords.User.id : 1,
              walletId: `WAL-123456789${testCounter}`,
              balance: 0.00,
              currency: 'ZAR',
              status: 'active',
              kycVerified: false,
              dailyLimit: 100000.00,
              monthlyLimit: 1000000.00,
              dailySpent: 0.00,
              monthlySpent: 0.00
            };
            break;
            
          case 'Kyc':
            testData = {
              userId: createdRecords.User ? createdRecords.User.id : 1,
              documentType: 'id_card',
              documentNumber: `123456789012${testCounter}`,
              status: 'pending'
            };
            break;
            
          case 'Payment':
            testData = {
              userId: createdRecords.User ? createdRecords.User.id : 1,
              walletId: createdRecords.Wallet ? createdRecords.Wallet.walletId : `WAL-123456789${testCounter}`,
              amount: 1000,
              reference: `PAY-123456789${testCounter}`,
              paymentDate: new Date(),
              paymentType: 'bill_payment',
              paymentMethod: 'wallet',
              status: 'pending',
              currency: 'ZAR'
            };
            break;
            
          case 'Transaction':
            testData = {
              transactionId: `TXN-123456789${testCounter}`,
              userId: createdRecords.User ? createdRecords.User.id : 1,
              walletId: createdRecords.Wallet ? createdRecords.Wallet.walletId : `WAL-123456789${testCounter}`,
              amount: 1000,
              type: 'send',
              status: 'pending',
              currency: 'ZAR'
            };
            break;
            
          case 'EasyPayVoucher':
            testData = {
              easypayCode: `9000123412341${testCounter}`,
              mmVoucherCode: `MMVOUCHER12345${testCounter}`,
              originalAmount: 1000,
              status: 'pending',
              issuedTo: 'testuser'
            };
            break;
            
          case 'Notification':
            testData = {
              userId: createdRecords.User ? createdRecords.User.id : 1,
              title: `Test Notification ${testCounter}`,
              message: 'This is a test notification.',
              type: 'info',
              status: 'unread',
              priority: 'medium'
            };
            break;
            
          case 'SupportMessage':
            testData = {
              ticketId: createdRecords.SupportTicket ? createdRecords.SupportTicket.id : 1,
              senderId: createdRecords.User ? createdRecords.User.id : 1,
              message: `This is a test support message ${testCounter}.`,
              messageType: 'user_message',
              isInternal: false
            };
            break;
            
          case 'Voucher':
            testData = {
              userId: createdRecords.User ? createdRecords.User.id : 1,
              voucherCode: `VOUCHER12345${testCounter}`,
              originalAmount: 1000,
              balance: 1000,
              status: 'active',
              voucherType: createdRecords.VoucherType ? createdRecords.VoucherType.typeName : `standard_${testCounter}`
            };
            break;
        }

        // Create
        const created = await Model.create(testData);
        console.log(`  ✅ Create: Success ${created.id}`);
        createdRecords[modelName] = created;

        // Read
        const found = await Model.findByPk(created.id);
        if (found) {
          console.log('  ✅ Read: Success');
        } else {
          throw new Error('Read failed');
        }

        // Update with appropriate field for each model
        let updateField = {};
        switch (modelName) {
          case 'User':
            updateField = { status: 'updated' };
            break;
          case 'VoucherType':
            updateField = { isActive: false };
            break;
          case 'SupportTicket':
            updateField = { status: 'updated' };
            break;
          case 'Bill':
            updateField = { status: 'updated' };
            break;
          case 'Wallet':
            updateField = { status: 'updated' };
            break;
          case 'Kyc':
            updateField = { status: 'updated' };
            break;
          case 'Payment':
            updateField = { status: 'updated' };
            break;
          case 'Transaction':
            updateField = { status: 'updated' };
            break;
          case 'EasyPayVoucher':
            updateField = { status: 'updated' };
            break;
          case 'Notification':
            updateField = { status: 'updated' };
            break;
          case 'SupportMessage':
            updateField = { messageType: 'admin_response' };
            break;
          case 'Voucher':
            updateField = { status: 'updated' };
            break;
        }

        const updated = await Model.update(
          updateField,
          { where: { id: created.id } }
        );
        if (updated[0] > 0) {
          console.log('  ✅ Update: Success');
        } else {
          throw new Error('Update failed');
        }

        // Store for deletion later (don't delete parent records yet)
        recordsToDelete.push({ model: Model, id: created.id, name: modelName });

        testCounter++;

      } catch (error) {
        console.log(`  ❌ Error testing model ${modelName}:`, error.message);
        testCounter++;
      }
    }

    // Now delete all records in reverse order (children first, then parents)
    console.log('\n🧹 Cleaning up test records...');
    const deleteOrder = recordsToDelete.reverse();
    
    for (const record of deleteOrder) {
      try {
        const deleted = await record.model.destroy({ where: { id: record.id } });
        if (deleted > 0) {
          console.log(`  ✅ Deleted ${record.name} (ID: ${record.id})`);
        }
      } catch (error) {
        console.log(`  ❌ Failed to delete ${record.name}:`, error.message);
      }
    }

    console.log('\n🧪 Model CRUD Test Complete');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await db.sequelize.close();
  }
}

testModelCRUD();