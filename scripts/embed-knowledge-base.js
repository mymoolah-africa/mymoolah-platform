#!/usr/bin/env node
/**
 * Embed Knowledge Base — Generate OpenAI embeddings for ai_knowledge_base
 * Run once after adding new knowledge, or when switching to OpenAI embeddings.
 *
 * Usage:
 *   node scripts/embed-knowledge-base.js           # UAT (default DATABASE_URL)
 *   DATABASE_URL=... node scripts/embed-knowledge-base.js --staging
 *   node scripts/embed-knowledge-base.js --dry-run # Preview only
 */

require('dotenv').config();
const { OpenAI } = require('openai');
const models = require('../models');
const { AiKnowledgeBase } = models;

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;
const BATCH_SIZE = 20;

async function embedText(openai, text) {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not set');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });
  console.log('📚 Embedding knowledge base with OpenAI', EMBEDDING_MODEL);
  if (dryRun) console.log('🔍 DRY RUN — no writes');

  const entries = await AiKnowledgeBase.findAll({
    where: { isActive: true },
    attributes: ['id', 'faqId', 'question', 'answer', 'questionEnglish', 'language', 'category'],
    raw: true,
  });

  console.log(`📊 ${entries.length} active entries to process`);

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    for (const entry of batch) {
      const textToEmbed = (entry.questionEnglish || entry.question) + '\n' + (entry.answer || '').slice(0, 500);
      try {
        const embedding = await embedText(openai, textToEmbed);
        if (!dryRun) {
          await AiKnowledgeBase.update(
            { embedding },
            { where: { id: entry.id } }
          );
        }
        console.log(`  ${dryRun ? '[DRY]' : '✅'} ${entry.id} ${entry.faqId || '-'} ${entry.category}`);
      } catch (err) {
        console.error(`  ❌ ${entry.id}:`, err.message);
      }
    }
  }

  console.log('\n✅ Done');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
