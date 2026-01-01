/**
 * Add Referral Earnings Knowledge to AI Support Knowledge Base
 * 
 * This script adds comprehensive FAQ entries about the referral earnings system
 * to the AI support knowledge base for banking-grade support responses.
 * 
 * Usage: node scripts/add-referral-knowledge-to-ai.js
 */

require('dotenv').config();
const models = require('../models');
const SemanticEmbeddingService = require('../services/semanticEmbeddingService');

const referralKnowledgeEntries = [
  {
    audience: 'end-user',
    category: 'REFERRAL_PROGRAM',
    question: 'How do referral earnings work?',
    answer: `MyMoolah has a 4-level referral program where you earn commissions when people you refer make purchases.

**Commission Structure:**
- Level 1 (Direct referrer): 4% of MyMoolah's net commission
- Level 2: 3% of net commission
- Level 3: 2% of net commission
- Level 4: 1% of net commission

**Monthly Caps:**
- Level 1: R10,000/month maximum
- Level 2: R5,000/month maximum
- Level 3: R2,500/month maximum
- Level 4: R1,000/month maximum

**How It Works:**
1. When someone you referred makes a purchase (airtime, data, vouchers, QR payments), you earn a percentage of MyMoolah's commission
2. Earnings are calculated automatically and marked as "pending"
3. Daily payouts run at 2:00 AM SAST - all pending earnings are credited to your wallet
4. You'll see a transaction in your history: "Referral earnings payout"

**Example:**
If someone you referred buys R95 airtime, and MyMoolah earns R3.72 commission:
- Level 1 earns: 4% of R3.72 = R0.15
- Level 2 earns: 3% of R3.72 = R0.11
- Level 3 earns: 2% of R3.72 = R0.07
- Level 4 earns: 1% of R3.72 = R0.04

**Minimum:** Earnings are created for any commission ≥ R0.01.`,
    keywords: 'referral, earnings, commission, percentage, levels, payout, rewards',
    language: 'en'
  },
  {
    audience: 'end-user',
    category: 'REFERRAL_PROGRAM',
    question: 'When will I receive my referral earnings?',
    answer: `Referral earnings are paid out automatically every day at 2:00 AM SAST.

**Process:**
1. Earnings are calculated immediately when your referrals make purchases
2. Earnings are marked as "pending" until payout
3. Daily batch payout runs at 2:00 AM SAST
4. All pending earnings are credited to your wallet in one transaction
5. You'll see "Referral earnings payout" in your transaction history

**Timeline:**
- Purchase made → Earnings calculated immediately
- Earnings status: "pending"
- Next payout (2:00 AM SAST) → Earnings credited to wallet
- Earnings status: "paid"

**Transaction Details:**
- Type: Credit
- Description: "Referral earnings payout (X transactions)"
- Amount: Sum of all your pending earnings

You don't need to do anything - payouts are automatic!`,
    keywords: 'referral, earnings, payout, when, payment, automatic, daily',
    language: 'en'
  },
  {
    audience: 'end-user',
    category: 'REFERRAL_PROGRAM',
    question: 'What are the referral commission rates?',
    answer: `MyMoolah uses a 4-level referral commission structure:

**Commission Rates:**
- **Level 1 (Direct referrer)**: 4% of MyMoolah's net commission
- **Level 2**: 3% of net commission
- **Level 3**: 2% of net commission
- **Level 4**: 1% of net commission

**Important Notes:**
- Commissions are based on MyMoolah's net commission (after costs and VAT), not the purchase amount
- You only earn if the person you referred makes purchases
- Earnings are calculated automatically for all transaction types (airtime, data, vouchers, QR payments)
- Monthly caps apply per level (see monthly cap limits)

**Example Calculation:**
Purchase: R95 airtime
MyMoolah commission: R4.28 (before VAT)
After VAT (15%): R3.72 net commission

Earnings:
- Level 1: 4% × R3.72 = R0.15
- Level 2: 3% × R3.72 = R0.11
- Level 3: 2% × R3.72 = R0.07
- Level 4: 1% × R3.72 = R0.04`,
    keywords: 'referral, commission, rate, percentage, level, structure',
    language: 'en'
  },
  {
    audience: 'end-user',
    category: 'REFERRAL_PROGRAM',
    question: 'What are the monthly caps for referral earnings?',
    answer: `MyMoolah has monthly earning caps per referral level to ensure sustainable growth:

**Monthly Caps:**
- **Level 1 (Direct referrer)**: R10,000/month maximum
- **Level 2**: R5,000/month maximum
- **Level 3**: R2,500/month maximum
- **Level 4**: R1,000/month maximum

**How Caps Work:**
- Caps reset on the 1st of each month
- If you reach your cap, you won't earn more for that level until next month
- Caps are tracked separately per level (you can earn at multiple levels)
- If an earning would exceed your cap, you get the remaining amount up to the cap

**Example:**
If you're Level 1 and have earned R9,999 this month:
- New earning would be R50
- You'll receive R1 (remaining cap), not R50
- Next month, cap resets and you can earn full amounts again

**Tracking:**
Your referral stats show how much you've earned this month per level.`,
    keywords: 'referral, monthly, cap, limit, maximum, earnings, reset',
    language: 'en'
  },
  {
    audience: 'end-user',
    category: 'REFERRAL_PROGRAM',
    question: 'Why didn\'t I earn from a referral purchase?',
    answer: `There are several reasons why you might not have earned from a referral purchase:

**Common Reasons:**
1. **Referral not activated**: The person must make their first purchase to activate the referral
2. **Commission too small**: Minimum commission is R0.01 (very rare, most purchases qualify)
3. **Monthly cap reached**: You've hit your monthly cap for that level
4. **Commission allocation pending**: Commission is calculated after purchase completes (usually within seconds)

**Check Your Status:**
- Go to Referrals section in your wallet
- Check your referral stats (total earned, pending, paid)
- Look at transaction history for "Referral earnings payout" entries

**If Still Missing:**
- Wait a few minutes (commission calculation happens asynchronously)
- Check if referral is activated (first purchase required)
- Verify monthly cap hasn't been reached
- Contact support if earnings don't appear after 24 hours

**Note:** Earnings are based on MyMoolah's net commission (after costs and VAT), not the purchase amount.`,
    keywords: 'referral, earnings, missing, not earned, why, issue, problem',
    language: 'en'
  }
];

async function addReferralKnowledge() {
  try {
    console.log('🚀 Adding referral earnings knowledge to AI support knowledge base...\n');
    
    // Initialize embedding service
    const embeddingService = new SemanticEmbeddingService();
    await embeddingService.initialize();
    console.log('✅ Embedding service initialized\n');
    
    const AiKnowledgeBase = models.AiKnowledgeBase;
    let added = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const entry of referralKnowledgeEntries) {
      try {
        // Generate faqId from question hash
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(entry.question.toLowerCase()).digest('hex');
        const faqId = `KB-${hash.substring(0, 17)}`;
        
        // Generate embedding
        const embedding = await embeddingService.generateEmbedding(entry.question);
        
        // Check for existing entry
        const existing = await AiKnowledgeBase.findOne({ where: { faqId } });
        
        if (existing) {
          // Update if new answer is better
          if (entry.answer.length > existing.answer.length) {
            await existing.update({
              question: entry.question,
              answer: entry.answer,
              keywords: entry.keywords,
              embedding: embedding,
              questionEnglish: entry.question,
              updatedAt: new Date()
            });
            updated++;
            console.log(`✅ Updated: ${entry.question.substring(0, 60)}...`);
          } else {
            skipped++;
            console.log(`⏭️  Skipped (existing is better): ${entry.question.substring(0, 60)}...`);
          }
        } else {
          // Create new entry
          await AiKnowledgeBase.create({
            faqId,
            audience: entry.audience,
            category: entry.category,
            question: entry.question,
            answer: entry.answer,
            keywords: entry.keywords,
            language: entry.language,
            questionEnglish: entry.question,
            embedding: embedding,
            confidenceScore: 0.95,
            isActive: true
          });
          added++;
          console.log(`✅ Added: ${entry.question.substring(0, 60)}...`);
        }
      } catch (error) {
        console.error(`❌ Error processing "${entry.question}":`, error.message);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Added: ${added}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`\n✅ Referral knowledge added to AI support knowledge base!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (models.sequelize) {
      await models.sequelize.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  addReferralKnowledge().catch(console.error);
}

module.exports = { addReferralKnowledge };


