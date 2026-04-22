#!/usr/bin/env node
/**
 * Verify migration `20260202_03_referral_3_levels_remove_l4.js` status across
 * UAT, Staging, and Production.
 *
 * Checks:
 *   1. SequelizeMeta row presence
 *   2. referral_chains columns (level_4_user_id should NOT exist)
 *   3. user_referral_stats columns (level_4_count / _month_cents / _capped should NOT exist)
 *   4. referral_earnings CHECK constraint (should be BETWEEN 1 AND 3)
 *   5. Any lingering referral_earnings rows with level=4
 */

const {
  getUATClient,
  getStagingClient,
  getProductionClient,
} = require('./db-connection-helper');

const MIGRATION_NAME = '20260202_03_referral_3_levels_remove_l4.js';

async function checkEnv(label, getClient) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`🔍 ${label}`);
  console.log('='.repeat(72));

  let client;
  try {
    client = await getClient();
  } catch (err) {
    console.error(`❌ Failed to connect: ${err.message}`);
    return { env: label, error: err.message };
  }

  const result = { env: label };

  try {
    // 1. SequelizeMeta
    const meta = await client.query(
      `SELECT name FROM "SequelizeMeta" WHERE name = $1`,
      [MIGRATION_NAME]
    );
    result.sequelizeMetaApplied = meta.rowCount > 0;
    console.log(`   SequelizeMeta has migration: ${result.sequelizeMetaApplied ? '✅ YES' : '❌ NO'}`);

    // 2. referral_chains.level_4_user_id should NOT exist
    const chainCol = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'referral_chains' AND column_name = 'level_4_user_id'
    `);
    result.chainsHasL4Col = chainCol.rowCount > 0;
    console.log(`   referral_chains.level_4_user_id dropped: ${!result.chainsHasL4Col ? '✅ YES' : '❌ NO (still exists)'}`);

    // 3. user_referral_stats level_4_* should NOT exist
    const statsCols = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_referral_stats'
        AND column_name IN ('level_4_count', 'level_4_month_cents', 'level_4_capped')
      ORDER BY column_name
    `);
    result.statsL4Cols = statsCols.rows.map((r) => r.column_name);
    console.log(`   user_referral_stats L4 columns dropped: ${result.statsL4Cols.length === 0 ? '✅ YES' : `❌ NO (still: ${result.statsL4Cols.join(', ')})`}`);

    // 4. CHECK constraint on referral_earnings.level
    const checkConstraint = await client.query(`
      SELECT pg_get_constraintdef(c.oid) AS def, c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'referral_earnings'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%level%'
    `);
    result.checkConstraints = checkConstraint.rows.map((r) => ({ name: r.conname, def: r.def }));
    console.log(`   referral_earnings CHECK constraint(s):`);
    for (const c of result.checkConstraints) {
      console.log(`      ${c.name}: ${c.def}`);
    }
    const is3Level = result.checkConstraints.some((c) => c.def.includes('1) AND (level <= 3)') || /BETWEEN 1 AND 3/.test(c.def));
    const is4Level = result.checkConstraints.some((c) => c.def.includes('1) AND (level <= 4)') || /BETWEEN 1 AND 4/.test(c.def));
    console.log(`   → CHECK constraint is 3-level: ${is3Level ? '✅ YES' : '❌ NO'}`);
    if (is4Level) console.log(`   → ⚠️  STILL 4-LEVEL`);
    result.checkIs3Level = is3Level;
    result.checkIs4Level = is4Level;

    // 5. Any lingering level=4 earnings
    const l4Rows = await client.query(`SELECT COUNT(*)::int AS c FROM referral_earnings WHERE level = 4`);
    result.level4EarningsCount = l4Rows.rows[0].c;
    console.log(`   referral_earnings rows with level=4: ${result.level4EarningsCount === 0 ? '✅ 0' : `❌ ${result.level4EarningsCount}`}`);

    // Summary
    const fullyMigrated =
      result.sequelizeMetaApplied &&
      !result.chainsHasL4Col &&
      result.statsL4Cols.length === 0 &&
      result.checkIs3Level &&
      !result.checkIs4Level &&
      result.level4EarningsCount === 0;
    result.fullyMigrated = fullyMigrated;
    console.log(`\n   🏁 OVERALL: ${fullyMigrated ? '✅ FULLY MIGRATED TO 3-LEVEL' : '❌ NOT FULLY MIGRATED'}`);
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    result.error = err.message;
  } finally {
    if (client) await client.end();
  }

  return result;
}

async function main() {
  const results = [];
  results.push(await checkEnv('UAT', getUATClient));
  results.push(await checkEnv('STAGING', getStagingClient));
  results.push(await checkEnv('PRODUCTION', getProductionClient));

  console.log(`\n${'='.repeat(72)}`);
  console.log('📊 SUMMARY');
  console.log('='.repeat(72));
  for (const r of results) {
    const flag = r.fullyMigrated ? '✅' : '❌';
    console.log(`${flag} ${r.env}: ${r.fullyMigrated ? 'fully 3-level' : `needs attention${r.error ? ` (${r.error})` : ''}`}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
