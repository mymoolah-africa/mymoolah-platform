#!/usr/bin/env node
/**
 * Embed Knowledge Base — Generate OpenAI embeddings for ai_knowledge_base
 *
 * Uses db-connection-helper.js for ALL database connections.
 * Passwords for Staging/Production are fetched automatically from GCP Secret Manager.
 * No manual DATABASE_URL or password required.
 *
 * Usage:
 *   node scripts/embed-knowledge-base.js                    # UAT (default)
 *   node scripts/embed-knowledge-base.js --env=staging      # Staging
 *   node scripts/embed-knowledge-base.js --env=production   # Production
 *   node scripts/embed-knowledge-base.js --dry-run          # Preview only (UAT)
 *   node scripts/embed-knowledge-base.js --env=staging --dry-run
 *
 * Pre-requisites:
 *   - Cloud SQL proxy must be running for the target environment
 *     UAT:        ./scripts/ensure-proxies-running.sh uat
 *     Staging:    ./scripts/ensure-proxies-running.sh staging
 *     Production: ./scripts/ensure-proxies-running.sh production
 *   - OPENAI_API_KEY must be set in .env
 */

require('dotenv').config();
const { OpenAI } = require('openai');
const { getUATClient, getStagingClient, getProductionClient } = require('./db-connection-helper');

const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 20;

// ─── Parse CLI args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const envArg = (args.find((a) => a.startsWith('--env=')) || '--env=uat').replace('--env=', '').toLowerCase();

if (!['uat', 'staging', 'production'].includes(envArg)) {
  console.error(`❌ Invalid --env value: "${envArg}". Must be uat, staging, or production.`);
  process.exit(1);
}

// ─── Get DB client ────────────────────────────────────────────────────────────

async function getClient(env) {
  console.log(`🔌 Connecting to ${env.toUpperCase()} database via db-connection-helper...`);
  switch (env) {
    case 'staging':    return getStagingClient();
    case 'production': return getProductionClient();
    default:           return getUATClient();
  }
}

// ─── OpenAI embedding ─────────────────────────────────────────────────────────

async function embedText(openai, text) {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not set in .env');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log(`\n📚 Embedding knowledge base with OpenAI ${EMBEDDING_MODEL}`);
  console.log(`🌍 Environment: ${envArg.toUpperCase()}`);
  if (dryRun) console.log('🔍 DRY RUN — no writes will be made\n');

  const client = await getClient(envArg);

  try {
    // Fetch all active KB entries
    const { rows: entries } = await client.query(
      `SELECT id, "faqId", question, answer, "questionEnglish", language, category
       FROM ai_knowledge_base
       WHERE "isActive" = true
       ORDER BY id`
    );

    console.log(`📊 ${entries.length} active entries to process\n`);

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      for (const entry of batch) {
        const textToEmbed =
          (entry.questionEnglish || entry.question) +
          '\n' +
          (entry.answer || '').slice(0, 500);

        try {
          const embedding = await embedText(openai, textToEmbed);

          if (!dryRun) {
            await client.query(
              `UPDATE ai_knowledge_base SET embedding = $1, "updatedAt" = NOW() WHERE id = $2`,
              [JSON.stringify(embedding), entry.id]
            );
          }

          console.log(`  ${dryRun ? '[DRY]' : '✅'} ${entry.id} ${entry.faqId || '-'} ${entry.category}`);
          succeeded++;
        } catch (err) {
          console.error(`  ❌ ${entry.id} (${entry.faqId || '-'}): ${err.message}`);
          failed++;
        }
      }
    }

    console.log(`\n✅ Done — ${succeeded} embedded${dryRun ? ' (dry run)' : ''}, ${failed} failed`);
  } finally {
    client.release();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
