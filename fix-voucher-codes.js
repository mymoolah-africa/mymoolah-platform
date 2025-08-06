// Script to fix all voucher codes to 16-digit format
const { Voucher } = require('./models');

const generateMMVoucherCode = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return timestamp + random;
};

async function fixVoucherCodes() {
  try {
    console.log('🔧 Fixing voucher codes to 16-digit format...\n');
    
    const vouchers = await Voucher.findAll();
    let updated = 0;
    
    for (const voucher of vouchers) {
      // Check if voucher code is not in correct 16-digit format
      if (!/^\d{16}$/.test(voucher.voucherCode)) {
        const oldCode = voucher.voucherCode;
        const newCode = generateMMVoucherCode();
        
        console.log(`ID ${voucher.id}: '${oldCode}' -> '${newCode}' (Status: ${voucher.status})`);
        
        // Update the voucher code
        await voucher.update({ voucherCode: newCode });
        updated++;
      }
    }
    
    console.log(`\n✅ Updated ${updated} voucher codes to 16-digit format`);
    
    // Verify the fix
    console.log('\n🔍 Verifying all voucher codes are now 16-digit:');
    const allVouchers = await Voucher.findAll({ attributes: ['id', 'voucherCode', 'status'] });
    let correct = 0;
    let incorrect = 0;
    
    allVouchers.forEach(v => {
      if (/^\d{16}$/.test(v.voucherCode)) {
        correct++;
      } else {
        console.log(`❌ ID ${v.id}: '${v.voucherCode}' is still not 16-digit`);
        incorrect++;
      }
    });
    
    console.log(`\n📊 Results: ${correct} correct, ${incorrect} incorrect`);
    
    if (incorrect === 0) {
      console.log('🎉 All voucher codes are now in correct 16-digit format!');
    } else {
      console.log('⚠️  Some voucher codes still need fixing');
    }
    
  } catch (error) {
    console.error('❌ Error fixing voucher codes:', error);
  }
}

fixVoucherCodes(); 