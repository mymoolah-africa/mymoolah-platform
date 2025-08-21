// Simulate settlement of an EasyPay voucher by marking it Active
// Usage: node -r dotenv/config simulate-ep-settlement.js "9 1234 0588 6638 9"

const { Voucher } = require('./models');

function sanitizeEasyPayCode(input) {
  if (!input) return '';
  return String(input).replace(/\s+/g, '');
}

function generateMMVoucherCode() {
  // Generate a 16-digit numeric code
  let code = '';
  for (let i = 0; i < 16; i += 1) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

async function run() {
  try {
    const arg = process.argv[2];
    if (!arg) {
      console.error('❌ Please provide an EasyPay code.');
      process.exit(1);
    }

    const easyPayCode = sanitizeEasyPayCode(arg);
    console.log(`🔍 Looking up voucher by EasyPay code: ${easyPayCode}`);

    const voucher = await Voucher.findOne({ where: { easyPayCode } });

    if (!voucher) {
      console.error('❌ Voucher not found');
      process.exit(1);
    }

    console.log('📋 Current voucher details:');
    console.log(`   - ID: ${voucher.id}`);
    console.log(`   - Status: ${voucher.status}`);
    console.log(`   - EasyPay Code: ${voucher.easyPayCode}`);
    console.log(`   - MM Voucher Code: ${voucher.voucherCode || '(none)'}`);
    console.log(`   - Original Amount: ${voucher.originalAmount}`);

    // Prepare updates: set status to active and ENSURE a NEW 16-digit MM voucher code
    const updates = { status: 'active' };

    const needsNewMMCode =
      !voucher.voucherCode ||
      String(voucher.voucherCode).length !== 16 ||
      String(voucher.voucherCode) === String(voucher.easyPayCode);

    if (needsNewMMCode) {
      updates.voucherCode = generateMMVoucherCode();
    }

    // Merge metadata
    updates.metadata = {
      ...(voucher.metadata || {}),
      settlement: {
        ...(voucher.metadata?.settlement || {}),
        simulated: true,
        settledAt: new Date().toISOString(),
      },
    };

    // Also ensure the voucher balance is set to originalAmount if not already set
    if (!voucher.balance || Number(voucher.balance) === 0) {
      updates.balance = voucher.originalAmount;
    }

    await voucher.update(updates);

    console.log('✅ Settlement simulated successfully:');
    console.log(`   - New Status: ${voucher.status}`);
    console.log(`   - MM Voucher Code: ${voucher.voucherCode}`);
    console.log('   - No wallet balance changes were made.');
  } catch (err) {
    console.error('❌ Error simulating settlement:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();


