const db = require('../models');
const bcrypt = require('bcrypt');

async function debugUpdateIssues() {
  console.log('🔍 Debugging Update Issues');
  
  try {
    // Test VoucherType update
    console.log('\n🔹 Testing VoucherType update...');
    try {
      const voucherType = await db.VoucherType.create({
        typeName: 'test_type_update',
        displayName: 'Test Type Update',
        pricingModel: 'fixed_rate',
        baseRate: 1.0,
        minAmount: 5.0,
        maxAmount: 4000.0,
        isActive: true
      });
      console.log('  ✅ VoucherType create: Success');
      
      // Try different update fields
      const updateFields = [
        { isActive: false },
        { displayName: 'Updated Display Name' },
        { baseRate: 2.0 },
        { minAmount: 10.0 },
        { maxAmount: 5000.0 }
      ];
      
      for (const field of updateFields) {
        try {
          const updated = await db.VoucherType.update(
            field,
            { where: { id: voucherType.id } }
          );
          console.log(`  ✅ Update ${Object.keys(field)[0]}: Success`);
        } catch (error) {
          console.log(`  ❌ Update ${Object.keys(field)[0]}: ${error.message}`);
        }
      }
      
      // Cleanup
      await db.VoucherType.destroy({ where: { id: voucherType.id } });
      
    } catch (error) {
      console.log('  ❌ VoucherType error:', error.message);
    }

    // Test SupportMessage update
    console.log('\n🔹 Testing SupportMessage update...');
    
    // Create required parent records
    const user = await db.User.create({
      email: 'testuser_update@example.com',
      password_hash: await bcrypt.hash('testpassword123', 12),
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '0821234568',
      accountNumber: 'ACC123456789',
      balance: 0.00,
      status: 'active',
      kycStatus: 'not_started'
    });
    
    const ticket = await db.SupportTicket.create({
      userId: user.id,
      subject: 'Test Ticket Update',
      status: 'open',
      priority: 'medium',
      category: 'general'
    });
    
    try {
      const message = await db.SupportMessage.create({
        ticketId: ticket.id,
        senderId: user.id,
        message: 'This is a test support message for update.',
        messageType: 'user_message',
        isInternal: false
      });
      console.log('  ✅ SupportMessage create: Success');
      
      // Try different update fields
      const updateFields = [
        { messageType: 'admin_response' },
        { isInternal: true },
        { message: 'Updated message content' }
      ];
      
      for (const field of updateFields) {
        try {
          const updated = await db.SupportMessage.update(
            field,
            { where: { id: message.id } }
          );
          console.log(`  ✅ Update ${Object.keys(field)[0]}: Success`);
        } catch (error) {
          console.log(`  ❌ Update ${Object.keys(field)[0]}: ${error.message}`);
        }
      }
      
      // Cleanup
      await db.SupportMessage.destroy({ where: { id: message.id } });
      await db.SupportTicket.destroy({ where: { id: ticket.id } });
      await db.User.destroy({ where: { id: user.id } });
      
    } catch (error) {
      console.log('  ❌ SupportMessage error:', error.message);
    }

  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await db.sequelize.close();
  }
}

debugUpdateIssues(); 