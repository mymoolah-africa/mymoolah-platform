#!/usr/bin/env node
'use strict';

/**
 * Seed a portal admin user using db-connection-helper.js
 *
 * Usage (from repo root):
 *   PORTAL_ADMIN_EMAIL=admin@mymoolah.africa PORTAL_ADMIN_PASSWORD=YourSecurePass123! node scripts/seed-portal-admin.js
 *
 * Or set defaults in .env and run:
 *   node scripts/seed-portal-admin.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getUATClient } = require('./db-connection-helper');

const EMAIL = process.env.PORTAL_ADMIN_EMAIL || 'admin@mymoolah.africa';
const PASSWORD = process.env.PORTAL_ADMIN_PASSWORD;

if (!PASSWORD) {
  console.error('PORTAL_ADMIN_PASSWORD env var is required.');
  console.error('Usage: PORTAL_ADMIN_PASSWORD=YourPass123! node scripts/seed-portal-admin.js');
  process.exit(1);
}

(async () => {
  let client;
  try {
    client = await getUATClient();

    const existing = await client.query(
      'SELECT id FROM portal_users WHERE email = $1',
      [EMAIL.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      console.log(`Portal user "${EMAIL}" already exists (id: ${existing.rows[0].id}). Updating password...`);
      const hash = await bcrypt.hash(PASSWORD, 12);
      await client.query(
        'UPDATE portal_users SET "passwordHash" = $1, "updatedAt" = NOW() WHERE email = $2',
        [hash, EMAIL.toLowerCase()]
      );
      console.log('Password updated.');
    } else {
      const hash = await bcrypt.hash(PASSWORD, 12);
      const result = await client.query(
        `INSERT INTO portal_users (
          "entityId", "entityName", "entityType", email, "passwordHash",
          role, permissions, "hasDualRole", "dualRoles",
          "isActive", "isVerified", "twoFactorEnabled",
          "notificationPreferences", metadata, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14, NOW(), NOW()
        ) RETURNING id`,
        [
          'admin-001',
          'MyMoolah Admin',
          'admin',
          EMAIL.toLowerCase(),
          hash,
          'admin',
          JSON.stringify({
            'users.create': true, 'users.read': true, 'users.update': true, 'users.delete': true,
            'entities.read': true, 'entities.update': true,
            'settlements.process': true, 'settlements.view': true,
            'analytics.view': true, 'system.settings': true
          }),
          false,
          JSON.stringify([]),
          true,
          true,
          false,
          JSON.stringify({ email: true, sms: false, push: true, alerts: true }),
          JSON.stringify({ createdBy: 'seed-portal-admin.js' })
        ]
      );
      console.log(`Portal admin user created (id: ${result.rows[0].id})`);
    }

    console.log(`\nLogin credentials:`);
    console.log(`  Email: ${EMAIL}`);
    console.log(`  Password: (as provided via PORTAL_ADMIN_PASSWORD)`);
    console.log(`\nOpen: /admin/login`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    process.exit(0);
  }
})();
