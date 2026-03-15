#!/usr/bin/env node
/**
 * Activate all auto-generated KB entries in UAT.
 * Sets isActive=true for every entry with faqId LIKE 'GEN-%'.
 * Run this after generate-knowledge-base.js to enable new entries for testing.
 *
 * Usage:
 *   node scripts/activate-generated-kb.js        # activate all GEN- entries
 *   node scripts/activate-generated-kb.js --count # just show count, no changes
 */

require('dotenv').config();
const { getUATClient } = require('./db-connection-helper');

async function main() {
  const countOnly = process.argv.includes('--count');
  const client = await getUATClient();

  try {
    const { rows: counts } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE "isActive" = false AND "faqId" LIKE 'GEN-%') AS pending,
        COUNT(*) FILTER (WHERE "isActive" = true  AND "faqId" LIKE 'GEN-%') AS already_active,
        COUNT(*) FILTER (WHERE "isActive" = true  AND "faqId" NOT LIKE 'GEN-%') AS original_active
      FROM ai_knowledge_base
    `);

    const { pending, already_active, original_active } = counts[0];
    console.log('\n📊 UAT Knowledge Base Status');
    console.log('─'.repeat(50));
    console.log(`  Original entries (active):    ${original_active}`);
    console.log(`  Generated entries (active):   ${already_active}`);
    console.log(`  Generated entries (pending):  ${pending}`);
    console.log(`  Total active:                 ${parseInt(original_active) + parseInt(already_active)}`);

    if (countOnly) {
      console.log('\n  (--count only — no changes made)\n');
      return;
    }

    if (parseInt(pending) === 0) {
      console.log('\n✅ All generated entries are already active.\n');
      return;
    }

    const { rowCount } = await client.query(`
      UPDATE ai_knowledge_base
      SET "isActive" = true, "updatedAt" = NOW()
      WHERE "faqId" LIKE 'GEN-%' AND "isActive" = false
    `);

    console.log(`\n✅ Activated ${rowCount} new KB entries.`);
    console.log(`📚 Total active KB entries now: ${parseInt(original_active) + parseInt(already_active) + rowCount}`);
    console.log('\n📋 Next step: npm run embed:kb\n');

  } finally {
    client.release();
  }
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
