#!/usr/bin/env node
/**
 * Diagnose eeziAirtime PIN "does not exist" on network
 *
 * Queries vas_transactions for Flash eezi-voucher purchases and shows
 * what Flash returned vs what we extracted, to debug PIN validity.
 *
 * Usage (in Codespaces):
 *   node scripts/diagnose-eeziairtime-pin.js                    # Recent Flash eezi transactions
 *   node scripts/diagnose-eeziairtime-pin.js 113563190017       # Specific PIN
 *   node scripts/diagnose-eeziairtime-pin.js --staging          # Staging DB
 *   node scripts/diagnose-eeziairtime-pin.js --staging 113563190017
 *
 * Pre-requisites:
 *   - Cloud SQL proxy running: ./scripts/ensure-proxies-running.sh
 *   - For --staging: gcloud authenticated, proxy on 6544
 */

require('dotenv').config();

const { getUATDatabaseURL, getStagingDatabaseURL, closeAll } = require('./db-connection-helper');

const args = process.argv.slice(2);
const isStaging = args.includes('--staging');
const pinArg = args.find((a) => !a.startsWith('--') && /^\d+$/.test(a));

process.env.DATABASE_URL = isStaging ? getStagingDatabaseURL() : getUATDatabaseURL();

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

/** Redact PIN-like values in objects */
function redactPin(obj, depth = 0) {
  if (depth > 6) return '[max depth]';
  if (obj == null) return obj;
  if (typeof obj !== 'object') return obj;
  const out = {};
  for (const k of Object.keys(obj)) {
    const lower = k.toLowerCase();
    if (['pin', 'pinnumber', 'token', 'code', 'serialnumber', 'password', 'secret', 'voucherpin', 'vouchearcode'].some((s) => lower.includes(s))) {
      const v = obj[k];
      out[k] = v != null && typeof v === 'string' && v.length > 4 ? `${v.slice(0, 4)}***${v.slice(-2)}` : '[REDACTED]';
    } else {
      out[k] = redactPin(obj[k], depth + 1);
    }
  }
  return out;
}

/** List keys of Flash response (for comparison with extraction logic) */
function describeKeys(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return [];
  const lines = [];
  for (const k of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      lines.push(path + ': { ' + Object.keys(v).join(', ') + ' }');
      lines.push(...describeKeys(v, path));
    } else {
      const type = Array.isArray(v) ? 'array' : typeof v;
      lines.push(`${path}: ${type}`);
    }
  }
  return lines;
}

async function run() {
  const target = isStaging ? 'Staging' : 'UAT';
  console.log(`\n🔍 eeziAirtime PIN diagnostic (${target} DB)\n`);
  console.log('='.repeat(70));

  try {
    await sequelize.authenticate();

    const whereClause = pinArg
      ? `(vt.metadata->>'pin' = :pin OR vt.metadata::text LIKE :pinLike)`
      : 'vt."supplierId" ILIKE \'flash\' AND vt.metadata->>\'productCode\' IS NOT NULL';

    const replacements = pinArg
      ? { pin: pinArg, pinLike: `%${pinArg}%` }
      : {};

    const limit = pinArg ? 5 : 10;

    const [rows] = await sequelize.query(
      `
      SELECT
        vt.id,
        vt."transactionId",
        vt.reference,
        vt."supplierReference",
        vt.amount,
        vt.status,
        vt."createdAt",
        vt.metadata
      FROM vas_transactions vt
      WHERE ${whereClause}
      ORDER BY vt."createdAt" DESC
      LIMIT :limit
      `,
      {
        replacements: { ...replacements, limit },
        type: QueryTypes.SELECT,
      }
    );

    if (!rows || rows.length === 0) {
      console.log(pinArg ? `No Flash eezi transaction found with PIN containing "${pinArg}"` : 'No recent Flash eezi-voucher transactions found.');
      await closeAll();
      process.exit(0);
    }

    console.log(`\n📋 Found ${rows.length} transaction(s)\n`);

    for (const row of rows) {
      const meta = row.metadata || {};
      const extractedPin = meta.pin;
      const flashResponse = meta.flashResponse || meta.flash_response;

      console.log('-'.repeat(70));
      console.log(`Transaction: ${row.transactionId}`);
      console.log(`Reference:   ${row.reference}`);
      console.log(`Amount:      R${((row.amount || 0) / 100).toFixed(2)}`);
      console.log(`Status:      ${row.status}`);
      console.log(`Created:     ${row.createdAt}`);
      console.log(`\nExtracted PIN (our logic): ${extractedPin ? `${extractedPin.slice(0, 4)}***${extractedPin.slice(-2)} (len=${extractedPin.length})` : '(none)'}`);

      if (flashResponse) {
        console.log('\n📥 Flash API response structure (keys only):');
        const keys = describeKeys(flashResponse);
        keys.slice(0, 25).forEach((l) => console.log('   ', l));
        if (keys.length > 25) console.log('   ... and', keys.length - 25, 'more');

        console.log('\n📥 Flash response (PIN-like values redacted):');
        console.log(JSON.stringify(redactPin(flashResponse), null, 2));
      } else {
        console.log('\n⚠️ No flashResponse stored in metadata');
      }
      console.log('');
    }

    console.log('='.repeat(70));
    console.log('\n💡 Extraction paths in flashController.js: voucher, tx, response, vd;');
    console.log('   fields: pin, pinNumber, voucherPin, token, code, serialNumber, etc.');
    console.log('\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (isStaging) {
      console.error('\n💡 For Staging: ensure proxy on 6544 and gcloud authenticated.');
      console.error('   Run: ./scripts/ensure-proxies-running.sh');
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    await closeAll();
  }
}

run();
