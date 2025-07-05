# Session Decision Notes

## [2024-07-12] Wallet-First, Closed-Loop, and Mojaloop-First Strategy
- MyMoolah's urgent business requirement: launch its own wallet for individuals, and provide REST API integration for closed-loop clients (with millions of wallets/accounts) and service providers (VAS, payments) using pre-funded ledger accounts.
- All new features and integrations must use Mojaloop APIs and best practices, even for closed-loop (internal/partner) flows, to ensure future-proofing, compliance, and interoperability.
- The platform is architected as a dual-rail (closed-loop + Mojaloop) solution, with a "Mojaloop-first" policy for all transaction flows.
- Documentation updated across all key files to reflect this strategy and session decisions.

This file is a running log of key decisions, design choices, and important context made during development sessions. Update this file after each major session or decision.

---

## [2024-07-10] Initial Platform & Voucher Engine Decisions

- **Architecture:**
  - Node.js/Express backend, MySQL (Google Cloud SQL), modular structure (controllers, models, routes, services, utils)
- **Wallets:**
  - Each user has a wallet linked to a unique account number (composed of mobile, ID/passport, and a unique code)
  - Suspense account logic for unallocated deposits (e.g., wrong mobile number)
- **Vouchers:**
  - Voucher engine supports partial redemption, brand-locking (merchant/service provider), and configuration
  - Voucher value must be between 5 and 4000 (validated in controller)
  - Voucher table schema aligned with API (see `DESCRIBE vouchers;` for current columns)
- **Best Practices:**
  - All major decisions and requirements are documented in project files
  - API endpoints are tested with curl/Postman and validated for business rules
- **Next Steps:**
  - Continue to document all major decisions here for future agents/developers
  - Expand features (VAS, QR, referrals, etc.) as needed

---

## [2024-07-13] Mojaloop Integration Decision
- Decided to prioritize full Mojaloop integration for MyMoolah wallet to achieve interoperability and industry best practice.
- Action plan: Document roadmap, update requirements, and begin research and sandbox deployment.
- All major steps and findings will be documented in requirements.md and new Mojaloop integration docs as needed.

---

*Add new entries below for each session or major decision/change.*