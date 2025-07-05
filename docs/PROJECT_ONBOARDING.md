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

- Always work in Codespaces unless you have a specific reason to work locally.
- Before starting work:  
  ```bash
  git pull origin main
  ```
- After making changes and testing:  
  ```bash
  git add .
  git commit -m "Describe your change"
  git push origin <your-branch>
  ```
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