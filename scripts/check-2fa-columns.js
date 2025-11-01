require('dotenv').config();
const { Sequelize } = require('sequelize');

// Parse DATABASE_URL to extract connection details
const dbUrl = process.env.DATABASE_URL;
console.log('Connecting to database...');

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false  // Allow self-signed certificates
    }
  },
  logging: false,
  pool: {
    max: 5,
    min: 1,
    acquire: 30000,
    idle: 10000
  }
});

sequelize.getQueryInterface().describeTable('users')
  .then(table => {
    const columns = Object.keys(table);
    const twoFactorColumns = columns.filter(c => 
      c.includes('twoFactor') || 
      c.includes('lastLogin') || 
      c.includes('knownDevices')
    );
    
    console.log('\n✅ Security columns found:', twoFactorColumns.length > 0 ? twoFactorColumns.join(', ') : 'None');
    
    const has2FA = columns.includes('twoFactorEnabled');
    const hasSecret = columns.includes('twoFactorSecret');
    const hasBackupCodes = columns.includes('twoFactorBackupCodes');
    const hasLastLoginIP = columns.includes('lastLoginIP');
    
    console.log('\n📊 2FA Migration Status:');
    console.log('  - twoFactorEnabled:', has2FA ? '✅ EXISTS' : '❌ MISSING');
    console.log('  - twoFactorSecret:', hasSecret ? '✅ EXISTS' : '❌ MISSING');
    console.log('  - twoFactorBackupCodes:', hasBackupCodes ? '✅ EXISTS' : '❌ MISSING');
    console.log('  - lastLoginIP:', hasLastLoginIP ? '✅ EXISTS' : '❌ MISSING');
    
    if (has2FA && hasSecret && hasBackupCodes && hasLastLoginIP) {
      console.log('\n✅ Migration already applied - All 2FA columns exist!');
      process.exit(0);
    } else {
      console.log('\n❌ Migration NOT applied - Need to run migration');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('\n❌ Error connecting to database:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  })
  .finally(() => {
    sequelize.close();
  });
