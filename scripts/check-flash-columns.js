#!/usr/bin/env node
/**
 * Quick diagnostic: list actual column names in flash_transactions
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getUATPool } = require('./db-connection-helper');

(async () => {
  const pool = getUATPool();
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'flash_transactions'
      ORDER BY ordinal_position
    `);
    console.log('\\n=== flash_transactions columns ===');
    rows.forEach(r => console.log(`  ${r.column_name}  (${r.data_type}, udt: ${r.udt_name})`));
    console.log(`\\nTotal: ${rows.length} columns`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();
