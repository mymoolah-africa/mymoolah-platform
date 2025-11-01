require('dotenv').config();
const pg = require('pg');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => {
    console.log('✅ Connected to database');
    return client.query("SELECT name FROM SequelizeMeta WHERE name LIKE '%2fa%' OR name LIKE '%20251031%' ORDER BY name DESC LIMIT 5");
  })
  .then(result => {
    console.log('\n📋 Recent migrations with "2fa" or "20251031":');
    if (result.rows.length > 0) {
      result.rows.forEach(row => console.log('  -', row.name));
      const hasOurMigration = result.rows.some(r => r.name.includes('20251031_add_2fa_to_users'));
      if (hasOurMigration) {
        console.log('\n✅ Migration 20251031_add_2fa_to_users already executed!');
      } else {
        console.log('\n❌ Migration 20251031_add_2fa_to_users NOT found - need to run it');
      }
    } else {
      console.log('  (none found)');
      console.log('\n❌ Migration not executed - need to run it');
    }
    return client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND (column_name LIKE '%two_factor%' OR column_name LIKE '%twoFactor%' OR column_name LIKE '%last_login%') ORDER BY column_name");
  })
  .then(result => {
    console.log('\n📊 2FA columns in users table:');
    if (result.rows.length > 0) {
      result.rows.forEach(row => console.log('  -', row.column_name));
      console.log('\n✅ 2FA columns exist in database');
    } else {
      console.log('  (none found)');
      console.log('\n❌ 2FA columns do NOT exist - need to run migration');
    }
    client.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    client.end();
    process.exit(1);
  });
