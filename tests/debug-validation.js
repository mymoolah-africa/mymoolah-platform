const db = require('../models');
const bcrypt = require('bcrypt');

async function debugValidationErrors() {
  console.log('🔍 Debugging Validation Errors');
  
  try {
    // Test VoucherType validation
    console.log('\n🔹 Testing VoucherType validation...');
    try {
      const voucherType = await db.VoucherType.create({
        typeName: 'standard',
        displayName: 'Standard Voucher',
        pricingModel: 'fixed_rate',
        baseRate: 1.0,
        minAmount: 5.0,
        maxAmount: 4000.0,
        isActive: true
      });
      console.log('  ✅ VoucherType create: Success');
      
      // Test update
      const updated = await db.VoucherType.update(
        { isActive: false },
        { where: { id: voucherType.id } }
      );
      console.log('  ✅ VoucherType update: Success');
      
      // Cleanup
      await db.VoucherType.destroy({ where: { id: voucherType.id } });
      
    } catch (error) {
      console.log('  ❌ VoucherType error:', error.message);
      if (error.errors) {
        error.errors.forEach(err => {
          console.log(`    - ${err.path}: ${err.message}`);
        });
      }
    }

    // Test SupportMessage validation
    console.log('\n🔹 Testing SupportMessage validation...');
    
    // Create required parent records first
    const user = await db.User.create({
      email: 'testuser@example.com',
      password_hash: await bcrypt.hash('testpassword123', 12),
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '0821234567',
      balance: 0.00,
      status: 'active',
      kycStatus: 'not_started'
    });
    
    const ticket = await db.SupportTicket.create({
      userId: user.id,
      subject: 'Test Ticket',
      status: 'open',
      priority: 'medium',
      category: 'general'
    });
    
    try {
      const message = await db.SupportMessage.create({
        ticketId: ticket.id,
        senderId: user.id,
        message: 'This is a test support message.',
        messageType: 'user_message',
        isInternal: false
      });
      console.log('  ✅ SupportMessage create: Success');
      
      // Test update
      const updated = await db.SupportMessage.update(
        { messageType: 'admin_response' },
        { where: { id: message.id } }
      );
      console.log('  ✅ SupportMessage update: Success');
      
      // Cleanup
      await db.SupportMessage.destroy({ where: { id: message.id } });
      await db.SupportTicket.destroy({ where: { id: ticket.id } });
      await db.User.destroy({ where: { id: user.id } });
      
    } catch (error) {
      console.log('  ❌ SupportMessage error:', error.message);
      if (error.errors) {
        error.errors.forEach(err => {
          console.log(`    - ${err.path}: ${err.message}`);
        });
      }
    }

  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await db.sequelize.close();
  }
}

debugValidationErrors(); 