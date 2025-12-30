# MyMoolah Treasury Platform – Comprehensive FAQ Library

_Last updated: 30 December 2025_

This FAQ consolidates answers from every functional area of MMTP (wallet, KYC, suppliers, APIs, and support) so that customer agents, suppliers, and integration partners share the same source of truth. Use this document before escalating to engineering. Sections are ordered by the scenarios we support most frequently.

---

## 1. Wallet & Account Experience

**Q: How do I register a new MyMoolah wallet?**  
A: Use the registration screen in the wallet app. Provide your South African mobile number (13-digit SA ID or 6‑9 character passport number accepted), email, and a banking-grade password (min 8 chars with letter + number + special). Successful registration instantly provisions a wallet (`WAL-xxxx`) and ledger account.

**Q: Why does the wallet log me out when I minimise the tab or lock my phone?**  
A: Tokens are stored in `sessionStorage` only. When the browser suspends the tab, the session token is cleared to prevent hijacking. Re-authentication is mandatory whenever the session is reactivated.

**Q: What is the inactivity timeout?**  
A: 15 minutes. Any inactive session beyond 15 minutes is revoked automatically to align with banking security practice.

**Q: How do I reset my password?**  
A: On the login screen tap **"Forgot Password?"**, enter your registered mobile number, and a 6-digit OTP will be sent via SMS. Enter the OTP and your new password (min 8 chars with letter + number + special). OTPs expire after 10 minutes and you have 3 attempts. If SMS is not received, wait 1 hour for rate limit reset. If you no longer control that number, support must re-bind the account after KYC verification.

**Q: How do I change my phone number?**  
A: Go to Profile → Edit Profile → tap "Change" next to phone number. Enter your new SA mobile number and an OTP will be sent to the NEW number. Enter the OTP to confirm ownership. The new number cannot already be registered to another account. OTPs expire after 10 minutes.

**Q: Why do demo tokens fail against the backend?**  
A: Demo tokens (prefixed `demo-token-`) are filtered out before every request. Obtain a real JWT by logging in via `/api/v1/auth/login`.

**Q: Why is my balance not reflecting instantly?**  
A: Balance refresh occurs whenever the dashboard loads or when `/api/v1/wallets/balance` completes (average 130–150 ms). If you still see stale data, hit refresh—if the transaction is pending it will appear once the supplier confirms settlement.

---

## 2. Identity, KYC & Compliance

**Q: Which documents are accepted for KYC?**  
A: SA ID card, SA green ID book, SA passport, SA driver’s licence, Temporary ID certificate, International passport, and Proof of Address (utility bill, bank statement, municipal account, insurance policy) younger than 3 months.

**Q: How does SA driver’s licence validation work?**  
A: The OCR engine supports both `02/##########` formats and the `AB123456CD` licence number. It extracts initials + surname (caps), validates that the “Valid To” date has not expired, and only relies on the expiry date (not the “Valid From” date).

**Q: Can I use an international passport only?**  
A: Yes. Passport numbers must be 6–9 alphanumeric characters. For user ID 1 (test harness) the ID/passport match is skipped only when testing passports; all other users must match their registered ID.

**Q: What happens if OpenAI refuses to read my ID?**  
A: The KYC service automatically falls back to Tesseract OCR. OpenAI refusal patterns (“I’m sorry…”) now trigger the fallback before JSON parsing, so there is no downtime even if the model declines the document.

**Q: How many OCR retries do I get?**  
A: Two automated retries (OpenAI + fallback). On the third failure the record is queued for manual review and support receives an alert (`KYC_MANUAL_REVIEW`).

**Q: What KYC status blocks debit transactions?**  
A: Any wallet where `kycVerified=false` cannot perform debit transactions. The middleware returns `KYC_VERIFICATION_REQUIRED`.

---

## 3. Payments, Transfers & Fees

**Q: How are transaction fees displayed?**  
A: Every UI and API now uses the neutral label **“Transaction Fee”** regardless of supplier. Zapper, PayShap, vouchers, and internal ledger entries all surface the same wording for consistency.

**Q: How does PayShap “Request Money” work?**  
A: The Request Money flow uses Peach Payments’ PayShap integration. We send a Standard Bank-compliant payload that includes the requester’s MSISDN (auto-populated and read-only) plus a user-provided description. Standard Bank returns the MSISDN in the success payload so MMTP can credit the correct wallet.

**Q: Can I send money to both wallets and bank accounts from one beneficiary?**  
A: Yes. The unified beneficiary architecture lets one contact store multiple payment methods (MyMoolah wallet, bank account, mobile money) plus service accounts (airtime, data, electricity, billers). When multiple accounts exist, the UI shows an account selector and remembers the default.

**Q: What if a Zapper QR payment fails?**  
A: The QR page shows supplier-side errors immediately. If the code cannot be decoded or the Zapper token expired, we surface the Zapper error payload. For repeat failures capture the QR screenshot and run `scripts/test-zapper-uat-complete.js` to confirm the integration status.

**Q: Why are the “Transaction Fee” entries hidden from my history?**  
A: Internal ledger movements (VAT, revenue, float credits) are filtered server-side so customers only see customer-facing entries. All records still exist in the database for reconciliation.

---

## 4. Beneficiaries & Contacts

**Q: Why did we redesign beneficiaries?**  
A: Banking-grade compliance requires a single beneficiary per person/entity with multiple linked accounts. The new model enforces `(userId + msisdn)` uniqueness, stores each payment method or service account in normalized tables, and mirrors legacy JSONB fields for backward compatibility.

**Q: How do I add multiple bank accounts for the same person?**  
A: Edit the beneficiary → “Add Account” → choose **Bank**. Provide bank name, account number (8–12 digits), account type, branch code, and toggle “Default” if desired. Repeat for each account; the dropdown will show them all.

**Q: Why must PayShap references equal the recipient’s mobile number?**  
A: Peach/Standard Bank require the recipient MSISDN as the immutable reference for wallet deposits to satisfy AML tracing. The UI enforces this and bypasses arbitrary references for PayShap payouts.

**Q: Can beneficiaries created on Airtime/Data show inside Send Money?**  
A: Yes. Every beneficiary is global—creating one on Airtime/Data or Electricity automatically exposes it under Send Money and Request Money once the relevant account types exist.

---

## 5. Value-Added Services & Supplier Integrations

### Flash & Product Catalog
- **Scope**: All 167 Flash Commercial products are modelled with exact commission tiers.
- **Selection**: Automatic supplier selection chooses the best commission per product variant.
- **Synchronization**: Real-time catalog sync keeps Flash, MobileMart, dtMercury, and Peach catalogs unified.

### MobileMart (Fulcrum Switch)
- **Status**: UAT product endpoints for Airtime, Data, Voucher, Bill Pay, and Utility are live (`https://uat.fulcrumswitch.com`).
- **Purchases**: 4/7 purchase types pass (voucher-based). Pinless products require valid UAT MSISDNs supplied by MobileMart.
- **Auth**: OAuth via `/connect/token`. API path pattern `/v1/{vasType}/products`.

### Peach Payments
- **Coverage**: OAuth 2.0 authentication, PayShap Request-to-Pay (RTP) and Request Payment (RPP), Request Money, and error handling.
- **Status**: Sandbox is 100% passing; production rollout pending float account setup.
- **Compliance**: PCI DSS aligned and ready for production once float funding is finalised.

### Zapper
- **Coverage**: Complete UAT suite (92.3% pass) covering authentication, QR decoding, payment history, and end-to-end payment execution.
- **Frontend**: QR page is live; modal labels use the standard “Transaction Fee.”
- **Documentation**: See `docs/ZAPPER_UAT_TEST_REPORT.md` for the detailed plan.

### dtMercury & Vouchers
- **Usage**: Additional supplier for voucher inventory. Catalog metadata flows through the same unified product architecture used by Flash/MobileMart.

---

## 6. API & Developer FAQ

**Q: What is the base API URL?**  
A: Development: `http://localhost:3001/api/v1`. Staging/Cloud Run exposes the same `/api/v1` prefix behind HTTPS.

**Q: Where is the OpenAPI spec?**  
A: Visit `/api/v1/docs` on any environment.

**Q: What authentication is required?**  
A: JWT (HS512) short-lived tokens. Obtain via `POST /api/v1/auth/login` with the user’s mobile number and password.

**Q: What are the API rate limits?**  
A: 1,000 requests/hour per user, <200 ms average response target, max 10 MB payload, pagination capped at 100 items/page.

**Q: What does the standard error payload look like?**  
A:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "phone_number",
        "message": "Phone number must be valid South African format"
      }
    ]
  }
}
```

**Q: Which health endpoints are available?**  
A: `GET /api/v1/health`, `GET /api/v1/status`, plus supplier-specific checks (Peach, Zapper, MobileMart) exposed through their respective service scripts.

**Q: Where do I find the admin portal (MMAP)?**  
A: Portal backend listens on port 3002 and frontend on 3003. It ships with its own authentication and mimics the wallet design system.

---

## 7. Supplier & Merchant Support

**Q: How do suppliers onboard to MobileMart Fulcrum?**  
A: Provide OAuth credentials, configure the base URL (`https://uat.fulcrumswitch.com` for UAT), and share UAT MSISDNs for pinless tests. Our catalog sync script ingests their product feed automatically once credentials are active.

**Q: How can merchants reconcile Zapper transactions?**  
A: Use the organization payment history endpoint exposed by ZapperService or run `scripts/test-zapper-uat-complete.js` to pull the latest settlement batch. History includes org-level and customer-level lookups.

**Q: What data privacy commitments exist for suppliers?**  
A: All supplier integrations run through HTTPS with TLS 1.3, JWT-based service authentication (where supported), and audit logs tagged per supplier. Sensitive credentials are stored in Google Secret Manager for staging/production.

---

## 8. Support & AI Assistant

**Q: How does the new FAQ-powered assistant work?**  
A: The support service first searches the `ai_knowledge_base` table (seeded from this FAQ). Only if no match exists does it invoke GPT‑5.

**Q: Is there a limit on AI responses?**  
A: Yes. To control token spend, each user receives up to **5 GPT‑backed answers per 24-hour rolling window**. FAQ responses do not count toward this limit.

**Q: Can we add new FAQ entries?**  
A: Yes. Update `docs/FAQ_MASTER.md`, then run `node scripts/seed-support-knowledge-base.js` to refresh the DB. The assistant will immediately start using the new entries.

**Q: Where do I report missing or inaccurate answers?**  
A: Log an issue in `docs/agent_handover.md` under “Next Steps” or create a GitHub issue tagged `support-faq`. Always include the question asked and the expected authoritative answer.

---

## Extended Programme & Integration FAQ (Q1 – Q16)

The following sections mirror the structure requested in the MMTP FAQ playbook (Q1–Q16). Each answer has been aligned with the current MyMoolah architecture, suppliers, and regulatory posture.

### Section 1 – Platform Overview
- **Q1.1 What is MyMoolah?**  
  MyMoolah is a South African digital wallet and treasury platform for storing value, sending/receiving instant payments, buying value-added services, issuing/redeming vouchers, paying bills, and performing controlled cash-outs. Individuals, merchants, NGOs, and enterprises can all consume the same secure rails.
- **Q1.2 Is MyMoolah a bank?**  
  No. MyMoolah partners with licensed sponsor banks and regulated payment providers for settlement. Wallet balances are safeguarded in segregated accounts; MyMoolah orchestrates treasury, compliance, and user experience but is not a deposit-taking bank.
- **Q1.3 Where is MyMoolah based?**  
  Headquarters: Block A, Erasmus Forum, 434 Rigel Ave South, Erasmusrand, Pretoria, 0181, South Africa.
- **Q1.4 What services does MyMoolah provide?**  
  E-wallet storage, instant payments, voucher issuance/redemption, cash-in/out via national retail networks, salary/wage disbursements, VAS sales (airtime, data, electricity, gaming, vouchers), bill payments, and cross-border remittances via partners.
- **Q1.5 Who uses MyMoolah?**  
  Everyday consumers, employers paying staff or gig workers, fintechs/retailers/insurers needing white-label wallets or vouchers, NGOs/government programmes managing stipends, and remittance operators needing payout rails.
- **Q1.6 How is this different from a bank account?**  
  It is an e-wallet optimised for instant transfers, vouchers, and retail cash-outs. There are no cheque books, overdraft, or branch services; onboarding is 100% digital and focused on mobile/web flows.

### Section 2 – Registration, Onboarding & KYC
- **Q2.1 Who can register?**  
  Anyone 18+ with a valid SA ID or passport who accepts the Terms & Privacy Policy. Programme-specific rules may allow limited wallets for foreign nationals or minors subject to compliance approval.
- **Q2.2 What information is required?**  
  Full name, date of birth, SA ID/passport number, mobile, email, residential address, and proof of address when higher limits apply.
- **Q2.3 Why do you collect IDs?**  
  FICA/AML regulations require identity verification, sanctions screening, and fraud checks to keep the ecosystem safe.
- **Q2.4 How long does verification take?**  
  Usually minutes when OCR and data sources align. Blurry/expired docs or mismatched data trigger manual review and may take longer.
- **Q2.5 My KYC was rejected; now what?**  
  Inspect the in-app reason, re-upload clear/valid docs, ensure details match official records. If still blocked, contact support with high-resolution scans for manual review.
- **Q2.6 Can I change my personal details later?**  
  Email, MSISDN, and address can be self-serviced. ID number, names, or birth date require official supporting documents and may trigger full re-verification.

### Section 3 – Wallet Accounts, Balances & Limits
- **Q3.1 What balances exist?**  
  Main wallet, reserved/locked balances (pending payouts, escrow), voucher pots, and merchant settlement balances depending on role.
- **Q3.2 How do I load funds?**  
  Instant Pay (proxy-linked account), EFT, voucher redemption, and cash-in tokens at retail partners. Active methods and fees are shown in-app.
- **Q3.3 Are there limits?**  
  Yes—per transaction, per day, per month, and overall balances. Limits depend on KYC tier, regulatory rules, and programme risk profiles.
- **Q3.4 Do I earn interest?**  
  No. Wallet value is for payments/transactions and is not marketed as an interest-bearing savings product.
- **Q3.5 Why is my balance on hold?**  
  Causes include pending transactions, disputes/chargebacks, or risk/compliance reviews. Support can advise, but not every trigger is disclosed for security reasons.

### Section 4 – Payments & Transfers
- **Q4.1 Which payment types are supported?**  
  P2P, P2B/B2B instant payments, EFTs, QR/token merchant payments, salary/bulk payouts, bill payments, and supported cross-border corridors.
- **Q4.2 What is an instant payment?**  
  A real-time rail where funds reflect within seconds (once approved) instead of batched EFT timelines.
- **Q4.3 EFT vs instant payment?**  
  EFT uses traditional bank settlement with cut-off times; instant uses real-time rails and typically costs more but reflects immediately.
- **Q4.4 Can I schedule/recurring?**  
  Where enabled, beneficiaries can be saved and recurring schedules configured via dashboard/API (e.g., monthly bills, payroll).
- **Q4.5 Why is my instant payment pending?**  
  Could be network delays, destination unresponsive, or risk review. It will finish as success or fail/refund once resolved.
- **Q4.6 I paid the wrong account; can I reverse it?**  
  Once successful, funds can’t be clawed back automatically. Contact the recipient and lodge a dispute; success depends on cooperation and banking rules.
- **Q4.7 Payment failed—what now?**  
  The app shows a failure. No funds are deducted (reserved funds release shortly). If deduction without record occurs, send support the reference for investigation.

### Section 5 – Digital Vouchers
- **Q5.1 What are MyMoolah vouchers?**  
  Secure tokens representing cash or specific products, deliverable via SMS/email/in-app and redeemable at participating outlets or within the wallet.
- **Q5.2 How are vouchers issued?**  
  Via dashboard (single) or API/bulk uploads for campaigns. Delivery methods include SMS/email, in-app allocation, or exported lists.
- **Q5.3 Where can I redeem?**  
  Inside the wallet, at listed national retailers/spaza networks, or specific VAS/billers per voucher type. The voucher terms list allowed merchants.
- **Q5.4 Do vouchers expire?**  
  Yes—expiry is defined by the issuer/programme. After expiry, remaining value typically reverts to the issuer (subject to consumer law).
- **Q5.5 Lost my voucher?**  
  If unused, support can search by phone/email/ID and resend. If redeemed, it cannot be reissued.

### Section 6 – Cash-In / Cash-Out & Retail Networks
- **Q6.1 How do cash-outs work?**  
  Generate a token/QR in the app, visit a partner store, present the code (and ID if required), and receive cash once the POS validates the token.
- **Q6.2 Where can I withdraw?**  
  At participating national retailers and informal merchant networks listed under “Trusted Service Providers” in the app.
- **Q6.3 Are there fees?**  
  Yes—fees depend on amount, partner, and programme rules. Fees are shown before confirmation.
- **Q6.4 Token failing at store?**  
  Ensure it hasn’t expired or been used, verify the store is authorised, and amounts match. If it still fails, note the token number, store, time, and POS error and contact support.

### Section 7 – Value-Added Services (VAS) & Bill Payments
- **Q7.1 What can I buy?**  
  Airtime/data, prepaid electricity/water, gaming vouchers, streaming credits, and other digital products shown in the catalog.
- **Q7.2 Didn’t receive my electricity token?**  
  Check SMS/email/in-app history. If still missing, capture the transaction reference and contact support; once a valid token is issued it cannot be reversed.
- **Q7.3 Which bills can I pay?**  
  Municipal utilities, insurance, school fees, and other billers exposed in the bill-pay list. Availability varies per programme.
- **Q7.4 Can I schedule bill payments?**  
  If enabled, you can set recurring payments or reminders. If the option isn’t visible, it isn’t yet enabled for your profile.

### Section 8 – Wages, Salary Remittances & Bulk Payouts
- **Q8.1 Employer payouts?**  
  Employers can upload payroll files or use APIs to push funds into wallets/bank accounts, or issue vouchers for incentives/relief.
- **Q8.2 Paying unbanked staff?**  
  Yes—funds settle into wallets which staff can spend on VAS/bills, cash-out at retailers, or transfer via remittance partners.
- **Q8.3 How do I reconcile bulk runs?**  
  Use dashboard/API reports showing per-beneficiary status, totals per batch/channel, and detailed error logs for failures.

### Section 9 – Cross-Border Remittances
- **Q9.1 Supported countries?**  
  Depends on active partner corridors. The app lists current send/receive countries and payout options (wallet, bank, foreign agents).
- **Q9.2 FX rates and fees?**  
  Displayed prior to confirmation, based on market FX plus a margin. Rates vary per corridor/amount/payout method.
- **Q9.3 How long do transfers take?**  
  Near real-time for many corridors; others can take a few hours up to a business day subject to AML checks and destination systems.

### Section 10 – Security, Fraud & Privacy
- **Q10.1 How is my money protected?**  
  Multi-factor auth, encrypted data, fraud monitoring, segregated client funds, and strict access controls. POPIA compliance enforced.
- **Q10.2 Suspect fraud or lost phone?**  
  Change your PIN/password, log out remotely, contact support to block the wallet, notify your mobile network, and file a case if needed.
- **Q10.3 Will support ever ask for my PIN/OTP?**  
  Never. Any request for PIN, OTP, or full card details is fraudulent; report it immediately.
- **Q10.4 Privacy commitments?**  
  Governed by Terms & Privacy Policy in line with POPIA and contractual obligations. Data is only used as permitted.

### Section 11 – Fees & Pricing
- **Q11.1 How do I see fees?**  
  Every transaction confirmation screen shows the live fee. A tariff sheet or Fees section is available per programme.
- **Q11.2 Monthly account fees?**  
  Depends on programme—some have zero monthly costs, others levy subscriptions or sponsor-paid fees. Refer to your onboarding pack.
- **Q11.3 Why is my fee higher than expected?**  
  Fees vary by channel, destination, partner, and promotional period. Always review the live fee before approving.

### Section 12 – Regulatory, Legal & Governance
- **Q12.1 Which laws apply?**  
  FICA/AML rules, POPIA, SARB/PASA payment directives, and consumer/contract law as specified in the Terms & Conditions.
- **Q12.2 Where are the Terms & Privacy Policy?**  
  Accessible via the website and inside the app under Help/Legal.
- **Q12.3 How are disputes handled?**  
  Log a complaint via in-app/email/call centre; MMTP investigates per SLA. If unresolved, escalate as described in the Terms (e.g., ombud/regulator for relevant products).

### Section 13 – Developer & Integration FAQs
- **Q13.1 Are APIs available?**  
  Yes, for wallet creation, payments, voucher issuance, VAS/bill-pay, and reporting. Base URLs/auth are documented in `docs/API_DOCUMENTATION.md`.
- **Q13.2 How do developers authenticate?**  
  Via issued API keys or tokens tied to each environment. Keep credentials secret and follow the authentication section of the docs.
- **Q13.3 Is there a sandbox?**  
  Yes—use the Codespaces/dev environment or dedicated sandbox endpoints for automated testing.
- **Q13.4 Webhooks/callbacks?**  
  Asynchronous events (payout completion, voucher redemption, bill-pay status) post to HTTPS endpoints you configure; verify signatures/shared secrets.
- **Q13.5 Rate limits & performance?**  
  Limits depend on product tier but default to 1,000 requests/hour per user with 99.9% uptime targets. SLAs specify maintenance and incident processes.
- **Q13.6 Error handling & idempotency?**  
  All APIs return structured error codes. Use idempotency keys on financial operations and implement safe retries with exponential backoff.

### Section 14 – Treasury, Settlement & Reconciliation
- **Q14.1 How does settlement work?**  
  Merchant/programme accounts accumulate value and settle on agreed cycles (T+0/T+1/T+2) into nominated bank accounts or master wallets, accompanied by detailed settlement files.
- **Q14.2 How are client funds safeguarded?**  
  Funds sit in segregated sponsor-bank accounts, reconciled daily between ledger, bank, and partner networks, and audited regularly.
- **Q14.3 Reconciling with GL/ERP?**  
  Pull transaction/settlement reports via dashboard or API, map transaction codes to GL accounts, and investigate breaks using event logs and bank statements.

### Section 15 – White-Labelling & Programme Configuration
- **Q15.1 Can MMTP be white-labelled?**  
  Yes—MyMoolah can run as a MyMoolah-branded wallet, a white-label backend, or a treasury hub behind another front end.
- **Q15.2 What can be configured?**  
  Onboarding flows, KYC tiers, limits, rails, voucher types, VAS catalog, fee structures, settlement rules, and UX/branding per programme.

### Section 16 – Support Channels & Operational FAQs
- **Q16.1 Contacting support?**  
  Use in-app chat, email support@mymoolah.africa, call +27 21 140 7030, or submit the website form. Hours/SLAs are published in-app.
- **Q16.2 What info should a ticket include?**  
  Full name, registered MSISDN, transaction references/dates/amounts, screenshots or till slips, and a clear description of the issue.
- **Q16.3 How long do resolutions take?**  
  Depends on complexity, partner involvement, and regulatory reviews. Support acknowledges promptly and updates according to internal SLAs.

---

This FAQ will continue to expand as new suppliers, features, and regulatory requirements go live. Update this file and re-seed the knowledge base whenever a new category or answer is introduced.

