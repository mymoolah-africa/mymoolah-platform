const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../controllers');

const controllerFiles = [
  'authController.js',
  'walletController.js',
  'kycController.js',
  'userController.js',
  'dynamicApiController.js',
  'easyPayController.js',
  'transactionController.js',
  'voucherController.js',
  'notificationController.js',
  'supportController.js',
  'easypayVoucherController.js',
  'voucherTypeController.js',
];

console.log('--- Controller Test Results ---');

controllerFiles.forEach((file) => {
  const filePath = path.join(controllersDir, file);
  const displayName = path.basename(file);
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`${displayName}: ❌ File not found`);
    return;
  }
  // Check if file is empty (skip walletController.js if empty)
  const content = fs.readFileSync(filePath, 'utf8');
  if (file === 'walletController.js' && content.trim().length === 0) {
    console.log(`${displayName}: ⚠️  Skipped (empty file)`);
    return;
  }
  // Syntax check
  try {
    new Function(content);
    console.log(`${displayName}: ✅ Syntax OK`);
  } catch (err) {
    console.log(`${displayName}: ❌ Syntax Error - ${err.message}`);
    return;
  }
  // Module export check
  try {
    require(filePath);
    console.log(`${displayName}: ✅ Module loaded successfully`);
  } catch (err) {
    console.log(`${displayName}: ❌ Module load error - ${err.message}`);
  }
}); 