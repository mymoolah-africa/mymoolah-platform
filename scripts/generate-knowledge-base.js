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
const forceReinsert = process.argv.includes('--force'); // Skip duplicate check, re-insert all

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
    category: 'registration',
    topic: 'MyMoolah registration, login, and getting started',
    context: `MyMoolah is a South African digital wallet. To register: open the app, provide SA mobile number, email, full name, date of birth, SA ID (green book, smart card, or temp cert) or passport (6-9 chars), and a secure password (8+ chars with letter, number, special char). Wallet ID starts with WAL-. Login uses mobile number + password. Session auto-expires after 15 minutes for security. Session tokens are in sessionStorage only (cleared when browser/tab closes).`,
  },
  {
    category: 'referral_program',
    topic: 'Referral Program — 3-level commission structure',
    context: `MyMoolah has a 3-level referral program: 5% commission on Level 1 (direct referrals), 3% on Level 2, 2% on Level 3. No monthly caps on earnings. Referral code shown in the Referral section of the app. Earnings activate when the referred user completes their first qualifying transaction. Payouts are daily at midnight directly to the referrer's wallet. Users can send SMS invites directly from the app. Dashboard shows total earnings, active referrals, and recent commissions.`,
  },
  {
    category: 'fees',
    topic: 'Wallet tiers and fee structure (Bronze, Silver, Gold)',
    context: `MyMoolah uses a 3-tier fee system. Bronze (default): Zapper payment fee 1.265% VAT-inclusive. Silver (10+ transactions, R5,000+ volume): 1.15%. Gold (25+ transactions, R15,000+ volume): 0.92%. All fees are VAT-inclusive and shown on every confirmation screen before payment. No monthly account fee for personal wallets. Cash-out fees apply per EasyPay transaction. Fees vary by channel and transaction type.`,
  },
  {
    category: 'payments',
    topic: 'PayShap Request-to-Pay, Send Money, and payment flows',
    context: `MyMoolah supports: P2P wallet-to-wallet transfers (instant), Send Money to bank accounts (EFT), PayShap Request-to-Pay using Standard Bank integration (mobile number as reference, AML requirement), QR payments via Zapper (92.3% test pass rate), and Bill Payments. PayShap uses Standard Bank as T-PPP. Failed payments release reserved funds within minutes. Wrong payments cannot be auto-reversed — contact support. Recurring payments can be scheduled where enabled.`,
  },
  {
    category: 'security',
    topic: 'Account security, fraud prevention, and POPIA compliance',
    context: `MyMoolah security: TLS 1.3 for all connections, AES-256-GCM encryption for ID numbers at rest, JWT HS512 short-lived tokens, 15-minute session timeout, multi-tier rate limiting. Support will NEVER ask for your PIN or OTP. If you suspect fraud: change password immediately, contact support to freeze wallet, notify mobile operator. POPIA compliant — data not sold to third parties. Funds held in segregated safeguarded accounts at licensed institutions.`,
  },
  {
    category: 'eezipay',
    topic: 'eeziPay voucher redemption via USSD',
    context: `eeziPay is a voucher-based airtime and data product available in the MyMoolah VAS catalog. Purchase an eeziPay voucher in the app and receive a 12-digit PIN. To redeem: dial *130*3621*3*[YOURPIN]# from the phone you want to top up. Select 1 for airtime or 2 for data from the USSD menu. Works on MTN, Vodacom, Cell C, and Telkom. One eeziPay voucher covers both airtime and data — the user chooses at USSD redemption, not at purchase. If PIN doesn't work: ensure dialling from correct number, no spaces in PIN, voucher not already redeemed.`,
  },
  {
    category: 'cash_out',
    topic: 'EasyPay cash-out at retail stores',
    context: `EasyPay cash-out lets users withdraw cash at participating retail stores: Shoprite, Checkers, Pick n Pay, Boxer, and thousands of other EasyPay-enabled outlets. In-app flow: select Cash Out, enter amount, receive a unique reference code. Present the code to the cashier. Fee is shown before confirmation. Limits apply per transaction, day, and month based on KYC level. If token fails at store: check it hasn't expired or been used, verify store accepts EasyPay, note store name/time/error and contact support.`,
  },
  {
    category: 'vas',
    topic: 'Airtime, Data, Electricity and Bill Payments (VAS)',
    context: `MyMoolah VAS includes: Airtime and Data on MTN, Vodacom, Cell C, Telkom (via Flash and MobileMart/Fulcrum Switch); Prepaid Electricity with 20-digit token sent by SMS and shown in-app; Bill Payments (municipal utilities, insurance, school fees, other billers); Gaming and Digital Vouchers via Flash and dtMercury. Best offer automatically selected from multiple suppliers. If electricity token not received: check SMS and in-app history, wait 5 minutes, then contact support with transaction reference.`,
  },
  {
    category: 'otp_help',
    topic: 'OTP issues, password reset, and login problems',
    context: `OTPs for login and verification are 6-digit codes sent via SMS. They expire after 10 minutes. Rate limit: 3 attempts before 1-hour lockout. If OTP not received: check signal, wait 60 seconds, request new one. Forgot password: tap "Forgot Password?" on login screen, enter mobile number, receive OTP, set new password (8+ chars with letter, number, special char). If mobile number is no longer accessible: contact support@mymoolah.africa with ID documents for manual re-binding. Account locks after multiple failed logins — wait 30 minutes or contact support.`,
  },
  {
    category: 'platform_overview',
    topic: 'What MyMoolah is and how it works',
    context: `MyMoolah is a South African digital wallet and treasury platform. Not a bank — funds held in segregated accounts at licensed institutions. Services: e-wallet storage, instant P2P payments, PayShap, Zapper QR payments, VAS (airtime/data/electricity/bills), EasyPay cash-out, voucher issuance and redemption, bulk employer payouts, referral program (5%/3%/2% 3-level commissions), cross-border transfers via Moolah Move (contact support to activate). Headquartered in Pretoria, South Africa. T-PPP registered. FICA/AML, POPIA, SARB/PASA compliant.`,
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

You MUST respond with ONLY a JSON object in this exact format (no other text):
{
  "qa_pairs": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ]
}

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
      // Handle any top-level key the model may use
      const entries = parsed.qa_pairs || parsed.questions || parsed.entries || parsed.items ||
        (Array.isArray(parsed) ? parsed : Object.values(parsed).find(Array.isArray) || []);

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
      // Skip if question already exists (case-insensitive), unless --force flag used
      if (!forceReinsert) {
        const exists = await client.query(
          `SELECT id FROM ai_knowledge_base WHERE LOWER(question) = LOWER($1) LIMIT 1`,
          [question]
        );
        if (exists.rows.length > 0) {
          skipped++;
          continue;
        }
      }

      // faqId must fit VARCHAR(20): GEN- (4) + base36 ts (8) + - (1) + rand (4) = 17 chars
      const faqId = `GEN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      await client.query(
        `INSERT INTO ai_knowledge_base
          ("faqId", audience, category, question, answer, language, "isActive", embedding, "confidenceScore", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'en', false, $6, 0.80, NOW(), NOW())`,
        [
          faqId,
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
