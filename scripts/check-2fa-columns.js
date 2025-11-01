require('dotenv').config();
const { Sequelize } = require('sequelize');

const dbUrl = process.env.DATABASE_URL;
console.log('Connecting to database...');

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

sequelize.getQueryInterface().describeTable('users')
  .then(table => {
    const columns = Object.keys(table);
    const twoFactorColumns = columns.filter(c => 
      c.includes('twoFactor') || 
      c.includes('lastLogin') || 
      c.includes('knownDevices')
    );
    
    console.log('Security columns found:', twoFactorColumns.length > 0 ? twoFactorColumns.join(', ') : 'None');
    
    const has2FA = columns.includes('twoFactorEnabled');
    const hasSecret = columns.includes('twoFactorSecret');
    
    console.log('twoFactorEnabled:', has2FA ? 'EXISTS' : 'MISSING');
    console.log('twoFactorSecret:', hasSecret ? 'EXISTS' : 'MISSING');
    
    if (has2FA && hasSecret) {
      console.log('Migration already applied');
      process.exit(0);
    } else {
      console.log('Need to run migration');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  })
  .finally(() => {
    sequelize.close();
  });
