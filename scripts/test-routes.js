const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');

const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

console.log('--- Route Test Results ---');

routeFiles.forEach((file) => {
  const filePath = path.join(routesDir, file);
  const displayName = path.basename(file);
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`${displayName}: ❌ File not found`);
    return;
  }
  // Check if file is empty
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.trim().length === 0) {
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