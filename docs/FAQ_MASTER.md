# MyMoolah Treasury Platform – Comprehensive FAQ Library

_Last updated: 18 November 2025_

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
A: On the login screen tap **“Forgot Password”**, enter your registered mobile number, confirm the OTP, then set a new password that meets the strength rules. If you no longer control that number, support must re-bind the account after KYC verification.

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

This FAQ will grow as we onboard more suppliers and expose additional APIs. Treat it as the single source of truth for both the customer-facing assistant and human support.

