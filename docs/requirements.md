## Implemented API Endpoints (as of June 2025)
- **User**: POST /api/v1/users/register
- **Client**: GET /api/v1/clients
- **Wallet**: POST /api/v1/wallets, GET /api/v1/wallets/:id, GET /api/v1/wallets/:id/balance, POST /api/v1/wallets/:id/credit, POST /api/v1/wallets/:id/debit, GET /api/v1/wallets/:id/transactions
- **Voucher**: POST /api/v1/vouchers/issue, POST /api/v1/vouchers/redeem, GET /api/v1/vouchers
- **KYC**: POST /api/v1/kyc/upload, GET /api/v1/kyc/:user_id
- **Notifications**: POST /api/v1/notifications, GET /api/v1/notifications/:user_id, POST /api/v1/notifications/:id/read
- **Support**: POST /api/v1/support, GET /api/v1/support/:user_id

**Documentation Rule:**  
All documentation must be written, updated, and maintained by the developer/agent—not the product owner. The agent is responsible for updating all docs, committing, and pushing to GitHub after every major change or session. The product owner should only review, approve, or request changes, not manually edit documentation files.

---

```markdown
# MyMoolah Platform Requirements
- All endpoints are versioned and use the `/api/v1/` prefix for consistency and future-proofing.

## Project Overview
MyMoolah is a cloud-native, Mojaloop-inspired banking and wallet platform for Africa, designed for cost efficiency, scalability, and compliance with international banking standards.

---

## Business & Technical Goals

- Serve B2B clients and enable them to manage prefunded float accounts for millions of end users.
- Support low-income individuals in Africa with affordable, accessible digital financial services.
- Integrate with multiple VAS and payment service providers (e.g., DT Mercury for PayShap, Mobilemart, Flash).
- Provide a secure, auditable, and compliant platform for all transactions.
- Modular Node.js/Express backend with MySQL (Google Cloud SQL).
- RESTful API, documented with OpenAPI/Swagger.
- KYC onboarding for B2B and B2C (document upload, approval workflow).
- Voucher system for secure generation, distribution, and redemption.
- Real-time transaction processing (1000+ TPS target).
- Scalable, cloud-native deployment (Google Cloud, Codespaces for dev).
- Security: PCI DSS compliance, OAuth2/JWT, encryption, audit logging.

---

## Account Types & Requirements

### Client Accounts (B2B)
- Onboarding, KYC, compliance.
- Float account management (ZAR, multi-currency future).
- Automated float notifications (80/90/95%).
- Secure client portal for reporting.
- Each client can have millions of customers, each with an internal wallet managed by the client.
- Compliance, security, auditability.

### Service Provider Accounts
- Modular API integration (e.g., DT Mercury for PayShap, Mobilemart, Flash).
- Float management, notifications, KYC, compliance.
- Transaction journey, pricing/on-selling, reporting, VAT handling, security, audit.

### User Accounts (B2C)
- KYC (SA ID or passport), document upload, proof of address.
- Funding via EFT, PayShap, vouchers.
- Voucher system, transaction history, reporting.
- Mobile number as account number, unique backend ID.
- Security, simplicity.

### Internal/Operational Accounts
- System float, fee collection, VAT holding, suspense/settlement.
- Full transaction history, audit trail, reconciliation, segregation of funds.

### Agent/Merchant/API Accounts (Future)
- For field agents, merchants, and third-party integrations.
- KYC, float/commission management, POS/e-commerce support.

---

## API & Data Model

- **Implemented Endpoints:**
  - `POST /api/v1/users/register` (user registration, validation, hashing, duplicate check)
- **Planned Endpoints:**
  - Wallet funding, transaction history, voucher management, KYC upload, authentication, VAS integrations, notifications, support tickets.
- **Data Model:**
  - Robust ERD with tables for clients, users, wallets, transactions, vouchers, KYC, VAT, audit logs, notifications, support tickets.

---

## Backend Implementation Status (as of July 2024)

- User registration API (`/api/v1/users/register`) is implemented with validation, password hashing, and MySQL integration.
- `server.js` is configured with CORS, error handling, and user route registration.
- Environment variables in `.env` manage database credentials securely.
- Documentation portal is live at [https://mymoolah-africa.github.io/mymoolah-platform/](https://mymoolah-africa.github.io/mymoolah-platform/).
- OpenAPI spec (`openapi.yaml`) is included for API reference and can be viewed in Swagger Editor or Redoc.
- **Note:** The documentation site is static and separate from the backend API, which runs locally or in Codespaces.
- The codebase is now fully Node.js + Express + MySQL only (all MongoDB/Mongoose code has been removed).
- Regular backup branches and cleanup are used before major changes, following best practice for safe recovery.

---

## Configuration & Environment Files

- `.env`: Stores environment variables for database credentials and other secrets.
- `config/db.js`: Sets up the MySQL connection pool using environment variables.
- `server.js`: Main entry point for the backend server, configures middleware, routes, and error handling.
- `routes/users.js`: Handles user registration and related API endpoints.

---

## Git Workflow: Moving Folders/Files from Local Development to GitHub

**Best Practice:**
- Always copy your new or updated files/folders into your local clone of the GitHub repo (not directly into the remote via the web interface).
- Use git to track, commit, and push your changes. This ensures version control, collaboration, and triggers any automations (like documentation deployment).

**Step-by-Step Instructions:**

1. **Copy your files/folders into your local repo directory.**
   - Example: Drag and drop, or use the `cp` command in your terminal.

2. **Check the status of your repo:**
   ```bash
   git status
   ```
   - This shows new, modified, or deleted files/folders.

3. **Stage your changes:**
   - To add everything (recommended):
     ```bash
     git add .
     ```
   - To add a specific folder:
     ```bash
     git add path/to/your-folder
     ```
   - To add a specific file:
     ```bash
     git add path/to/your-file
     ```

4. **Commit your changes:**
   ```bash
   git commit -m "Add/update files and folders from local development"
   ```

5. **Push to GitHub:**
   ```bash
   git push
   ```

6. **Check your repo on GitHub** to confirm the changes are there.

**Notes:**
- Git will track all files inside folders you add, except those listed in `.gitignore`.
- If you delete a folder locally and run `git add .`, Git will stage the deletion as well.
- Use `git status` to review what will be added, modified, or deleted before you commit.

---

```

---

### Implemented Endpoints (as of June 2025)
- **Wallets:** Create, get details, get balance, credit, debit, list transactions
- **Vouchers:** Issue, redeem, list
- **KYC:** Upload document, get status
- **Notifications:** Create, list for user, mark as read
- **Support:** Create ticket, list tickets for user