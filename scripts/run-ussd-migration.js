#!/usr/bin/env node
'use strict';

/**
 * Run USSD Tier 0 migration using mymoolah_app (table owner).
 * Usage: node scripts/run-ussd-migration.js
 */

require('dotenv').config();
const path = require('path');
const helper = require(path.join(__dirname, 'db-connection-helper'));

(async () => {
  let client;
  try {
    client = await helper.getUATClient();
    console.log('✅ Connected to UAT as mymoolah_app');

    // 1. Add ussd_basic to kycStatus enum
    await client.query(`ALTER TYPE "enum_users_kycStatus" ADD VALUE IF NOT EXISTS 'ussd_basic';`);
    console.log('✅ Added ussd_basic to kycStatus enum');

    // 2. Add USSD columns (idempotent — skip if exists)
    const columns = [
      { name: 'ussd_pin', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS ussd_pin VARCHAR;` },
      { name: 'ussd_pin_attempts', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS ussd_pin_attempts INTEGER NOT NULL DEFAULT 0;` },
      { name: 'ussd_locked_until', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS ussd_locked_until TIMESTAMPTZ;` },
      { name: 'registration_channel', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_channel VARCHAR NOT NULL DEFAULT 'app';` },
      { name: 'preferred_language', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) NOT NULL DEFAULT 'en';` },
    ];

    for (const col of columns) {
      await client.query(col.sql);
      console.log(`✅ Column: ${col.name}`);
    }

    // 3. Add index
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_registration_channel ON users (registration_channel);`);
    console.log('✅ Index: idx_users_registration_channel');

    // 4. Mark migration as complete in SequelizeMeta
    await client.query(
      `INSERT INTO "SequelizeMeta" (name) VALUES ($1) ON CONFLICT DO NOTHING;`,
      ['20260326_01_add_ussd_tier0_fields.js']
    );
    console.log('✅ Recorded in SequelizeMeta');

    console.log('\n🎉 USSD migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
  }
})();
