# MyMoolah Project Onboarding Guide

## [2024-07-12] Wallet-First, Closed-Loop, and Mojaloop-First Strategy
- MyMoolah's urgent business requirement: launch its own wallet for individuals, and provide REST API integration for closed-loop clients (with millions of wallets/accounts) and service providers (VAS, payments) using pre-funded ledger accounts.
- All new features and integrations must use Mojaloop APIs and best practices, even for closed-loop (internal/partner) flows, to ensure future-proofing, compliance, and interoperability.
- The platform is architected as a dual-rail (closed-loop + Mojaloop) solution, with a "Mojaloop-first" policy for all transaction flows.
- Documentation updated across all key files to reflect this strategy and session decisions.

Welcome to the MyMoolah platform! This guide will help you get started as a developer or contributor.

---

## Project Overview

MyMoolah is a Mojaloop-inspired, modular banking and wallet platform for Africa, built with Node.js/Express and PostgreSQL (Google Cloud SQL). The project is API-driven, cloud-native, and designed for security, compliance, and extensibility.

---

## Getting Started

### 1. Codespaces Setup (Recommended)

- Use GitHub Codespaces for a consistent, cloud-based development environment.
- Open the repository in Codespaces from GitHub.
- All dependencies and environment setup are managed in Codespaces.

### 2. Local Development (Optional)

- Clone the repository:
  ```bash
  git clone <your-repo-url>
  cd mymoolah
  ```
- Install dependencies:
  ```bash
  npm install
  ```
- Start the Cloud SQL Auth Proxy in a separate terminal (keep it running):
  ```bash
  ./bin/cloud-sql-proxy --address 127.0.0.1 --port 5433 mymoolah-db:africa-south1:mmtp-pg
  ```
- Create a backend `.env` file:
  ```env
  DATABASE_URL=postgres://mymoolah_app:<PASSWORD>@127.0.0.1:5433/mymoolah
  DB_DIALECT=postgres
  PORT=3001
  ```
- Start the server:
  ```bash
  npm start
  ```

---

## Key Files & Folders

- `server.js` – Main Express app entry point
- `config/config.json` – Sequelize/Postgres configuration
- `routes/` – API route definitions
- `controllers/` – Business logic for each resource
- `models/` – Database models and schema logic
- `docs/` – Project documentation (requirements, onboarding, session notes)
- `.env` – Environment variables (never commit this file)
- `package.json` – Project dependencies and scripts

---

## Git & Workflow

- Local-first workflow is supported. André primarily works on his Mac in `/Users/andremacbookpro/mymoolah`.
- Before starting work (Mac):
  ```bash
  cd /Users/andremacbookpro/mymoolah && npm run sync:pull
  ```
- After making changes and testing (Mac):
  ```bash
  cd /Users/andremacbookpro/mymoolah && npm run sync:local
  # open the printed PR link and merge to main
  ```
- See `docs/git-sync-workflow.md` for the full playbook.

### Voucher lifecycle quick facts (Aug 11, 2025)
- EasyPay (14 digits): display/settlement only; cannot be redeemed
- Settlement callback converts to MMVoucher (16 digits), status=active, balance=originalAmount, 12‑month expiry
- Redemption requires 16‑digit MMVoucher code
- Use backup branches before major changes.
- Keep documentation up to date after each session or major change.

---

## Documentation

- Main docs: `README.md`, `docs/requirements.md`, `docs/session-summary.md`, `docs/PROJECT_ONBOARDING.md`
- API reference: `openapi.yaml` and published docs at [https://mymoolah-africa.github.io/mymoolah-platform/](https://mymoolah-africa.github.io/mymoolah-platform/)
- Session logs: `docs/session-summary.md`
- Handover: `AGENT_HANDOVER.md`

---

## Support

- For questions, see the `docs/` folder or contact the project maintainer.

---

**Welcome to the team! Please read all referenced docs for full context.**

### Implemented Endpoints (as of June 2025)
- **Wallets:** Create, get details, get balance, credit, debit, list transactions
- **Vouchers:** Issue, redeem, list
- **KYC:** Upload document, get status
- **Notifications:** Create, list for user, mark as read
- **Support:** Create ticket, list tickets for user

---

Infrastructure & Database Setup
------------------------------

**Database:**
- Type: PostgreSQL 16 (Google Cloud SQL)
- Instance/Connection Name: `mymoolah-db:africa-south1:mmtp-pg`
- Region: `africa-south1`
- Public IP: Enabled for dev access; authorized networks only
- Security: TLS required on public IP; local dev via Cloud SQL Auth Proxy

**How to Connect (Local):**
1. Install the proxy:
   ```bash
   bash scripts/setup-cloud-sql-proxy.sh
   ```
2. Start the proxy:
   ```bash
   ./bin/cloud-sql-proxy --address 127.0.0.1 --port 5433 mymoolah-db:africa-south1:mmtp-pg
   ```
3. Backend `.env`:
   ```env
   DATABASE_URL=postgres://mymoolah_app:<PASSWORD>@127.0.0.1:5433/mymoolah
   DB_DIALECT=postgres
   ```

**Without Proxy:**
- Use the instance public IP with `sslmode=require` and authorize your Mac’s IP in Cloud SQL.

**Troubleshooting:**
- If you see certificate errors with public IP, switch to the proxy.
- If proxy fails to start, run `gcloud auth application-default login` or provide a service account key with `--credentials-file`.

**Change Log:**
- [2025-08-12] Migrated to PostgreSQL, added proxy installer/usage, updated onboarding steps.