const { Voucher } = require('./models');
const { Op } = require('sequelize');

async function fixVoucherTimezone() {
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
    console.log(`   - Current Expiry (UTC): ${voucher.expiresAt}`);
    console.log(`   - Current Expiry (Local): ${voucher.expiresAt?.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`);

    // Set new expiry date: 19 Aug 2025, 09:00 local time (SAST)
    // SAST is UTC+2, so 09:00 local = 07:00 UTC
    const newExpiryDate = new Date('2025-08-19T07:00:00.000Z'); // 07:00 UTC = 09:00 SAST
    
    // Update the voucher
    await voucher.update({
      expiresAt: newExpiryDate,
      metadata: {
        ...voucher.metadata,
        expiryUpdatedAt: new Date().toISOString(),
        previousExpiry: voucher.expiresAt,
        newExpiry: newExpiryDate,
        updateReason: 'timezone_correction',
        timezone: 'Africa/Johannesburg',
        localTime: '09:00',
        utcTime: '07:00'
      }
    });

    console.log('✅ Voucher expiry timezone corrected!');
    console.log(`   - New Expiry (UTC): ${newExpiryDate}`);
    console.log(`   - New Expiry (Local): ${newExpiryDate.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`);
    console.log(`   - Updated at: ${new Date().toISOString()}`);

    // Verify the update
    const updatedVoucher = await Voucher.findByPk(voucher.id);
    console.log('🔍 Verification:');
    console.log(`   - New Expiry (UTC): ${updatedVoucher.expiresAt}`);
    console.log(`   - New Expiry (Local): ${updatedVoucher.expiresAt.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`);
    console.log(`   - Is Expired: ${new Date() > updatedVoucher.expiresAt ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Error fixing voucher timezone:', error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixVoucherTimezone();
