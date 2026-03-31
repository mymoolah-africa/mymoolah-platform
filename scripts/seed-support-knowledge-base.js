require('dotenv').config();

const path = require('path');
const { execSync } = require('child_process');

// Use Cloud SQL Proxy when DATABASE_URL points to direct IP (avoids ETIMEDOUT in Codespaces)
const dbUrl = process.env.DATABASE_URL || '';
if (dbUrl && /@(?!127\.0\.0\.1)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+/.test(dbUrl)) {
  try {
    const repoRoot = path.resolve(__dirname, '..');
    // Ensure: authenticate → start proxy → run seed (restart proxy for fresh gcloud creds)
    console.log('🔌 Ensuring Cloud SQL Proxy (authenticate → proxy → seed)...');
    try {
      execSync('pkill -f cloud-sql-proxy || true', { stdio: 'ignore', cwd: repoRoot });
    } catch (_) { /* pkill may fail if no process */ }
    execSync('./scripts/ensure-proxies-running.sh', { stdio: 'inherit', cwd: repoRoot });
    execSync('sleep 2', { stdio: 'ignore' }); // Brief settle for proxy

    const { getUATDatabaseURL } = require('./db-connection-helper');
    process.env.DATABASE_URL = getUATDatabaseURL();
    console.log('🔌 Using Cloud SQL Proxy (127.0.0.1:6543)');
  } catch (e) {
    console.error('❌ Direct DB connection will timeout from Codespaces. Start proxy first:');
    console.error('   ./scripts/ensure-proxies-running.sh');
    console.error('   Then run this script again.');
    process.exit(1);
  }
}

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

  // Section 2 – Registration, Wallet Creation & KYC

  // 2.1 – General eligibility
  {
    faqId: 'Q2.1',
    audience: 'end-user',
    category: 'registration',
    question: 'Who can register for a MyMoolah wallet?',
    answer: 'Anyone 18 years or older with a valid South African ID number or international passport who accepts the Terms of Service and Privacy Policy. Registration is available via the web app (smartphone/browser) or via USSD (feature phone). Programme-specific wallets may support foreign nationals or minors subject to compliance approval.',
    keywords: 'register, eligibility, onboarding, age, ussd, web app',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.2,Q2.2a,Q2.2b'
  },

  // 2.2 – How to create a wallet (overview)
  {
    faqId: 'Q2.2',
    audience: 'end-user',
    category: 'registration',
    question: 'How do I create a MyMoolah wallet?',
    answer: 'There are two ways to open a MyMoolah wallet: (1) USSD — dial the MyMoolah USSD shortcode from any phone (feature phone or smartphone). You will enter your first name, surname, SA ID number or passport number, and create a 5-digit USSD PIN. No internet connection is required. (2) Web App — visit wallet.mymoolah.africa on a smartphone or computer. You will register with your mobile number, email, full name, ID number, and create a password. You can then upload your ID document for higher KYC verification.',
    keywords: 'create wallet, open wallet, register, ussd, web app, how to',
    confidenceScore: 0.97,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.2a,Q2.2b,Q2.3'
  },

  // 2.2a – USSD wallet creation (step-by-step)
  {
    faqId: 'Q2.2a',
    audience: 'end-user',
    category: 'how_to',
    question: 'How do I create a wallet using USSD?',
    answer: 'Step 1: Dial the MyMoolah USSD shortcode from your phone. Step 2: Select "Open New Wallet". Step 3: Enter your first name. Step 4: Enter your surname. Step 5: Enter your SA ID number (13 digits) or international passport number (6–9 characters). The system validates the format automatically. Step 6: Create a 5-digit USSD PIN — this PIN is used to access your wallet via USSD and can also be used to log in on the web app. Step 7: Your wallet is created at KYC Tier 0 (Basic). You can make VAS purchases (airtime, data, electricity). To unlock send money, receive deposits, withdraw cash, and higher limits, upgrade your KYC by logging in to the web app and uploading your ID document.',
    keywords: 'ussd, create wallet, open wallet, feature phone, pin, step by step, how to',
    confidenceScore: 0.97,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.2,Q2.2b,Q2.3a,Q2.5'
  },

  // 2.2b – Web app wallet creation (step-by-step)
  {
    faqId: 'Q2.2b',
    audience: 'end-user',
    category: 'how_to',
    question: 'How do I create a wallet using the web app?',
    answer: 'Step 1: Visit wallet.mymoolah.africa on your smartphone or computer. Step 2: Tap "Create Wallet". Step 3: Enter your full name, SA mobile number, email address, and create a password (minimum 8 characters with a letter, number, and special character). Step 4: Enter your SA ID number or passport number and select the ID type. Step 5: Your wallet is created. Step 6: To upgrade to KYC Tier 1, upload a photo of your SA ID book, passport, valid driver\'s licence or temporary ID. Step 7: To upgrade to KYC Tier 2, also upload a proof of address (utility bill, bank statement, or municipal account less than 3 months old). Higher tiers unlock higher transaction limits and additional features.',
    keywords: 'web app, create wallet, register, smartphone, browser, password, how to',
    confidenceScore: 0.97,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.2,Q2.2a,Q2.3,Q2.3a'
  },

  // 2.3 – ID and passport acceptance
  {
    faqId: 'Q2.3',
    audience: 'end-user',
    category: 'kyc_documents',
    question: 'Can I use my passport instead of my SA ID?',
    answer: 'Yes. Both SA ID numbers (13 digits, Luhn-validated) and international passport numbers (6–9 alphanumeric characters) are accepted for registration via USSD or the web app. The system validates the format during registration. For KYC document upload (Tier 1), you can photograph either your SA ID book/card or your passport bio page.',
    keywords: 'passport, id, kyc documents, international, foreign national',
    confidenceScore: 0.93,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.2a,Q2.2b'
  },

  // 2.3a – KYC tiers explained
  {
    faqId: 'Q2.3a',
    audience: 'end-user',
    category: 'kyc_tiers',
    question: 'What are the KYC tiers and what do they mean?',
    answer: 'MyMoolah uses a 3-tier KYC system based on FICA regulations: Tier 0 (USSD Basic) — ID/passport number format-validated only, no document uploaded. Limits: R1,000 per transaction, R3,000 daily, R5,000 monthly, R3,000 max balance. Features: VAS purchases only (airtime, data, electricity). Send money, receive deposits, withdraw cash, and international transfers are not available until you upgrade. Tier 1 (ID Verified) — SA ID book, passport, driver\'s licence or temporary ID uploaded and OCR-validated via the web app. Limits: R5,000 per transaction, R5,000 daily, R25,000 monthly, R25,000 max balance. Features: VAS, receive deposits, send money, and withdraw cash. Tier 2 (Fully Verified) — ID document plus proof of address uploaded and verified via the web app. Limits: R25,000 per transaction, R50,000 daily, R100,000 monthly, R100,000 max balance. Features: All features including international remittances.',
    keywords: 'kyc tier, tier 0, tier 1, tier 2, limits, fica, verification level, what are tiers',
    confidenceScore: 0.98,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.3b,Q2.3c,Q2.2a,Q2.2b'
  },

  // 2.3b – How to upgrade KYC tier
  {
    faqId: 'Q2.3b',
    audience: 'end-user',
    category: 'how_to',
    question: 'How do I upgrade my KYC tier?',
    answer: 'To upgrade from Tier 0 to Tier 1: Log in to the web app (wallet.mymoolah.africa) using your phone number and your password or USSD PIN. Go to Profile → Identity Verification → Upload ID Document. Take a clear photo of your SA ID book, SA ID card, or passport bio page. The system verifies the document using OCR. Once approved, your tier is upgraded to Tier 1 automatically. To upgrade from Tier 1 to Tier 2: In the same Identity Verification section, upload a proof of address document (utility bill, bank statement, or municipal account dated within the last 3 months). Once verified, your tier upgrades to Tier 2 with the highest limits and all features enabled. Note: You must upload your ID first before uploading proof of address.',
    keywords: 'upgrade kyc, tier upgrade, upload id, proof of address, how to upgrade, increase limits',
    confidenceScore: 0.97,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.3a,Q2.3c,Q2.5'
  },

  // 2.3c – Why are my limits low / features restricted?
  {
    faqId: 'Q2.3c',
    audience: 'end-user',
    category: 'kyc_tiers',
    question: 'Why are my transaction limits low or why can I not send money?',
    answer: 'Your transaction limits and available features depend on your KYC verification tier. If you registered via USSD without uploading documents, you are at Tier 0 with conservative limits (R1,000 per transaction, R5,000 monthly) and cannot send money or withdraw cash. To unlock these features and increase your limits, upgrade your KYC by logging into the web app and uploading your ID document (Tier 1) and proof of address (Tier 2). Check your current tier in Profile → Identity Verification.',
    keywords: 'low limits, cannot send money, restricted, features locked, increase limits',
    confidenceScore: 0.96,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.3a,Q2.3b'
  },

  // 2.4 – Verification time
  {
    faqId: 'Q2.4',
    audience: 'end-user',
    category: 'kyc_help',
    question: 'How long does KYC verification take?',
    answer: 'For USSD registration (Tier 0), verification is instant — your ID or passport number is format-validated during registration. For web app document upload (Tier 1 and Tier 2), the system uses automated OCR to read and verify your documents. If the photo is clear and the details match, verification usually completes within minutes. Blurry uploads, mismatched data, or additional AML checks may extend the process.',
    keywords: 'kyc duration, verification time, how long, processing',
    confidenceScore: 0.93,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.3a,Q2.3b'
  },

  // 2.5 – PIN vs password
  {
    faqId: 'Q2.5',
    audience: 'end-user',
    category: 'how_to',
    question: 'What is the difference between my USSD PIN and my password?',
    answer: 'USSD PIN: A 5-digit number you create during USSD wallet registration. It is used to access your wallet via USSD on any phone (feature phone or smartphone). Your USSD PIN can also be used to log in to the web app — just enter it in the "Password or USSD PIN" field on the login screen. Password: A secure password (minimum 8 characters with a letter, number, and special character) that you create during web app registration, or when you reset your password via the "Forgot Password" flow. It is used only for web app login. If you registered via USSD and want to set a full password, use the "Forgot Password" option on the web app login screen to create one. Both your PIN (for USSD) and password (for web) can be active at the same time — changing one does not affect the other.',
    keywords: 'pin vs password, difference, ussd pin, web password, login credentials, how to log in',
    confidenceScore: 0.98,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.2a,Q2.2b,Q2.5a,Q2.7'
  },

  // 2.5a – USSD user logging into web app
  {
    faqId: 'Q2.5a',
    audience: 'end-user',
    category: 'how_to',
    question: 'I created my wallet on USSD. How do I log in to the web app?',
    answer: 'If you created your wallet via USSD, you can log in to the web app at wallet.mymoolah.africa using your mobile number and your 5-digit USSD PIN. On the login screen, enter your phone number in the "Mobile Number" field and your 5-digit PIN in the "Password or USSD PIN" field, then tap "Sign In". Once logged in, you can upload your ID document to upgrade to Tier 1, and proof of address for Tier 2. If you prefer, you can also set a full password by tapping "Forgot Password?" on the login screen and following the OTP reset process.',
    keywords: 'ussd login web app, pin login, cross channel, feature phone to smartphone, how to',
    confidenceScore: 0.98,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.5,Q2.2a,Q2.3b,Q2.7'
  },

  // 2.5b – Web app user accessing USSD
  {
    faqId: 'Q2.5b',
    audience: 'end-user',
    category: 'how_to',
    question: 'I registered on the web app. Can I also use USSD?',
    answer: 'Yes. If you registered via the web app and later want to access your wallet via USSD, simply dial the MyMoolah USSD shortcode. The system will recognise your phone number and prompt you to create a 5-digit USSD PIN. You will not need to re-verify your identity — your existing KYC tier is retained. After creating your USSD PIN, you can access your wallet from both channels.',
    keywords: 'web app to ussd, create ussd pin, existing user, cross channel',
    confidenceScore: 0.96,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.5,Q2.2b,Q2.2a'
  },

  // 2.6 – Change phone number
  {
    faqId: 'Q2.6',
    audience: 'end-user',
    category: 'how_to',
    question: 'How do I change my registered phone number?',
    answer: 'Step 1: Log in to the web app. Step 2: Go to Profile → Edit Profile. Step 3: Tap "Change" next to your phone number. Step 4: Enter your new SA mobile number. Step 5: A 6-digit OTP will be sent to the NEW number via SMS. Step 6: Enter the OTP within 10 minutes to confirm. You have 3 attempts. The new number cannot already be registered to another MyMoolah account. If you lost access to your old number and cannot log in, contact support at support@mymoolah.africa with proof of identity.',
    keywords: 'change phone number, update msisdn, profile settings, otp verification, how to',
    confidenceScore: 0.96,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.1,Q2.5,Q2.7'
  },

  // 2.7 – Reset / forgot password
  {
    faqId: 'Q2.7',
    audience: 'end-user',
    category: 'how_to',
    question: 'How do I reset my password if I forgot it?',
    answer: 'Step 1: On the web app login screen, tap "Forgot Password?". Step 2: Enter your registered mobile number. Step 3: A 6-digit OTP is sent to your phone via SMS. Step 4: Enter the OTP. Step 5: Create a new password (minimum 8 characters with at least one letter, one number, and one special character like @$!%*?&). Step 6: Confirm the password. Step 7: Tap "Reset Password". You can now sign in with your new password. OTPs expire after 10 minutes. You have 3 attempts per OTP and can request up to 3 OTPs per hour. Note: If you registered via USSD, you can still log in with your 5-digit USSD PIN — you do not need to reset your password.',
    keywords: 'reset password, forgot password, otp, password recovery, how to, change password',
    confidenceScore: 0.98,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.5,Q2.5a,Q2.8,Q10.1'
  },

  // 2.7a – Change password (already logged in)
  {
    faqId: 'Q2.7a',
    audience: 'end-user',
    category: 'how_to',
    question: 'How do I change my password while logged in?',
    answer: 'Step 1: Log in to the web app. Step 2: Go to Profile → Settings → Change Password. Step 3: Enter your current password. Step 4: Enter your new password (minimum 8 characters with letter, number, and special character). Step 5: Confirm the new password. Step 6: Tap "Change Password". Your password is updated immediately. Your USSD PIN is not affected — changing your web password does not change your USSD PIN, and vice versa.',
    keywords: 'change password, update password, logged in, profile settings, how to',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.7,Q2.5'
  },

  // 2.8 – OTP not received
  {
    faqId: 'Q2.8',
    audience: 'end-user',
    category: 'otp_help',
    question: 'I did not receive my OTP. What should I do?',
    answer: 'Check the following: (1) Verify you entered the correct phone number in SA format (0XX XXX XXXX, +27XX XXX XXXX, or 27XX XXX XXXX). (2) Ensure your phone has network signal and can receive SMS. (3) Wait at least 1 minute — SMS delivery can be delayed. (4) Check if you have hit the rate limit (maximum 3 OTPs per hour for the same action). If so, wait and try again later. (5) Some phones filter OTPs into a spam or promotions folder. If none of the above resolves the issue, contact support at support@mymoolah.africa or call +27 21 140 7030.',
    keywords: 'otp not received, sms not received, verification code, no otp',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.7,Q2.9'
  },

  // 2.9 – OTP invalid or expired
  {
    faqId: 'Q2.9',
    audience: 'end-user',
    category: 'otp_help',
    question: 'My OTP says it is invalid or expired. Why?',
    answer: 'OTPs expire 10 minutes after they are sent. You have a maximum of 3 attempts to enter the correct OTP — after 3 wrong entries, the OTP is permanently invalidated. Each OTP can only be used once. If you requested multiple OTPs, only the most recent one is valid. To fix this, tap "Didn\'t receive OTP? Try again" to request a fresh OTP. You can request up to 3 OTPs per hour.',
    keywords: 'otp expired, otp invalid, verification failed, wrong otp',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.7,Q2.8'
  },

  // 2.10 – Managing your wallet
  {
    faqId: 'Q2.10',
    audience: 'end-user',
    category: 'how_to',
    question: 'How do I manage my wallet settings and limits?',
    answer: 'Log in to the web app and go to Settings → Wallet Settings. Here you can view and adjust your daily and monthly transaction limits (within the maximum allowed by your KYC tier), enable or disable Quick Access shortcuts, and manage notification preferences. Your current KYC tier and its associated limits are shown on the settings page. To increase your maximum limits, upgrade your KYC tier by uploading the required documents in Profile → Identity Verification.',
    keywords: 'wallet settings, manage wallet, transaction limits, preferences, how to',
    confidenceScore: 0.94,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.3a,Q2.3b,Q3.2'
  },

  // 2.11 – View KYC status
  {
    faqId: 'Q2.11',
    audience: 'end-user',
    category: 'how_to',
    question: 'How do I check my KYC status and tier?',
    answer: 'Log in to the web app and go to Profile → Identity Verification. This shows your current KYC tier (0, 1, or 2), your verification status, your transaction limits (per transaction, daily, monthly, and maximum balance), and the features available at your tier. If you are below Tier 2, you will also see instructions on what document to upload next to upgrade.',
    keywords: 'kyc status, check tier, verification status, identity verification, how to',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true,
    relatedIds: 'Q2.3a,Q2.3b,Q2.3c'
  },

  // Section 3 – Wallet & Limits
  {
    faqId: 'Q3.2',
    audience: 'end-user',
    category: 'load_funds',
    question: 'How can I load money into my wallet?',
    answer: 'There are several ways to add money to your MyMoolah wallet: (1) PayShap (instant) — Send a PayShap payment to ShapID "Mymoolah@STANDARDBANK". Use your 10-digit mobile number (e.g. 0821234567) as the recipient reference so the deposit is credited to your wallet automatically. PayShap is real-time — your wallet is credited within seconds. (2) Bank EFT — Make a standard EFT to MyMoolah Treasury: Account number 272406481, Branch code 002154, Bank: Standard Bank. IMPORTANT: Use your 10-digit mobile number as the payment reference so the system can match the deposit to your wallet. EFT deposits take up to 1 business day to reflect. (3) Tap to Add Money — Tap your bank card or use Google Pay/Apple Pay at a Halo.Go device (R50–R10,000). (4) Request Money — Request a payment from another MyMoolah user. (5) Voucher redemption or cash-in at participating retailers. Note: You must be KYC Tier 1 or higher to receive deposits. Tier 0 (USSD Basic) users must first upgrade by uploading an ID document via the web app.',
    keywords: 'load money, deposit, add funds, eft, payshap, bank transfer, top up, fund wallet',
    confidenceScore: 0.98,
    language: 'en',
    isActive: true,
    relatedIds: 'Q3.2a,Q3.2b,Q3.2c,Q3.2d'
  },

  // 3.2c – EFT deposit step-by-step
  {
    faqId: 'Q3.2c',
    audience: 'end-user',
    category: 'load_funds',
    question: 'How do I deposit money into my wallet via EFT or bank transfer?',
    answer: 'To deposit money via EFT (Electronic Funds Transfer) from any South African bank: Step 1: Log in to your bank app or internet banking. Step 2: Add a new beneficiary or make a once-off payment with these details — Bank: Standard Bank, Account name: MyMoolah Treasury, Account number: 272406481, Branch code: 002154 (or use universal branch code 051001). Step 3: Enter the amount you want to deposit. Step 4: CRITICAL — In the "Reference" or "Recipient reference" field, enter your 10-digit mobile number (e.g. 0821234567). This is how the system identifies which wallet to credit. If you do not enter your mobile number as the reference, your deposit will be held in a suspense account until it can be manually allocated. Step 5: Submit the payment. EFT deposits typically reflect within 1 business day (same-day if submitted before your bank\'s cut-off time, otherwise next business day). For instant deposits, use PayShap instead.',
    keywords: 'eft, bank transfer, deposit, account number, branch code, reference, beneficiary, standard bank, how to deposit',
    confidenceScore: 0.98,
    language: 'en',
    isActive: true,
    relatedIds: 'Q3.2,Q3.2d,Q4.5'
  },

  // 3.2d – PayShap deposit step-by-step
  {
    faqId: 'Q3.2d',
    audience: 'end-user',
    category: 'load_funds',
    question: 'How do I deposit money into my wallet using PayShap?',
    answer: 'PayShap is the fastest way to deposit money into your MyMoolah wallet — it is processed in real-time (within seconds). Step 1: Open your bank app (Discovery Bank, FNB, Nedbank, Standard Bank, Absa, Capitec, or any PayShap-enabled bank). Step 2: Go to Pay or Transfer and select PayShap. Step 3: Choose "Pay ShapID". Step 4: Enter the ShapID: Mymoolah@STANDARDBANK (case-insensitive). The system will confirm the recipient as "MYMOOLAH (PTY) LTD". Step 5: Enter the amount. Step 6: In the "Recipient reference" field, enter your 10-digit mobile number (e.g. 0821234567). This is essential so the deposit is matched to your wallet. Step 7: Confirm and pay. Your wallet will be credited within seconds. PayShap is available 24/7 including weekends and public holidays. There is no delay — unlike EFT which takes up to 1 business day, PayShap deposits are instant.',
    keywords: 'payshap, shapid, instant deposit, real-time, immediate payment, mymoolah@standardbank, fast deposit, how to payshap',
    confidenceScore: 0.98,
    language: 'en',
    isActive: true,
    relatedIds: 'Q3.2,Q3.2c,Q3.2e'
  },

  // 3.2e – Why is my mobile number important as reference?
  {
    faqId: 'Q3.2e',
    audience: 'end-user',
    category: 'load_funds',
    question: 'Why must I use my mobile number as the payment reference when depositing?',
    answer: 'Your 10-digit mobile number (e.g. 0821234567) is your wallet account identifier. When you make an EFT or PayShap deposit to the MyMoolah Treasury account, the system uses the payment reference to automatically match the deposit to your wallet and credit your balance. If you forget to include your mobile number, or use an incorrect reference, the deposit will be held in a suspense account and will need to be manually allocated by the MyMoolah support team. This may cause a delay. Always double-check that your reference is your correct 10-digit mobile number before submitting the payment.',
    keywords: 'reference, mobile number, payment reference, why reference, deposit not credited, suspense, unallocated',
    confidenceScore: 0.97,
    language: 'en',
    isActive: true,
    relatedIds: 'Q3.2c,Q3.2d,Q4.5'
  },

  // 3.2f – MyMoolah banking details
  {
    faqId: 'Q3.2f',
    audience: 'end-user',
    category: 'load_funds',
    question: 'What are the MyMoolah banking details for deposits?',
    answer: 'MyMoolah Treasury Account banking details: Bank: Standard Bank. Account name: MyMoolah Treasury. Account number: 272406481. Branch code: 002154. PayShap ShapID: Mymoolah@STANDARDBANK. IMPORTANT: Always use your 10-digit mobile number as the payment reference so the deposit is automatically credited to your wallet.',
    keywords: 'banking details, account number, branch code, standard bank, treasury, deposit details, shapid, mymoolah@standardbank',
    confidenceScore: 0.99,
    language: 'en',
    isActive: true,
    relatedIds: 'Q3.2c,Q3.2d'
  },
  {
    faqId: 'Q3.2a',
    audience: 'end-user',
    category: 'tap_to_add_money',
    question: 'What is Tap to Add Money?',
    answer: 'Tap to Add Money lets you add money to your wallet by tapping your bank card or using Google Pay or Apple Pay on a device with Halo.Go. Go to Transact → Tap to Add Money, enter the amount (R50 to R10,000), then tap your card when prompted. Your wallet is credited once the payment completes.',
    keywords: 'tap to add money, nfc deposit, add funds, google pay, apple pay, halo',
    confidenceScore: 0.94,
    language: 'en',
    isActive: true,
    relatedIds: 'Q3.2,Q3.2b'
  },
  {
    faqId: 'Q3.2b',
    audience: 'end-user',
    category: 'tap_to_add_money',
    question: 'Where do I find Tap to Add Money?',
    answer: 'Tap to Add Money is in the Transact section under Payments & Transfers. You can also add it to Quick Access in Wallet Settings. Look for the card icon with "Tap to Add Money" and the description about tapping your card or using Google Pay/Apple Pay.',
    keywords: 'tap to add money, where, transact, payments',
    confidenceScore: 0.93,
    language: 'en',
    isActive: true,
    relatedIds: 'Q3.2,Q3.2a'
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

  // Section 5a – eeziPay / How To (Airtime & Data redemption)
  {
    faqId: 'Q5.5',
    audience: 'end-user',
    category: 'how_to',
    question: 'How do I redeem my eeziPay voucher?',
    answer: 'Buy your voucher in Airtime & Data → eeziAirtime. Dial *130*3621*3*YOURPIN# from the phone you want to top up. Replace YOURPIN with your 12-digit PIN. From the on-screen menu, choose airtime or a data bundle. Your network will confirm via SMS. Works on MTN, Vodacom, Cell C, and Telkom.',
    keywords: 'eeziPay, eezi, voucher, redeem, PIN, USSD, airtime, data',
    confidenceScore: 0.96,
    language: 'en',
    isActive: true,
    relatedIds: 'Q5.1,Q5.4'
  },
  {
    faqId: 'Q5.6',
    audience: 'end-user',
    category: 'how_to',
    question: 'What is the USSD code for eeziPay vouchers?',
    answer: 'Dial *130*3621*3*YOURPIN# from the phone you want to top up. Replace YOURPIN with your 12-digit PIN (no spaces when dialling). After dialling, choose airtime or data from the menu.',
    keywords: 'eeziPay, USSD, code, dial, *130*3621*3*',
    confidenceScore: 0.95,
    language: 'en',
    isActive: true,
    relatedIds: 'Q5.5'
  },
  {
    faqId: 'Q5.7',
    audience: 'end-user',
    category: 'how_to',
    question: 'My eeziPay PIN says invalid or does not work',
    answer: 'Dial from the correct phone (the SIM you want to top up). Use the full USSD: *130*3621*3*YOURPIN# with no spaces in the PIN. Each PIN is single-use. If already redeemed, it will show invalid. eeziPay vouchers are valid for 3 years. Ensure you have signal on MTN, Vodacom, Cell C, or Telkom. Contact support with your transaction reference if it still fails.',
    keywords: 'eeziPay, invalid PIN, not working, redeem failed',
    confidenceScore: 0.94,
    language: 'en',
    isActive: true,
    relatedIds: 'Q5.5'
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
  {
    faqId: 'Q11.6',
    audience: 'end-user',
    category: 'usdc_fees',
    question: 'What are the USDC send fees?',
    answer: 'USDC send (Buy USDC) has a 7.5% Transaction Fee shown in the quote and confirm screen. The fee is displayed before you complete the transfer. Recipients are credited to their wallet on file; no blockchain Tx ID is shown in the app.',
    keywords: 'usdc fee, crypto fee, buy usdc, transaction fee, 7.5',
    confidenceScore: 0.92,
    language: 'en',
    isActive: true,
    relatedIds: 'Q11.1,Q11.3'
  },

  // Section 11.5 – Transaction Details
  {
    faqId: 'Q11.5.1',
    audience: 'end-user',
    category: 'transactions',
    question: 'What does the Transaction Detail modal show?',
    answer: 'The Transaction Detail modal shows Reference (internal ID), Amount, and Status. Per banking practice, blockchain Tx IDs are not displayed. Recipients are auto-credited to their wallet on file. Use the Reference for support or disputes.',
    keywords: 'transaction detail, reference, status, blockchain, tx id',
    confidenceScore: 0.9,
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
