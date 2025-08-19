const { Voucher } = require('./models');
const { Op } = require('sequelize');

async function updateVoucherExpiry() {
  try {
    console.log('🔍 Looking for voucher: 91234658633882');
    
    // Find the voucher by EasyPay code
    const voucher = await Voucher.findOne({
      where: {
        easyPayCode: '91234658633882'
      }
    });

    if (!voucher) {
      console.log('❌ Voucher not found');
      return;
    }

    console.log('📋 Current voucher details:');
    console.log(`   - ID: ${voucher.id}`);
    console.log(`   - Status: ${voucher.status}`);
    console.log(`   - Original Amount: R${voucher.originalAmount}`);
    console.log(`   - Current Expiry: ${voucher.expiresAt}`);
    console.log(`   - Created: ${voucher.createdAt}`);

    // Set new expiry date: 19 Aug 2025, 09:00
    const newExpiryDate = new Date('2025-08-19T09:00:00.000Z');
    
    // Update the voucher
    await voucher.update({
      expiresAt: newExpiryDate,
      metadata: {
        ...voucher.metadata,
        expiryUpdatedAt: new Date().toISOString(),
        previousExpiry: voucher.expiresAt,
        newExpiry: newExpiryDate,
        updateReason: 'manual_extension'
      }
    });

    console.log('✅ Voucher expiry updated successfully!');
    console.log(`   - New Expiry: ${newExpiryDate}`);
    console.log(`   - Updated at: ${new Date().toISOString()}`);

    // Verify the update
    const updatedVoucher = await Voucher.findByPk(voucher.id);
    console.log('🔍 Verification:');
    console.log(`   - New Expiry: ${updatedVoucher.expiresAt}`);
    console.log(`   - Is Expired: ${new Date() > updatedVoucher.expiresAt ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Error updating voucher expiry:', error);
  } finally {
    process.exit(0);
  }
}

// Run the update
updateVoucherExpiry();
