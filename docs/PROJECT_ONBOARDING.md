# MyMoolah Project Onboarding Guide

## [2024-07-12] Wallet-First, Closed-Loop, and Mojaloop-First Strategy
- MyMoolah's urgent business requirement: launch its own wallet for individuals, and provide REST API integration for closed-loop clients (with millions of wallets/accounts) and service providers (VAS, payments) using pre-funded ledger accounts.
- All new features and integrations must use Mojaloop APIs and best practices, even for closed-loop (internal/partner) flows, to ensure future-proofing, compliance, and interoperability.
- The platform is architected as a dual-rail (closed-loop + Mojaloop) solution, with a "Mojaloop-first" policy for all transaction flows.
- Documentation updated across all key files to reflect this strategy and session decisions.

Welcome to the MyMoolah platform! This guide will help you get started as a developer or contributor.

---

## Project Overview

MyMoolah is a Mojaloop-inspired, modular banking and wallet platform for Africa, built with Node.js/Express and MySQL. The project is API-driven, cloud-native, and designed for security, compliance, and extensibility.

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
- Create a `.env` file in the root directory:
  ```env
  DB_HOST=your-mysql-host
  DB_USER=your-mysql-user
  DB_PASSWORD=your-mysql-password
  DB_NAME=your-mysql-db
  PORT=5050
  ```
- Start the server:
  ```bash
  npm start
  ```

---

## Key Files & Folders

- `server.js` – Main Express app entry point
- `config/db.js` – MySQL connection pool setup
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
- Type: MySQL 8.0 (Google Cloud SQL)
- Instance/Connection Name: mymoolah-db:africa-south1:mymoolah-instance
- Region: africa-south1
- Private IP: 35.0.0.3 (enabled, for VPC-connected resources)
- Public IP: 34.35.9.169 (enabled, for external/dev access)
- Networking: Only trusted networks allowed (no 0.0.0.0/0), private services access enabled, VPC: default, authorized networks configured
- Security: SSL/TLS encryption enforced (allow only SSL connections: Enabled), server CA is Google-managed internal certificate authority (expires 22 Jun 2035), no client certificates required (can be added later), App Engine authorization enabled, Google Cloud services authorization disabled

**How to Connect:**
- All clients must use SSL/TLS to connect (no unencrypted traffic allowed)
- Download server-ca.pem from Cloud SQL for client verification
- For Codespaces, use Cloud SQL Auth Proxy (recommended for secure, dynamic access)
- For local dev, connect using public IP and SSL
- Credentials are stored securely in Google Secret Manager (or 1Password vault) — never in documentation
- For access, request credentials from the project maintainer

**Compliance Notes:**
- Review and update security settings regularly for POPIA, PCI DSS, and banking compliance
- Only authorized networks and users should have access
- See infrastructure.md for technical details, diagrams, and change history

**Change Log:**
- [2024-07-13] Restricted authorized networks, enabled 'allow only SSL connections', documented server CA, and updated connection instructions.

Cloud SQL Secure Connection Guide
-------------------------------

**Overview:**
All database access (local and Codespaces/cloud) must use the Cloud SQL Auth Proxy and the official MySQL client for secure, compliant, and reliable connections. This ensures SSL/TLS encryption, avoids hostname verification issues, and supports Google Cloud's best practices.

**Local Setup:**
1. Download Cloud SQL Auth Proxy v2 (recommended):
   curl -Lo cloud-sql-proxy https://dl.google.com/cloudsql/cloud-sql-proxy.darwin.amd64
   chmod +x cloud-sql-proxy
2. Authenticate with Google Cloud:
   gcloud auth login
   gcloud config set project mymoolah-db
3. Start the proxy:
   ./cloud-sql-proxy --address 127.0.0.1 --port 3306 mymoolah-db:africa-south1:mymoolah-instance &
4. Install the official MySQL client (Homebrew):
   brew install mysql-client
   echo 'export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
5. Connect (no SSL flags needed):
   mysql --host=127.0.0.1 --user=mymoolah_user --password --database=mymoolah_db -e 'SHOW TABLES;'

**Codespaces/Cloud Setup:**
- Use the Linux version of the proxy and follow the same steps (see below for Linux commands).
- Download: curl -Lo cloud-sql-proxy https://dl.google.com/cloudsql/cloud-sql-proxy.linux.amd64
- chmod +x cloud-sql-proxy
- Start: ./cloud-sql-proxy --address 127.0.0.1 --port 3306 mymoolah-db:africa-south1:mymoolah-instance &
- Install MySQL client: sudo apt-get update && sudo apt-get install mysql-client
- Connect: mysql --host=127.0.0.1 --user=mymoolah_user --password --database=mymoolah_db -e 'SHOW TABLES;'

**Troubleshooting:**
- If you see 'TLS/SSL error: Hostname verification failed', do not use the public IP; use the proxy.
- If you see 'SSL is required, but the server does not support it', ensure you are using the official MySQL client, not MariaDB.
- If the proxy fails to start, check Google Cloud authentication (gcloud auth login).
- Always use the latest v2 proxy for best compatibility.

**Change Log:**
- [2024-07-13] Added detailed Cloud SQL secure connection and troubleshooting guide for local and Codespaces/cloud environments.