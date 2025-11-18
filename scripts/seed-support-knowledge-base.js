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
  {
    category: 'session_security',
    question: 'Why does the app log me out when I minimise the tab or lock my phone?',
    answer: 'The wallet only stores tokens in sessionStorage. When your browser suspends or closes the tab, the session token is cleared to prevent hijacking. Re-authenticate whenever the session resumes.',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    category: 'account_password',
    question: 'How do I reset my password?',
    answer: 'Tap “Forgot Password” on the login screen, enter your registered mobile number, confirm the OTP, and choose a new password (8+ characters, letter + number + special). If you no longer control that number, contact support after passing KYC so we can re-bind the account.',
    confidenceScore: 0.92,
    language: 'en',
    isActive: true
  },
  {
    category: 'kyc_documents',
    question: 'Which documents does MyMoolah accept for KYC?',
    answer: 'We accept SA ID cards, SA green ID books, SA passports, SA driver’s licences, Temporary ID certificates, International passports, and proof of address documents (utility bill, bank statement, municipal account, insurance policy) that are less than 3 months old.',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true
  },
  {
    category: 'kyc_drivers_license',
    question: 'How do you validate South African driver’s licences?',
    answer: 'We support both “02/##########” formats and the AB123456CD licence number. OCR extracts initials + surname, reads the validity range (dd/mm/yyyy - dd/mm/yyyy), and only approves licences whose “Valid To” date is still in the future.',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    category: 'kyc_passport',
    question: 'Can international passports be used for KYC?',
    answer: 'Yes. Passport numbers must be 6–9 alphanumeric characters. For testing, user ID 1 skips the ID/passport match only for passports; all other users must match their registered ID number.',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    category: 'kyc_fallback',
    question: 'What happens if OpenAI refuses to read my ID?',
    answer: 'The KYC engine automatically falls back to Tesseract OCR whenever OpenAI refuses (e.g., “I’m sorry…”). You still receive a decision, and support only intervenes after two failed attempts.',
    confidenceScore: 0.88,
    language: 'en',
    isActive: true
  },
  {
    category: 'payments_transaction_fee',
    question: 'Why do all screens show “Transaction Fee” instead of supplier-specific wording?',
    answer: 'We standardised the UI and API so every customer-facing fee uses the label “Transaction Fee.” This avoids confusion between Zapper, PayShap, vouchers, and internal ledger fees while keeping accounting data unchanged.',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    category: 'payments_payshap',
    question: 'How does the PayShap Request Money flow work?',
    answer: 'Request Money is powered by Peach Payments. We send a Standard Bank-compliant payload that includes your MSISDN (read-only), description, and amount. When Standard Bank confirms the PayShap request we credit your wallet using the returned MSISDN.',
    confidenceScore: 0.92,
    language: 'en',
    isActive: true
  },
  {
    category: 'beneficiary_multi_account',
    question: 'Can one beneficiary hold multiple bank accounts and wallet identifiers?',
    answer: 'Yes. The unified beneficiary model links one person/entity to multiple payment methods (MyMoolah wallet, bank, mobile money) and service accounts (airtime, data, electricity). The UI shows an account selector whenever more than one account exists.',
    confidenceScore: 0.94,
    language: 'en',
    isActive: true
  },
  {
    category: 'beneficiary_payshap_reference',
    question: 'Why must the PayShap reference equal the recipient’s mobile number?',
    answer: 'Peach/Standard Bank require the destination MSISDN as the immutable reference so AML teams can trace wallet deposits. The UI enforces this and bypasses free-text references for PayShap payouts.',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    category: 'beneficiary_visibility',
    question: 'Do beneficiaries created on Airtime or Electricity pages show up in Send Money?',
    answer: 'Yes. Every beneficiary is global. Once the contact exists it is available to Send Money, Request Money, Airtime, Data, Electricity, and Bill Pay services.',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    category: 'vas_mobilemart',
    question: 'What is the status of the MobileMart (Fulcrum) integration?',
    answer: 'Product endpoints for Airtime, Data, Voucher, Bill Pay, and Utility are live on https://uat.fulcrumswitch.com. OAuth via /connect/token works, catalog sync lists all products, and 4/7 purchase types pass (voucher-based). Pinless transactions require MobileMart-issued UAT MSISDNs.',
    confidenceScore: 0.88,
    language: 'en',
    isActive: true
  },
  {
    category: 'vas_flash',
    question: 'How do Flash products work inside MyMoolah?',
    answer: 'All 167 Flash Commercial products are modelled with their exact commission tiers. The unified catalog automatically picks the supplier with the best commission per product variant and keeps Flash data synchronised in real time.',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    category: 'integrations_peach',
    question: 'What parts of Peach Payments are implemented?',
    answer: 'OAuth 2.0 authentication, PayShap RTP/RPP, Request Money, sandbox health checks, and full error handling are production-ready. The only pending step is finalising the float account before enabling production credentials.',
    confidenceScore: 0.93,
    language: 'en',
    isActive: true
  },
  {
    category: 'integrations_zapper',
    question: 'How reliable is the Zapper integration?',
    answer: 'Zapper’s UAT suite (scripts/test-zapper-uat-complete.js) passes 92.3% of critical tests, covering authentication, QR decoding, payment history, and full payment execution. Any failures include supplier error payloads so we can escalate with evidence.',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    category: 'api_base_url',
    question: 'What is the base URL and documentation path for the API?',
    answer: 'Use http://localhost:3001/api/v1 for development (staging uses the Cloud Run HTTPS URL). The OpenAPI spec lives at /api/v1/docs in every environment.',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true
  },
  {
    category: 'api_rate_limits',
    question: 'What rate limits and performance targets apply to the public API?',
    answer: '1,000 requests per hour per user, <200 ms average response, payloads up to 10 MB, and pagination capped at 100 items per page.',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    category: 'api_error_format',
    question: 'What does the standard error payload look like?',
    answer: 'All endpoints return `{"success": false, "error": { "code": "...", "message": "...", "details": [...] }}`. See /api/v1/docs for the schema and sample validation errors.',
    confidenceScore: 0.92,
    language: 'en',
    isActive: true
  },
  {
    category: 'support_ai_limit',
    question: 'How many AI answers can I request each day?',
    answer: 'FAQ answers are unlimited, but GPT-5 usage is capped at 5 responses per user over any 24-hour period to manage token costs. If the limit is reached, try again tomorrow or refine your question to match an FAQ entry.',
    confidenceScore: 0.9,
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
