require('dotenv').config();

const { AiKnowledgeBase } = require('../models');

const initialKnowledgeBase = [
  // Section 1 – Platform Overview
  {
    faqId: 'Q1.1',
    audience: 'all',
    category: 'platform_overview',
    question: 'What is MyMoolah?',
    answer: 'MyMoolah is a South African digital wallet and treasury platform for storing value, sending and receiving instant payments, issuing/redeming vouchers, buying value-added services, and performing cash-outs through trusted retail partners.',
    keywords: 'what is mymoolah, overview, wallet description',
    confidenceScore: 0.96,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q1.2',
    audience: 'all',
    category: 'platform_overview',
    question: 'Is MyMoolah a bank?',
    answer: 'No. MyMoolah partners with licensed sponsor banks and regulated payment providers to hold safeguarded funds while MyMoolah powers the digital wallet, treasury, and value-added services layers.',
    keywords: 'bank, regulation, sponsor bank',
    confidenceScore: 0.94,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q1.4',
    audience: 'all',
    category: 'platform_overview',
    question: 'What services does MyMoolah provide?',
    answer: 'Wallet storage, instant transfers, salary/bulk payouts, cash-in/out at national retailers, voucher issuance/redemption, value-added services (airtime, data, electricity, gaming), bill payments, and partner-led cross-border remittances.',
    keywords: 'services, vouchers, payouts, vas',
    confidenceScore: 0.93,
    language: 'en',
    isActive: true
  },

  // Section 2 – Registration & KYC
  {
    faqId: 'Q2.1',
    audience: 'end-user',
    category: 'registration',
    question: 'Who can register for a MyMoolah wallet?',
    answer: 'Anyone 18+ with a valid South African ID or passport who accepts the Terms & Privacy Policy. Programme-specific wallets may support foreign nationals or minors subject to compliance approval.',
    keywords: 'register, eligibility, onboarding',
    confidenceScore: 0.93,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q2.2',
    audience: 'end-user',
    category: 'registration',
    question: 'What information do I need to open a wallet?',
    answer: 'Full name, date of birth, SA ID or passport number, mobile number, email, and residential address. Higher limits may require proof of address, proof of income, or employer letters in line with FICA.',
    keywords: 'open wallet, onboarding info, fica',
    confidenceScore: 0.92,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q2.3',
    audience: 'end-user',
    category: 'kyc_documents',
    question: 'Can I use my passport instead of my ID?',
    answer: 'Yes. SA passports and international passports (6–9 alphanumeric characters) are accepted. Details must match your registration information and may trigger additional checks per FICA.',
    keywords: 'passport, id, kyc documents',
    confidenceScore: 0.91,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q2.4',
    audience: 'end-user',
    category: 'kyc_help',
    question: 'How long does verification take?',
    answer: 'If documents are clear and match official sources, KYC usually completes within minutes. Blurry uploads, mismatched data, or additional AML checks can extend the process and may require manual review.',
    keywords: 'kyc duration, verification time',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q2.6',
    audience: 'end-user',
    category: 'profile_update',
    question: 'How do I change my registered phone number?',
    answer: 'Go to Profile → Security & Settings → “Update Mobile Number.” Verify your current device with an OTP, enter the new number, confirm via the second OTP, and complete any biometric/KYC prompts. If you lost access to the old number, contact support with proof of ID.',
    keywords: 'change phone number, update msisdn, profile settings',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.1,Q2.2'
  },

  // Section 3 – Wallet & Limits
  {
    faqId: 'Q3.2',
    audience: 'end-user',
    category: 'load_funds',
    question: 'How can I load money into my wallet?',
    answer: 'Use Instant Pay proxies, bank EFTs, voucher redemption, or cash-in at participating retailers using generated tokens. Available methods and fees are listed in the app.',
    keywords: 'load money, deposit, add funds',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q3.5',
    audience: 'end-user',
    category: 'balance_hold',
    question: 'Why is my balance on hold or reserved?',
    answer: 'Funds can be reserved while transactions settle, during disputes, or when risk/compliance reviews are running. Once cleared, the reserve is released or the transaction completes.',
    keywords: 'balance on hold, reserved funds, pending',
    confidenceScore: 0.88,
    language: 'en',
    isActive: true
  },

  // Section 4 – Payments & Transfers
  {
    faqId: 'Q4.5',
    audience: 'end-user',
    category: 'payment_status',
    question: 'My payment or deposit is not reflecting. What must I do?',
    answer: '“Pending” means the transaction is still processing (bank delays, risk checks, destination issues). It will complete or reverse automatically. If the state does not change within the expected window, log a ticket with the reference number.',
    keywords: 'deposit not reflecting, payment pending',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q4.7',
    audience: 'end-user',
    category: 'payment_issue',
    question: 'What happens if a payment fails?',
    answer: 'The app shows a failure. Funds are not debited—or, if reserved, they release shortly. If you notice a debit without a completed transaction, share the reference with support so we can trace it.',
    keywords: 'payment failed, debit missing',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },

  // Section 5 – Vouchers
  {
    faqId: 'Q5.1',
    audience: 'all',
    category: 'vouchers',
    question: 'What is a MyMoolah digital voucher?',
    answer: 'A secure token representing cash or a product. Vouchers can be issued individually or in bulk, delivered via SMS/email/app, and redeemed in the wallet or at participating merchants.',
    keywords: 'vouchers, token, redeem',
    confidenceScore: 0.92,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q5.4',
    audience: 'all',
    category: 'vouchers',
    question: 'Do vouchers expire?',
    answer: 'Yes. Each voucher carries an expiry date defined by the issuer. After expiry, unused value typically reverts to the issuer per the campaign terms.',
    keywords: 'voucher expiry, breakage',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },

  // Section 6 – Cash-In / Cash-Out
  {
    faqId: 'Q6.3',
    audience: 'end-user',
    category: 'cash_out_fee',
    question: 'Are there fees for cash-outs?',
    answer: 'Yes—cash-out fees depend on the amount, partner, and programme agreement. The fee is always displayed before you confirm the transaction.',
    keywords: 'withdrawal fees, cash out fee',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },

  // Section 7 – VAS
  {
    faqId: 'Q7.2',
    audience: 'end-user',
    category: 'vas_issue',
    question: 'I bought a prepaid electricity token but did not receive it.',
    answer: 'Check SMS/email/in-app history and ensure your phone has signal. If still missing, capture the reference, date/time, and amount and contact support. Once a valid token is issued, reversals are not possible.',
    keywords: 'electricity token, vas issue',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },

  // Section 8 – Bulk Payouts
  {
    faqId: 'Q8.1',
    audience: 'business',
    category: 'bulk_payouts',
    question: 'How can employers use MyMoolah for salaries or wages?',
    answer: 'Employers upload payroll files or call payout APIs to send funds into wallets or bank accounts, or issue vouchers for bonuses/relief. Detailed reports accompany every batch.',
    keywords: 'salary payout, payroll, bulk payments',
    confidenceScore: 0.91,
    language: 'en',
    isActive: true
  },

  // Section 9 – Cross-Border Remittances
  {
    faqId: 'Q9.1',
    audience: 'end-user',
    category: 'remittance',
    question: 'Which countries can I send to or receive from?',
    answer: 'Coverage depends on active remittance partners. The app lists supported corridors and payout methods (wallet, bank deposit, or foreign cash-out).',
    keywords: 'cross border, remittance countries',
    confidenceScore: 0.88,
    language: 'en',
    isActive: true
  },

  // Section 10 – Security
  {
    faqId: 'Q10.1',
    audience: 'all',
    category: 'security',
    question: 'How does MyMoolah protect my money and data?',
    answer: 'Layers include PIN/device binding, optional biometrics, encrypted data, fraud monitoring, segregated client funds, and POPIA-compliant data governance.',
    keywords: 'security, popia, protection',
    confidenceScore: 0.94,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q10.2',
    audience: 'end-user',
    category: 'security',
    question: 'What should I do if I suspect fraud or my phone is stolen?',
    answer: 'Log out of all sessions, change your PIN/password, contact support to suspend the wallet, notify your mobile network, and report the theft. Support can help review recent transactions.',
    keywords: 'fraud, stolen phone, block wallet',
    confidenceScore: 0.92,
    language: 'en',
    isActive: true
  },

  // Section 11 – Fees & Pricing
  {
    faqId: 'Q11.1',
    audience: 'end-user',
    category: 'fees',
    question: 'How do I see the fees I am paying?',
    answer: 'Every confirmation screen shows the live fee before approval, and the Fees/Tariff section in the app or onboarding pack lists programme-specific pricing.',
    keywords: 'fees, pricing, tariff',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q11.3',
    audience: 'end-user',
    category: 'fees',
    question: 'Why is my transaction fee higher than expected?',
    answer: 'Fees vary by channel, destination, partner, and promotional period. Always review the fee on the confirmation screen before accepting.',
    keywords: 'unexpected fee, higher fee',
    confidenceScore: 0.88,
    language: 'en',
    isActive: true
  },

  // Section 12 – Regulatory
  {
    faqId: 'Q12.1',
    audience: 'all',
    category: 'regulatory',
    question: 'Under which laws does MyMoolah operate?',
    answer: 'MyMoolah follows South African regulations including FICA/AML directives, POPIA for data protection, SARB/PASA payment rules, and consumer law as described in the Terms & Conditions.',
    keywords: 'law, regulation, fica, popia',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },

  // Section 13 – Developer & API
  {
    faqId: 'Q13.1',
    audience: 'developer',
    category: 'api_overview',
    question: 'Does MyMoolah provide APIs for integration?',
    answer: 'Yes—APIs exist for wallet management, payments, voucher issuance/redemption, VAS/bill-pay, and reporting. Documentation lives in docs/API_DOCUMENTATION.md and at /api/v1/docs.',
    keywords: 'api, integration, documentation',
    confidenceScore: 0.92,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q13.3',
    audience: 'developer',
    category: 'api_environment',
    question: 'Is there a sandbox or test environment?',
    answer: 'Yes. Developers can use the Codespaces/dev environment or dedicated sandbox hosts with issued credentials to simulate wallet, payment, voucher, and VAS flows.',
    keywords: 'sandbox, test environment',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },

  // Section 14 – Treasury & Settlement
  {
    faqId: 'Q14.1',
    audience: 'business',
    category: 'treasury',
    question: 'How does settlement to businesses work?',
    answer: 'Merchant/programme accounts accumulate value during the day and settle on agreed cycles (T+0/T+1/T+2) into nominated bank accounts with detailed settlement files covering gross value, fees, and adjustments.',
    keywords: 'settlement, treasury, reconciliation',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },

  // Section 15 – White-labelling
  {
    faqId: 'Q15.1',
    audience: 'business',
    category: 'white_label',
    question: 'Can MyMoolah be white-labelled?',
    answer: 'Yes. MMTP can operate as a MyMoolah-branded wallet, a white-label backend for partners, or a treasury hub behind existing customer channels.',
    keywords: 'white label, branding, programme',
    confidenceScore: 0.9,
    language: 'en',
    isActive: true
  },

  // Section 16 – Support
  {
    faqId: 'Q16.1',
    audience: 'all',
    category: 'support',
    question: 'How do I contact MyMoolah support?',
    answer: 'Use in-app Help/Chat, email support@mymoolah.africa, call +27 21 140 7030, or submit the website contact form. Hours and SLAs are communicated in-app.',
    keywords: 'contact support, help, phone number',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true
  },

  // Translated essentials
  {
    faqId: 'Q-TRAN-AF-1',
    audience: 'end-user',
    category: 'account_balance',
    question: 'Hoe kontroleer ek my beursie balans?',
    answer: 'Jy kan jou beursie balans in die dashboard of beursie afdeling van die app kontroleer. Die balans word in real-time opgedateer na elke transaksie.',
    keywords: 'balans, afrikaans, wallet balance',
    confidenceScore: 0.93,
    language: 'af',
    isActive: true
  },
  {
    faqId: 'Q-PAY-ZU-1',
    audience: 'end-user',
    category: 'payment_issue',
    question: 'Kufanele ngenzeni uma inkokhelo yehluleka?',
    answer: 'Uma inkokhelo yehluleka, bheka kuqala ibhalansi yesikhwama sakho bese uqinisekisa imininingwane yomamukeli. Uma inkinga iqhubeka, zama futhi kamuva noma uxhumane nethimba lethu lokusekela.',
    keywords: 'inkokhelo yehluleka, zulu, payment fail',
    confidenceScore: 0.92,
    language: 'zu',
    isActive: true
  },
  {
    faqId: 'Q-BAL-XH-1',
    audience: 'end-user',
    category: 'account_balance',
    question: 'Ndingayibona njani ibhalansi yesikhwama sam?',
    answer: 'Ungayibona ibhalansi yesikhwama sakho ku-dashboard okanye kwisigaba sesikhwama se-app. Ibhalansi iyabuyekezwa kwangoko emva kokuthengiselana nganye.',
    keywords: 'balansi, xhosa, wallet',
    confidenceScore: 0.92,
    language: 'xh',
    isActive: true
  },
  {
    faqId: 'Q-BAL-ST-1',
    audience: 'end-user',
    category: 'account_balance',
    question: 'Ke ka e bona jwang bhalanse ya wallet ya ka?',
    answer: 'O ka e bona bhalanse ya wallet ya hao ho dashboard kapa karolo ya wallet ya app. Bhalanse e ntjhafatswa hang ka mor’a transaction e nngwe le e nngwe.',
    keywords: 'bhalanse, sesotho, wallet',
    confidenceScore: 0.92,
    language: 'st',
    isActive: true
  }
];

async function seedSupportKnowledgeBase() {
  try {
    console.log('🌱 Seeding Support Knowledge Base...');

    await AiKnowledgeBase.destroy({ where: {} });
    console.log('✅ Cleared existing knowledge base');

    const createdEntries = await AiKnowledgeBase.bulkCreate(initialKnowledgeBase);
    console.log(`✅ Created ${createdEntries.length} knowledge base entries`);

    const languageCounts = {};
    createdEntries.forEach(entry => {
      languageCounts[entry.language] = (languageCounts[entry.language] || 0) + 1;
    });

    console.log('\n📊 Knowledge Base Summary:');
    Object.entries(languageCounts).forEach(([language, count]) => {
      console.log(`   ${language.toUpperCase()}: ${count} entries`);
    });
    console.log('\n📂 Sample FAQ IDs:');
    createdEntries.slice(0, 10).forEach(entry => {
      console.log(`   ${entry.faqId || 'N/A'} (${entry.category})`);
    });

    console.log('\n🎉 Support Knowledge Base seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding support knowledge base:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedSupportKnowledgeBase();
}

module.exports = { seedSupportKnowledgeBase };
