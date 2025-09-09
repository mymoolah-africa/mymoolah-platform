// Load environment variables
require('dotenv').config();

const { AiKnowledgeBase } = require('../models');

const initialKnowledgeBase = [
  // English Knowledge Base
  {
    category: 'account_balance',
    question: 'How do I check my wallet balance?',
    answer: 'You can check your wallet balance in the dashboard or wallet section of the app. The balance is updated in real-time after each transaction.',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true
  },
  {
    category: 'payment_issue',
    question: 'What should I do if a payment fails?',
    answer: 'If a payment fails, first check your wallet balance and verify the recipient details. If the issue persists, try again later or contact our support team.',
    confidenceScore: 0.90,
    language: 'en',
    isActive: true
  },
  {
    category: 'kyc_help',
    question: 'How long does KYC verification take?',
    answer: 'KYC verification typically takes 24-48 hours. Make sure to upload clear, valid documents to avoid delays.',
    confidenceScore: 0.85,
    language: 'en',
    isActive: true
  },
  {
    category: 'general_help',
    question: 'How do I add money to my wallet?',
    answer: 'You can add money to your wallet through various methods including bank transfers, card payments, and mobile money. Check the "Add Money" section for available options.',
    confidenceScore: 0.90,
    language: 'en',
    isActive: true
  },
  {
    category: 'transaction_status',
    question: 'What if I can\'t find my transaction?',
    answer: 'If you can\'t find a transaction, it might still be processing. Wait a few minutes and refresh the page. If the issue persists, contact support with your transaction details.',
    confidenceScore: 0.85,
    language: 'en',
    isActive: true
  },
  {
    category: 'technical_support',
    question: 'The app is not loading properly',
    answer: 'Try refreshing the page or clearing your browser cache. If the problem continues, check your internet connection or try accessing the app from a different device.',
    confidenceScore: 0.80,
    language: 'en',
    isActive: true
  },
  {
    category: 'security',
    question: 'Is my money safe?',
    answer: 'Yes, MyMoolah uses bank-grade security measures to protect your funds. All transactions are encrypted and monitored for fraud.',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true
  },

  // Afrikaans Knowledge Base
  {
    category: 'account_balance',
    question: 'Hoe kontroleer ek my beursie balans?',
    answer: 'Jy kan jou beursie balans in die dashboard of beursie afdeling van die app kontroleer. Die balans word in real-time opgedateer na elke transaksie.',
    confidenceScore: 0.95,
    language: 'af',
    isActive: true
  },
  {
    category: 'payment_issue',
    question: 'Wat moet ek doen as \'n betaling misluk?',
    answer: 'As \'n betaling misluk, kontroleer eers jou beursie balans en verifieer die ontvanger se besonderhede. As die probleem aanhou, probeer weer later of kontak ons ondersteuningspan.',
    confidenceScore: 0.90,
    language: 'af',
    isActive: true
  },

  // isiZulu Knowledge Base
  {
    category: 'account_balance',
    question: 'Ngingabheka kanjani ibhalansi yesikhwama sami?',
    answer: 'Ungabheka ibhalansi yesikhwama sakho ku-dashboard noma isigaba sesikhwama se-app. Ibhalansi iyabuyekezwa ngesikhathi sangempela ngemva kokuthengiselana ngakunye.',
    confidenceScore: 0.95,
    language: 'zu',
    isActive: true
  },
  {
    category: 'payment_issue',
    question: 'Kufanele ngenzeni uma inkokhelo yehluleka?',
    answer: 'Uma inkokhelo yehluleka, bheka kuqala ibhalansi yesikhwama sakho bese uqinisekisa imininingwane yomamukeli. Uma inkinga iqhubeka, zama futhi kamuva noma uxhumane nethimba lethu lokusekela.',
    confidenceScore: 0.90,
    language: 'zu',
    isActive: true
  },

  // isiXhosa Knowledge Base
  {
    category: 'account_balance',
    question: 'Ndingayibona njani ibhalansi yesikhwama sam?',
    answer: 'Ungayibona ibhalansi yesikhwama sakho ku-dashboard okanye kwisigaba sesikhwama se-app. Ibhalansi iyabuyekezwa ngesikhathi sangempela emva kokuthengiselana ngakunye.',
    confidenceScore: 0.95,
    language: 'xh',
    isActive: true
  },

  // Sesotho Knowledge Base
  {
    category: 'account_balance',
    question: 'Ke ka e bona jwang bhalanse ya wallet ya ka?',
    answer: 'O ka e bona bhalanse ya wallet ya hao ho dashboard kapa karolo ya wallet ya app. Bhalanse e ntshwa ka nako ya kgwebo ka mor\'a transaction e nngwe le e nngwe.',
    confidenceScore: 0.95,
    language: 'st',
    isActive: true
  }
];

async function seedSupportKnowledgeBase() {
  try {
    console.log('🌱 Seeding Support Knowledge Base...');

    // Clear existing knowledge base
    await AiKnowledgeBase.destroy({ where: {} });
    console.log('✅ Cleared existing knowledge base');

    // Insert new knowledge base entries
    const createdEntries = await AiKnowledgeBase.bulkCreate(initialKnowledgeBase);
    console.log(`✅ Created ${createdEntries.length} knowledge base entries`);

    // Log summary by language
    const languageCounts = {};
    createdEntries.forEach(entry => {
      languageCounts[entry.language] = (languageCounts[entry.language] || 0) + 1;
    });

    console.log('\n📊 Knowledge Base Summary:');
    Object.entries(languageCounts).forEach(([language, count]) => {
      console.log(`   ${language.toUpperCase()}: ${count} entries`);
    });

    console.log('\n🎉 Support Knowledge Base seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding support knowledge base:', error);
    process.exit(1);
  }
}

// Run the seeding function
if (require.main === module) {
  seedSupportKnowledgeBase();
}

module.exports = { seedSupportKnowledgeBase };
