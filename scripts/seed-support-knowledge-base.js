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
    answer: 'Go to Profile → Edit Profile → tap "Change" next to your phone number. Enter the new SA mobile number and a 6-digit OTP will be sent to the NEW number via SMS. Enter the OTP within 10 minutes to confirm. You have 3 attempts. The new number cannot already be registered to another account. If you lost access to the old number, contact support with proof of ID.',
    keywords: 'change phone number, update msisdn, profile settings, otp verification',
    confidenceScore: 0.96,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.1,Q2.2,Q2.7'
  },
  {
    faqId: 'Q2.7',
    audience: 'end-user',
    category: 'password_reset',
    question: 'How do I reset my password?',
    answer: 'On the login screen tap "Forgot Password?", enter your registered mobile number, and a 6-digit OTP will be sent via SMS. Enter the OTP and your new password (minimum 8 characters with letter, number, and special character). OTPs expire after 10 minutes and you have 3 attempts. You can request up to 3 OTPs per hour. If SMS is not received, ensure your phone number is correct and wait for rate limit reset.',
    keywords: 'reset password, forgot password, otp, password recovery',
    confidenceScore: 0.97,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.6,Q10.1'
  },
  {
    faqId: 'Q2.8',
    audience: 'end-user',
    category: 'otp_help',
    question: 'I did not receive my OTP. What should I do?',
    answer: 'Check that you entered the correct phone number (SA format: 0XX XXX XXXX). Ensure your phone has signal and can receive SMS. Wait at least 1 minute before requesting a new OTP. If still not received, you may have hit the rate limit (max 3 OTPs per hour) - wait and try again later. Check if the SMS is in a spam folder. If problems persist, contact support.',
    keywords: 'otp not received, sms not received, verification code',
    confidenceScore: 0.94,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.6,Q2.7'
  },
  {
    faqId: 'Q2.9',
    audience: 'end-user',
    category: 'otp_help',
    question: 'My OTP says it is invalid or expired. Why?',
    answer: 'OTPs expire after 10 minutes from when they were sent. You have a maximum of 3 attempts per OTP - after 3 wrong entries, the OTP is invalidated. Each OTP can only be used once. Request a new OTP if yours has expired or been invalidated. Ensure you are entering the most recent OTP if you requested multiple.',
    keywords: 'otp expired, otp invalid, verification failed',
    confidenceScore: 0.93,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.7,Q2.8'
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

  // Section 9.5 – Referral Program
  {
    faqId: 'Q9.5.1',
    audience: 'end-user',
    category: 'referral_program',
    question: 'What is the MyMoolah referral program?',
    answer: 'The MyMoolah referral program lets you earn commission when people you refer make transactions. You earn 5% on direct referrals (Level 1), 3% on their referrals (Level 2), and 2% on Level 3. No monthly caps. Your referral must complete their first transaction for you to start earning.',
    keywords: 'referral program, earn commission, invite friends, mlm',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q9.5.2',
    audience: 'end-user',
    category: 'referral_program',
    question: 'How do I get my referral code?',
    answer: 'Your unique referral code is shown in the Referral section of the app. You can share it via SMS, WhatsApp, email, or any messaging platform. When someone registers using your code, they become your direct referral (Level 1).',
    keywords: 'referral code, invite link, share code',
    confidenceScore: 0.94,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q9.5.3',
    audience: 'end-user',
    category: 'referral_program',
    question: 'When do I start earning from referrals?',
    answer: 'You start earning when your referral completes their first transaction (airtime, data, voucher purchase, or QR payment). Registration alone does not activate earnings. This prevents fraud and ensures real users.',
    keywords: 'referral activation, first transaction, start earning',
    confidenceScore: 0.93,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q9.5.4',
    audience: 'end-user',
    category: 'referral_program',
    question: 'How much can I earn from the referral program?',
    answer: 'Earnings depend on transaction volume. For example, if your 10 direct referrals each spend R1,000/month, you earn R500 (5% of R10,000). With 3 levels and no caps, most active referrers earn R200-R2,000/month.',
    keywords: 'referral earnings, how much earn, commission amount',
    confidenceScore: 0.92,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q9.5.5',
    audience: 'end-user',
    category: 'referral_program',
    question: 'When do I receive my referral payouts?',
    answer: 'Referral earnings are calculated in real-time and paid out daily. You will see earnings accumulate in your Referral Earnings section, and they are deposited to your MyMoolah wallet each day at midnight.',
    keywords: 'referral payout, when paid, daily payout',
    confidenceScore: 0.93,
    language: 'en',
    isActive: true
  },

  // Section 10 – Security
  {
    faqId: 'Q10.1',
    audience: 'all',
    category: 'security',
    question: 'How does MyMoolah protect my money and data?',
    answer: 'Layers include PIN/device binding, optional biometrics, encrypted data (TLS 1.3), fraud monitoring, segregated client funds, OTP verification for sensitive actions, and POPIA-compliant data governance.',
    keywords: 'security, popia, protection, tls',
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
    faqId: 'Q11.2',
    audience: 'end-user',
    category: 'fees',
    question: 'What are the transaction fees?',
    answer: 'MyMoolah uses a tier-based fee system. Your fee depends on your tier (Bronze, Silver, Gold, Platinum) and the transaction type. For Zapper QR payments, the total fee (including the 0.40% Zapper cost) is: Bronze 1.50%, Silver 1.40%, Gold 1.20%, Platinum 1.00%. Fees are always shown on the confirmation screen before you complete the transaction.',
    keywords: 'transaction fees, tier fees, fee structure, bronze silver gold platinum',
    confidenceScore: 0.95,
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
  {
    faqId: 'Q11.4',
    audience: 'end-user',
    category: 'fees',
    question: 'How do I get lower transaction fees?',
    answer: 'Your tier determines your fees. To get lower fees, increase your monthly transaction count and value. Silver tier (10+ transactions AND R5,000+ monthly) pays R2.75, Gold (25+ transactions AND R15,000+ monthly) pays R2.50, and Platinum (50+ transactions AND R30,000+ monthly) pays R2.25. Your tier is reviewed monthly on the 1st.',
    keywords: 'lower fees, tier upgrade, silver gold platinum, reduce fees',
    confidenceScore: 0.92,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q11.5',
    audience: 'end-user',
    category: 'fees',
    question: 'What is my current tier?',
    answer: 'Your tier is based on your monthly transaction count AND monthly transaction value. Bronze (default): 1.50% total fee. Silver: 10+ transactions AND R5,000+ monthly = 1.40% fee. Gold: 25+ transactions AND R15,000+ monthly = 1.20% fee. Platinum: 50+ transactions AND R30,000+ monthly = 1.00% fee. Tiers are reviewed on the 1st of each month.',
    keywords: 'my tier, bronze silver gold platinum, tier status, current tier',
    confidenceScore: 0.93,
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
    answer: "O ka e bona bhalanse ya wallet ya hao ho dashboard kapa karolo ya wallet ya app. Bhalanse e ntjhafatswa hang ka mor'a transaction e nngwe le e nngwe.",
    keywords: 'bhalanse, sesotho, wallet',
    confidenceScore: 0.92,
    language: 'st',
    isActive: true
  },

  // OTP entries in all 11 South African languages
  // Afrikaans (af)
  {
    faqId: 'Q-OTP-AF-1',
    audience: 'end-user',
    category: 'otp_help',
    question: 'Hoe herstel ek my wagwoord?',
    answer: 'Op die aanmeldbladsy, tik "Wagwoord vergeet?", voer jou geregistreerde selfoonnommer in, en \'n 6-syfer OTP sal via SMS gestuur word. Voer die OTP en jou nuwe wagwoord in (minimum 8 karakters met letter, syfer, en spesiale karakter). OTPs verval na 10 minute en jy het 3 pogings.',
    keywords: 'wagwoord herstel, otp, afrikaans',
    confidenceScore: 0.93,
    language: 'af',
    isActive: true
  },
  // isiZulu (zu)
  {
    faqId: 'Q-OTP-ZU-1',
    audience: 'end-user',
    category: 'otp_help',
    question: 'Ngisethula kanjani iphasiwedi yami?',
    answer: 'Esikrinini sokungena, thepha "Ukhohliwe Iphasiwedi?", ufake inombolo yakho yeselula ebhalisiwe, bese i-OTP enezinombolo ezingu-6 ithunyelwa nge-SMS. Faka i-OTP nephasiwedi yakho entsha (okungenani abalingiswa abangu-8 nehlamvu, inombolo, nesimilo esikhethekile). Ama-OTP aphelelwa isikhathi ngemuva kwemizuzu eyi-10 futhi unokuphuma okuthathu.',
    keywords: 'iphasiwedi, otp, zulu',
    confidenceScore: 0.92,
    language: 'zu',
    isActive: true
  },
  // isiXhosa (xh)
  {
    faqId: 'Q-OTP-XH-1',
    audience: 'end-user',
    category: 'otp_help',
    question: 'Ndiyiseta njani iphasiwedi yam entsha?',
    answer: 'Kwiscreen yokungena, cofa "Ulibele Iphasiwedi?", ufake inombolo yakho yomnxeba ebhalisiweyo, kwaye i-OTP enamanani ama-6 iya kuthunyelwa nge-SMS. Faka i-OTP kunye nephasiwedi yakho entsha (ubuncinane izimvo ezisi-8 kunye noonobumba, inombolo, kunye nophawu olukhethekileyo). Ama-OTP aphelelwa lixesha emva kwemizuzu eli-10 kwaye unokuzama ka-3.',
    keywords: 'iphasiwedi, otp, xhosa',
    confidenceScore: 0.92,
    language: 'xh',
    isActive: true
  },
  // Sesotho (st)
  {
    faqId: 'Q-OTP-ST-1',
    audience: 'end-user',
    category: 'otp_help',
    question: 'Ke lokisa joang password ya ka?',
    answer: "Skrineng sa ho kena, tobetsa 'Lebetse Password?', kenya nomoro ya hao ya mohala e ngodisitsoeng, mme OTP e nang le dinomoro tse 6 e tla romelloa ka SMS. Kenya OTP le password ya hao e ncha (bonyane litlhaku tse 8 tse nang le tlhaku, nomoro, le letshwao le ikgethang). Li-OTP li fela ka mor'a metsotso e 10 mme o na le menyetla e 3.",
    keywords: 'password, otp, sesotho',
    confidenceScore: 0.92,
    language: 'st',
    isActive: true
  },
  // Setswana (tn)
  {
    faqId: 'Q-OTP-TN-1',
    audience: 'end-user',
    category: 'otp_help',
    question: 'Ke baakanya jang password ya me?',
    answer: "Mo sekerining sa go tsena, tobetsa 'O lebetse Password?', tsenya nomoro ya gago ya mogala e kwadisitsweng, mme OTP e nang le dinomoro di le 6 e tla romelwa ka SMS. Tsenya OTP le password ya gago e ntšha (bonnye ditlhaka di le 8 tse nang le tlhaka, nomoro, le letshwao le le kgethegileng). Di-OTP di fela morago ga metsotso e le 10 mme o na le diteko di le 3.",
    keywords: 'password, otp, setswana',
    confidenceScore: 0.92,
    language: 'tn',
    isActive: true
  },
  // Sepedi (nso)
  {
    faqId: 'Q-OTP-NSO-1',
    audience: 'end-user',
    category: 'otp_help',
    question: 'Ke lokiša bjang password ya ka?',
    answer: "Go sekirini sa go tsena, kgotla 'O lebetše Password?', tsenya nomoro ya gago ya mogala yeo e ngwadišitšwego, gomme OTP yeo e nago le dinomoro tše 6 e tla romelwa ka SMS. Tsenya OTP le password ya gago ye mpsha (bonnyane ditlhaka tše 8 tšeo di nago le tlhaka, nomoro, le leswao le le kgethegilego). Di-OTP di fela ka morago ga metsotso ye 10 gomme o na le maiteko a 3.",
    keywords: 'password, otp, sepedi',
    confidenceScore: 0.92,
    language: 'nso',
    isActive: true
  },
  // Tshivenda (ve)
  {
    faqId: 'Q-OTP-VE-1',
    audience: 'end-user',
    category: 'otp_help',
    question: 'Ndi lugiselela hani password yanga?',
    answer: "Kha sikirini ya u dzhena, putshedza 'Wo hangwa Password?', dzhenisa nomboro yau ya luṱingo yo ṅwaliswaho, nahone OTP i re na nomboro dza 6 i ḓo rumelwa nga SMS. Dzhenisa OTP na password yau ntswa (tshiṱuku tsha maipfi a 8 a re na maipfi, nomboro, na tshiga tsho khetheaho). Dzi-OTP dzi fhela nga murahu ha minetse ya 10 nahone u na milingo ya 3.",
    keywords: 'password, otp, tshivenda',
    confidenceScore: 0.92,
    language: 've',
    isActive: true
  },
  // Xitsonga (ts)
  {
    faqId: 'Q-OTP-TS-1',
    audience: 'end-user',
    category: 'otp_help',
    question: 'Ndzi lulamisa njhani password ya mina?',
    answer: "Eka xikirini xa ku nghena, cinela 'U rivele Password?', nghenisa nomboro ya wena ya riqingho leyi tsariweke, naswona OTP leyi nga na tinomboro ta 6 yi ta rhumeriwa hi SMS. Nghenisa OTP na password ya wena leyintshwa (ku antswa marito ya 8 lama nga na xiletere, nomboro, na xikombiso xo hlawuleka). Ti-OTP ti hela endzhaku ka timinete ta 10 naswona u na mikatseko ya 3.",
    keywords: 'password, otp, xitsonga',
    confidenceScore: 0.92,
    language: 'ts',
    isActive: true
  },
  // siSwati (ss)
  {
    faqId: 'Q-OTP-SS-1',
    audience: 'end-user',
    category: 'otp_help',
    question: 'Ngiyilungisa kanjani i-password yami?',
    answer: "Kusikrini sekungena, cindzetela 'Ukhohliwe i-Password?', faka inombolo yakho yelucingo lebhalisile, bese i-OTP lenetinombolo letisitfupha itfunyelwa nge-SMS. Faka i-OTP ne-password yakho lensha (lokungenani tinhlamvu letisiphohlongo letineluhlamvu, inombolo, nesitfombe lesikhetsekile). Ema-OTP aphelelwa sikhashana ngemuva kwemaminithi lali-10 futsi unematsemba lamatsatfu.",
    keywords: 'password, otp, siswati',
    confidenceScore: 0.92,
    language: 'ss',
    isActive: true
  },
  // isiNdebele (nr)
  {
    faqId: 'Q-OTP-NR-1',
    audience: 'end-user',
    category: 'otp_help',
    question: 'Ngiyilungisa njani i-password yami?',
    answer: "Ku-screen yokungena, cabanga 'Ukhohliwe i-Password?', faka inomboro yakho yefounu ebhalisiwe, bese i-OTP enetinomboro ezisithupha ithunyelwa nge-SMS. Faka i-OTP ne-password yakho entsha (okungenani izinhlamvu ezisi-8 ezinenamba, inomboro, nesimpawu esikhethekile). Ama-OTP aphelelwa isikhathi ngemva kwemizuzu eli-10 futhi unokuzama oku-3.",
    keywords: 'password, otp, isindebele',
    confidenceScore: 0.92,
    language: 'nr',
    isActive: true
  },
  // English referral and OTP entries
  {
    faqId: 'Q-REF-EN-1',
    audience: 'end-user',
    category: 'referral_program',
    question: 'How do referral levels work?',
    answer: 'Level 1 are people you directly invite. Level 2 are people invited by your Level 1 referrals. Level 3 are invited by Level 2. You earn commission at each level: 5%, 3%, 2%. This creates a network where you benefit from your referrals building their own networks.',
    keywords: 'referral levels, multi-level, network',
    confidenceScore: 0.94,
    language: 'en',
    isActive: true
  },
  {
    faqId: 'Q-OTP-EN-2',
    audience: 'end-user',
    category: 'otp_help',
    question: 'How long is an OTP valid?',
    answer: 'OTPs are valid for 10 minutes from when they were sent. After 10 minutes, the OTP expires and you must request a new one. You can request up to 3 OTPs per hour for the same phone number and action type.',
    keywords: 'otp validity, otp expiry, how long otp',
    confidenceScore: 0.95,
    language: 'en',
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
