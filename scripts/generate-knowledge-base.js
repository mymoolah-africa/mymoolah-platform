#!/usr/bin/env node
/**
 * Generate Knowledge Base — Comprehensive MMTP KB from codebase + docs
 *
 * Sources (in priority order):
 *   1. docs/FAQ_MASTER.md          — parsed directly, no GPT cost
 *   2. seed-support-knowledge-base  — existing 64 entries as baseline
 *   3. GPT-4o generation            — fills gaps for features not in FAQ_MASTER
 *
 * All entries saved as isActive=false for André's review before activation.
 *
 * Usage:
 *   node scripts/generate-knowledge-base.js              # UAT (default)
 *   node scripts/generate-knowledge-base.js --dry-run    # Preview only, no DB writes
 *   node scripts/generate-knowledge-base.js --clear      # Clear existing auto-generated entries first
 *
 * Pre-requisites:
 *   - UAT proxy running: ./scripts/ensure-proxies-running.sh uat
 *   - OPENAI_API_KEY set in .env
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');
const { getUATClient } = require('./db-connection-helper');

const EMBEDDING_MODEL = 'text-embedding-3-small';
const GPT_MODEL = 'gpt-4o'; // Quality matters for KB generation
const FAQ_MASTER_PATH = path.join(__dirname, '../docs/FAQ_MASTER.md');

const dryRun = process.argv.includes('--dry-run');
const clearExisting = process.argv.includes('--clear');

// ─── Category mapping ─────────────────────────────────────────────────────────

const CATEGORY_MAP = {
  'platform_overview': ['platform', 'overview', 'what is', 'mymoolah', 'bank', 'services', 'who uses'],
  'registration': ['register', 'onboarding', 'sign up', 'open wallet', 'eligibility'],
  'kyc_documents': ['kyc', 'identity', 'verification', 'id', 'passport', 'documents', 'fica'],
  'wallet': ['wallet', 'balance', 'account', 'limit', 'hold', 'funds'],
  'payments': ['payment', 'transfer', 'send money', 'instant', 'eft', 'payshap', 'request money'],
  'vouchers': ['voucher', 'token', 'redeem', 'expiry', 'issue'],
  'cash_out': ['cash-out', 'cash out', 'withdraw', 'retail', 'easypay', 'token at store'],
  'vas': ['airtime', 'data', 'electricity', 'bill payment', 'vas', 'gaming', 'prepaid'],
  'eezipay': ['eezipay', 'eeziairtime', 'eezidata', 'ussd', '*130*'],
  'bulk_payouts': ['salary', 'payroll', 'bulk', 'employer', 'wages', 'payout'],
  'remittance': ['cross-border', 'remittance', 'international', 'corridor', 'fx'],
  'security': ['security', 'fraud', 'pin', 'otp', 'privacy', 'popia', 'protect'],
  'fees': ['fee', 'charge', 'cost', 'pricing', 'transaction fee'],
  'referral_program': ['referral', 'refer', 'commission', 'mlm', 'earn', 'invite'],
  'api_overview': ['api', 'developer', 'endpoint', 'rest', 'jwt', 'integration'],
  'treasury': ['treasury', 'white label', 'enterprise', 'partner', 'programme'],
  'support': ['support', 'contact', 'help', 'assistant', 'chat'],
  'otp_help': ['otp', 'sms', 'verification code', 'not received'],
  'password_reset': ['password', 'forgot', 'reset', 'login'],
  'profile_update': ['profile', 'change phone', 'update', 'personal details'],
  'nfc': ['nfc', 'tap to add', 'halo', 'contactless', 'google pay', 'apple pay'],
  'usdc': ['usdc', 'crypto', 'digital currency', 'solana', 'valr'],
  'reconciliation': ['reconcile', 'settlement', 'ledger', 'float', 'audit'],
};

function detectCategory(question, answer) {
  const text = (question + ' ' + answer).toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(kw => text.includes(kw))) return category;
  }
  return 'general';
}

function detectAudience(question, answer) {
  const text = (question + ' ' + answer).toLowerCase();
  if (text.includes('employer') || text.includes('api') || text.includes('developer') ||
      text.includes('bulk') || text.includes('enterprise') || text.includes('white label') ||
      text.includes('supplier') || text.includes('merchant')) return 'business';
  if (text.includes('developer') || text.includes('endpoint') || text.includes('rest api')) return 'developer';
  return 'end-user';
}

// ─── Parse FAQ_MASTER.md ──────────────────────────────────────────────────────

async function parseFaqMaster() {
  console.log('\n📖 Parsing FAQ_MASTER.md...');
  const content = await fs.readFile(FAQ_MASTER_PATH, 'utf8');
  const entries = [];

  // Pattern 1: **Q: ...** / A: ... (bold Q&A format)
  const boldPattern = /\*\*Q:\s*([^*]+)\*\*\s*\nA:\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/g;
  let match;
  while ((match = boldPattern.exec(content)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim().replace(/\n/g, ' ');
    if (question.length > 10 && answer.length > 20) {
      entries.push({ question, answer });
    }
  }

  // Pattern 2: - **Q1.1 What is...** / answer on next line (FAQ playbook format)
  const playbookPattern = /- \*\*Q[\d.]+\s+([^*]+)\*\*\s*\n\s+([^\n]+(?:\n\s+[^\n]+)*)/g;
  while ((match = playbookPattern.exec(content)) !== null) {
    const question = match[1].trim().replace(/\?$/, '').trim() + '?';
    const answer = match[2].trim().replace(/\n\s+/g, ' ');
    if (question.length > 10 && answer.length > 20) {
      entries.push({ question, answer });
    }
  }

  // Pattern 3: Bullet lists with eeziPay, MobileMart etc — extract named items
  const bulletPattern = /- \*\*([^*:]+)\*\*:\s*([^\n]+)/g;
  while ((match = bulletPattern.exec(content)) !== null) {
    const label = match[1].trim();
    const value = match[2].trim();
    if (value.length > 30 && !label.startsWith('Q')) {
      const question = `What is ${label} in MyMoolah?`;
      entries.push({ question, answer: value });
    }
  }

  // De-duplicate by question similarity
  const seen = new Set();
  const unique = entries.filter(e => {
    const key = e.question.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`  ✅ Parsed ${unique.length} unique Q&A pairs from FAQ_MASTER.md`);
  return unique;
}

// ─── GPT-4o gap filling ───────────────────────────────────────────────────────

const GAP_TOPICS = [
  {
    category: 'nfc',
    topic: 'Tap to Add Money (NFC deposit feature)',
    context: `MyMoolah has a "Tap to Add Money" feature (planned/in development) that lets users add money to their wallet by tapping a bank card or using Google Pay/Apple Pay on a Halo.Go NFC device. This feature is in the Transact section. Amounts range from R50 to R10,000. The wallet is credited once the payment completes. This feature may not be available yet in all environments.`,
  },
  {
    category: 'usdc',
    topic: 'USDC / Buy Digital Currency (Cross-border via VALR)',
    context: `MyMoolah supports "Buy USDC" — a cross-border value transfer feature using VALR (FSCA-licensed CASP, FSP 53308). Users can send value internationally by converting ZAR to USDC. Travel Rule applies. Blocked countries: North Korea, Iran, Cuba, Venezuela, Syria, Russia, Belarus, Myanmar. Limits: R5,000/transaction, R15,000/day, R50,000/month. Solana addresses only. This requires VALR credentials and RMCP approval — may be pending activation.`,
  },
  {
    category: 'referral_program',
    topic: 'Referral Program — 3-level commission structure',
    context: `MyMoolah has a 3-level referral program: 5% commission on Level 1 (direct referrals), 3% on Level 2, 2% on Level 3. No monthly caps. Referral code is in the app. Earnings activate when the referred user completes their first transaction. Payouts are daily at midnight to wallet. Example: 10 direct referrals spending R1,000/month = R500 (5% of R10,000).`,
  },
  {
    category: 'payments',
    topic: 'Standard Bank PayShap Request-to-Pay (RTP and RPP)',
    context: `MyMoolah integrates with Standard Bank PayShap for Request-to-Pay (RTP) and Request Payment (RPP) flows. This uses ISO 20022 Pain.001 and Pain.013 message formats. Fee is R4 per transaction. VAS breakdown: principal + fee for RPP, principal minus fee for RTP. Reference must equal recipient's MSISDN for AML compliance. Requires OneHub/Standard Bank credentials. T-PPP (Third Party Payment Provider) registered.`,
  },
  {
    category: 'treasury',
    topic: 'White Label and Treasury Platform for Businesses',
    context: `MyMoolah offers white-label digital wallet solutions for businesses, NGOs, and government programmes. Features: branded wallet app, bulk payouts, voucher issuance, API access, reconciliation reports, float management, and multi-supplier VAS. Enterprise clients can configure custom limits, KYC tiers, and branding. MyMoolah is a T-PPP registered payment provider in South Africa.`,
  },
  {
    category: 'security',
    topic: 'POPIA, AES-256-GCM Encryption, and Data Security',
    context: `MyMoolah is POPIA compliant. ID numbers are encrypted at rest using AES-256-GCM with HMAC-SHA256 blind indexes. TLS 1.3 enforced for all API calls. JWT HS512 with short expiry. Multi-tier rate limiting. Parameterized queries prevent SQL injection. Funds are held in segregated safeguarded accounts. ISO 27001 ready architecture.`,
  },
  {
    category: 'reconciliation',
    topic: 'Automated Reconciliation and Float Management',
    context: `MyMoolah runs automated N-way reconciliation between wallet ledgers, supplier transaction logs, and bank statements. Float accounts are monitored with configurable thresholds (warning at 15%, critical at 5% above minimum). The system runs hourly checks and sends email alerts. Ledger follows double-entry accounting (DEBITS = CREDITS). All transactions are immutably logged for audit trails.`,
  },
  {
    category: 'vas',
    topic: 'Airtime, Data, Electricity, and Bill Payments via VAS suppliers',
    context: `MyMoolah VAS (Value-Added Services) includes: Airtime and Data (Flash, MobileMart, eeziAirtime), Prepaid Electricity (MobileMart with real 20-digit token extraction), Bill Payments (municipal utilities, insurance, school fees), Gaming Vouchers, and Digital Vouchers. Suppliers: Flash (167 commercial products), MobileMart (Fulcrum Switch), dtMercury. Best offer selection automatically chooses the highest commission supplier per product.`,
  },
  {
    category: 'wallet',
    topic: 'Wallet tiers, limits, and KYC requirements',
    context: `MyMoolah wallets have transaction and balance limits based on KYC tier. Unverified wallets have very low limits. Verified (KYC complete) wallets have standard limits. Higher limits may require proof of address and income. KYC status 'verified' is required for debit transactions. Wallet IDs are formatted as WAL-xxxx. Each user has one wallet by default.`,
  },
];

async function generateGptEntries(openai) {
  console.log('\n🤖 Generating additional Q&A with GPT-4o for feature gaps...');
  const all = [];

  for (const topic of GAP_TOPICS) {
    try {
      const prompt = `You are building a customer support knowledge base for MyMoolah, a South African digital wallet and treasury platform.

Topic: ${topic.topic}

Context (use ONLY this information, do not invent facts):
${topic.context}

Generate 8 realistic customer support Q&A pairs about this topic. Cover:
- What is it / how does it work
- How to use it (step by step if applicable)
- Common problems or questions
- Fees or limits if applicable
- Coming soon / pending activation status where relevant

Format as JSON array:
[
  {"question": "...", "answer": "..."},
  ...
]

Rules:
- Keep answers under 150 words
- Be warm, clear, and helpful
- If a feature is planned or pending, say "coming soon" or "pending activation"
- Never invent fees, account numbers, or regulatory facts not in the context`;

      const res = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const parsed = JSON.parse(res.choices[0].message.content);
      const entries = Array.isArray(parsed) ? parsed : parsed.entries || parsed.questions || [];

      entries.forEach(e => {
        if (e.question && e.answer) {
          all.push({ question: e.question.trim(), answer: e.answer.trim(), category: topic.category });
        }
      });

      console.log(`  ✅ ${topic.topic}: ${entries.length} Q&A pairs`);
      await new Promise(r => setTimeout(r, 500)); // Brief rate limit pause
    } catch (err) {
      console.error(`  ❌ ${topic.topic}: ${err.message}`);
    }
  }

  return all;
}

// ─── Embed entries ────────────────────────────────────────────────────────────

async function embedBatch(openai, entries) {
  console.log(`\n🔢 Generating embeddings for ${entries.length} entries...`);
  const BATCH = 20;
  for (let i = 0; i < entries.length; i += BATCH) {
    const slice = entries.slice(i, i + BATCH);
    for (const entry of slice) {
      try {
        const text = entry.question + '\n' + entry.answer.slice(0, 500);
        const res = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) });
        entry.embedding = res.data[0].embedding;
      } catch (err) {
        console.error(`  ❌ Embed failed for "${entry.question.slice(0, 40)}": ${err.message}`);
        entry.embedding = null;
      }
    }
    process.stdout.write(`  📊 ${Math.min(i + BATCH, entries.length)}/${entries.length} embedded\r`);
  }
  console.log(`\n  ✅ Embeddings done`);
}

// ─── Save to DB ───────────────────────────────────────────────────────────────

async function saveToDb(client, entries) {
  console.log(`\n💾 Saving ${entries.length} entries to UAT database (isActive=false)...`);
  let inserted = 0;
  let skipped = 0;

  for (const entry of entries) {
    const { question, answer, category, audience, embedding } = entry;
    try {
      // Skip if question already exists (case-insensitive)
      const exists = await client.query(
        `SELECT id FROM ai_knowledge_base WHERE LOWER(question) = LOWER($1) LIMIT 1`,
        [question]
      );
      if (exists.rows.length > 0) {
        skipped++;
        continue;
      }

      await client.query(
        `INSERT INTO ai_knowledge_base
          ("faqId", audience, category, question, answer, language, "isActive", embedding, "confidenceScore", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'en', false, $6, 0.80, NOW(), NOW())`,
        [
          `GEN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          audience || 'end-user',
          category,
          question,
          answer,
          embedding ? JSON.stringify(embedding) : null,
        ]
      );
      inserted++;
    } catch (err) {
      console.error(`  ❌ Insert failed for "${question.slice(0, 40)}": ${err.message}`);
    }
  }

  return { inserted, skipped };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { console.error('❌ OPENAI_API_KEY not set'); process.exit(1); }

  console.log('\n🚀 MyMoolah Knowledge Base Generator');
  console.log(`📋 Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE — will write to UAT DB'}`);
  if (clearExisting) console.log('🗑️  --clear flag: will delete existing GEN- entries first');

  const openai = new OpenAI({ apiKey });
  const client = dryRun ? null : await getUATClient();

  try {
    if (clearExisting && !dryRun) {
      console.log('\n🗑️  Clearing existing auto-generated entries (faqId LIKE GEN-%)...');
      const result = await client.query(`DELETE FROM ai_knowledge_base WHERE "faqId" LIKE 'GEN-%'`);
      console.log(`  ✅ Deleted ${result.rowCount} entries`);
    }

    // 1. Parse FAQ_MASTER.md
    const faqEntries = await parseFaqMaster();

    // 2. Generate GPT-4o entries for gaps
    const gptEntries = await generateGptEntries(openai);

    // 3. Combine and enrich with category/audience
    const allEntries = [
      ...faqEntries.map(e => ({
        ...e,
        category: detectCategory(e.question, e.answer),
        audience: detectAudience(e.question, e.answer),
      })),
      ...gptEntries.map(e => ({
        ...e,
        audience: detectAudience(e.question, e.answer),
      })),
    ];

    console.log(`\n📊 Total entries to process: ${allEntries.length}`);
    console.log(`   - From FAQ_MASTER.md: ${faqEntries.length}`);
    console.log(`   - From GPT-4o generation: ${gptEntries.length}`);

    // 4. Embed all entries
    await embedBatch(openai, allEntries);

    if (dryRun) {
      console.log('\n🔍 DRY RUN — sample of what would be inserted:');
      allEntries.slice(0, 5).forEach((e, i) => {
        console.log(`\n  [${i + 1}] Category: ${e.category} | Audience: ${e.audience}`);
        console.log(`       Q: ${e.question.slice(0, 80)}`);
        console.log(`       A: ${e.answer.slice(0, 100)}...`);
      });
      console.log(`\n✅ Dry run complete. ${allEntries.length} entries would be inserted.`);
      return;
    }

    // 5. Save to DB
    const { inserted, skipped } = await saveToDb(client, allEntries);

    // 6. Summary
    const estimatedCost = (
      (faqEntries.length * 0.00002) + // embeddings
      (gptEntries.length * 0.00002) +  // embeddings
      (GAP_TOPICS.length * 0.01)       // GPT-4o calls
    ).toFixed(2);

    console.log('\n' + '─'.repeat(60));
    console.log('✅ Knowledge Base Generation Complete');
    console.log('─'.repeat(60));
    console.log(`📊 Entries inserted:  ${inserted}`);
    console.log(`⏭️  Entries skipped:   ${skipped} (already exist)`);
    console.log(`💰 Estimated cost:    ~$${estimatedCost}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Review entries in UAT database (isActive=false)');
    console.log('   2. Set isActive=true for entries you approve');
    console.log('   3. Run: npm run embed:kb (to re-embed active entries)');
    console.log('   4. Test support bot in UAT');
    console.log('   5. Seed to Staging/Production when satisfied');
    console.log('─'.repeat(60));

  } finally {
    if (client) client.release();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
