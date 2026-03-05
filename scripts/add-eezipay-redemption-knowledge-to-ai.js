/**
 * Add eeziPay Voucher Redemption Knowledge to AI Support Knowledge Base
 *
 * This script adds How To entries for redeeming eeziPay (eeziAirtime / eeziData)
 * vouchers to the AI support knowledge base for banking-grade support responses.
 *
 * Usage: node scripts/add-eezipay-redemption-knowledge-to-ai.js
 */

require('dotenv').config();
const models = require('../models');
const SemanticEmbeddingService = require('../services/semanticEmbeddingService');

const eeziPayRedemptionEntries = [
  {
    audience: 'end-user',
    category: 'HOW_TO',
    question: 'How do I redeem my eeziPay voucher?',
    answer: `**eeziPay voucher redemption – step by step**

1. **Buy your voucher**  
   In MyMoolah, go to Airtime & Data → eeziAirtime. Enter the amount (R2–R999) and complete the purchase. You will receive a PIN.

2. **Dial from the correct phone**  
   Use the phone or SIM you want to top up. Dial the full USSD string:
   - Format: \`*130*3621*3*YOURPIN#\`
   - Example: \`*130*3621*3*176132883283#\`

3. **Choose airtime or data**  
   After dialling, the on-screen menu will ask you to choose:
   - Airtime, or  
   - A data bundle (network-specific)

4. **Confirmation**  
   Your network will send an SMS once the airtime or data has been loaded.

**Important:** The same PIN can be used for airtime or data – you choose at the menu. Works on MTN, Vodacom, Cell C, and Telkom.`,
    keywords: 'eeziPay, eezi, voucher, redeem, PIN, USSD, airtime, data',
    language: 'en'
  },
  {
    audience: 'end-user',
    category: 'HOW_TO',
    question: 'How do I use my eeziAirtime PIN?',
    answer: `**How to use your eeziAirtime PIN**

1. From the phone you want to top up, dial: \`*130*3621*3*[YOUR_PIN]#\`
2. Replace \`[YOUR_PIN]\` with the 12-digit PIN you received.
3. On the on-screen menu, choose **airtime** or **data** (data bundle).
4. Wait for your network to confirm via SMS.

The PIN works on any SA network (MTN, Vodacom, Cell C, Telkom). You can copy the full USSD string in the app for easy dialling.`,
    keywords: 'eeziAirtime, PIN, how to use, dial, USSD, top up',
    language: 'en'
  },
  {
    audience: 'end-user',
    category: 'HOW_TO',
    question: 'What is the USSD code for eeziPay vouchers?',
    answer: `**eeziPay USSD code**

Dial from the phone you want to top up:

\`*130*3621*3*[YOUR_PIN]#\`

Replace \`[YOUR_PIN]\` with your 12-digit PIN (e.g. 1761 3288 3283).

After dialling, you will see a menu to choose airtime or a data bundle. Your network will send an SMS when it is loaded.`,
    keywords: 'eeziPay, USSD, code, dial, *130*3621*3*',
    language: 'en'
  },
  {
    audience: 'end-user',
    category: 'HOW_TO',
    question: 'I bought eeziData but how do I load it?',
    answer: `**eeziData / eeziAirtime – same redemption steps**

eeziPay vouchers work for both airtime and data. Use the same process:

1. Dial \`*130*3621*3*[YOUR_PIN]#\` from the phone/SIM to top up.
2. On the menu, select **data** (or the data bundle option) instead of airtime.
3. Your network will confirm once the data is loaded.

The PIN does not distinguish between airtime and data; you choose when redeeming.`,
    keywords: 'eeziData, eezi, data, load, redeem',
    language: 'en'
  },
  {
    audience: 'end-user',
    category: 'TROUBLESHOOTING',
    question: 'My eeziPay PIN says invalid or doesn\'t work',
    answer: `**eeziPay PIN not working – what to check**

1. **Dial from the correct phone** – Use the SIM/phone you want to top up. Do not dial from another device.

2. **Include the full USSD** – Use: \`*130*3621*3*[YOUR_PIN]#\` (no spaces in the PIN when dialling).

3. **PIN not yet used** – Each PIN is single-use. If it was redeemed before, it will show as invalid.

4. **Expiry** – eeziPay vouchers are valid for 3 years. If older, it may not work.

5. **Network** – Works on MTN, Vodacom, Cell C, and Telkom. Ensure you have signal.

If it still fails, share the transaction reference from your MyMoolah history so support can trace it.`,
    keywords: 'eeziPay, invalid PIN, not working, redeem failed',
    language: 'en'
  }
];

async function addEeziPayRedemptionKnowledge() {
  try {
    console.log('🚀 Adding eeziPay voucher redemption knowledge to AI support knowledge base...\n');

    const embeddingService = new SemanticEmbeddingService();
    await embeddingService.initialize();
    console.log('✅ Embedding service initialized\n');

    const AiKnowledgeBase = models.AiKnowledgeBase;
    const crypto = require('crypto');
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const entry of eeziPayRedemptionEntries) {
      try {
        const hash = crypto.createHash('md5').update(entry.question.toLowerCase()).digest('hex');
        const faqId = `KB-EZ-${hash.substring(0, 13)}`;

        const embedding = await embeddingService.generateEmbedding(entry.question);

        const existing = await AiKnowledgeBase.findOne({ where: { faqId } });

        if (existing) {
          if (entry.answer.length > existing.answer.length) {
            await existing.update({
              question: entry.question,
              answer: entry.answer,
              keywords: entry.keywords,
              embedding,
              questionEnglish: entry.question,
              updatedAt: new Date()
            });
            updated++;
            console.log(`✅ Updated: ${entry.question.substring(0, 55)}...`);
          } else {
            skipped++;
            console.log(`⏭️  Skipped (existing): ${entry.question.substring(0, 55)}...`);
          }
        } else {
          await AiKnowledgeBase.create({
            faqId,
            audience: entry.audience,
            category: entry.category,
            question: entry.question,
            answer: entry.answer,
            keywords: entry.keywords,
            language: entry.language,
            questionEnglish: entry.question,
            embedding,
            confidenceScore: 0.95,
            isActive: true
          });
          added++;
          console.log(`✅ Added: ${entry.question.substring(0, 55)}...`);
        }
      } catch (error) {
        console.error(`❌ Error processing "${entry.question}":`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Added: ${added}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`\n✅ eeziPay redemption knowledge added to AI support knowledge base!`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (models.sequelize) {
      await models.sequelize.close();
    }
  }
}

if (require.main === module) {
  addEeziPayRedemptionKnowledge().catch(console.error);
}

module.exports = { addEeziPayRedemptionKnowledge };
