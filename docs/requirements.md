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

## Static Assets and Resource Management Best Practices

### Overview
For security, reliability, compliance, and performance, all static assets (icons, fonts, images, etc.) used in the MyMoolah platform must be self-hosted and bundled with the application. This is especially critical for fintech and banking platforms.

### Rationale
- **Reliability:** Self-hosted assets are always available, regardless of third-party service status.
- **Compliance:** No user data or analytics are leaked to external servers, supporting privacy and regulatory requirements.
- **Performance:** Eliminates extra network requests and DNS lookups, improving load times.
- **Control:** You decide when and how assets are updated, preventing unexpected changes.

### Icons Example
- Use icon libraries via NPM packages (e.g., @heroicons/react, @fortawesome/react-fontawesome).
- Import only the icons you need to keep bundle size small.
- Do not use CDN links for icons or other critical UI assets.

### Fonts and Images
- Bundle custom fonts and images with your app or serve them from your own cloud storage/CDN (never from a third-party provider you do not control).

### Summary Table
| Approach      | Reliability | Compliance | Performance | Control | Recommended? |
|---------------|-------------|------------|-------------|---------|--------------|
| Self-hosted   | High        | High       | High        | High    | Yes          |
| Third-party   | Low         | Low        | Medium      | Low     | No           |

### Implementation
- All static assets must be included in the project repository or managed via a secure, organization-controlled cloud storage/CDN.
- Review all dependencies to ensure no critical UI assets are loaded from third-party CDNs at runtime.

---

Project Vision: MyMoolah as a Mojaloop-Based Platform
-----------------------------------------------------
MyMoolah is not just a Mojaloop-inspired wallet solution—it is strategically committed to being a true Mojaloop-based wallet and treasury platform. The core vision is to achieve full interoperability, regulatory alignment, and industry best practice by integrating directly with Mojaloop's open-source software and APIs.

All development, especially for payments, settlement, and inter-institutional transfers, must use Mojaloop as the foundational payment rail. MyMoolah will:
- Integrate directly with Mojaloop's APIs and core services for all external payments and settlements.
- Maintain its own user, KYC, compliance, and internal wallet/account logic, mapped to Mojaloop's participant model as needed.
- Make all new features and architecture decisions with Mojaloop integration as the foundation.

This approach ensures MyMoolah is positioned as a leading, interoperable, and future-proof digital wallet and treasury platform for Africa and beyond.

Hybrid Dual-Rail Architecture: Closed-Loop and Mojaloop Interoperability
------------------------------------------------------------------------
MyMoolah is architected as a hybrid, dual-rail platform that supports both closed-loop (internal/partner) and open-loop (Mojaloop) transactions within a single, unified solution. This approach enables:

- Seamless support for existing direct API integrations with clients, partners, and service providers (closed-loop).
- Full interoperability with the broader financial ecosystem via Mojaloop (open-loop), allowing users and partners to transact with external banks, wallets, and fintechs.
- The ability to route each transaction through the most efficient rail—using internal logic for MyMoolah-only flows, and Mojaloop for external or interoperable flows.
- Hybrid flows, where a transaction can combine both rails (e.g., try closed-loop first, then fall back to Mojaloop if the counterparty is external).

This dual-rail architecture provides maximum flexibility, reach, and compliance, ensuring MyMoolah can deliver the best of both worlds without maintaining separate applications or codebases.

All new features and transaction flows should be designed with this hybrid approach in mind, leveraging the strengths of both closed-loop and Mojaloop rails as appropriate.

Mojaloop-First Policy for All Transaction Flows
-----------------------------------------------
MyMoolah is committed to using Mojaloop's open-source software, best practice development strategies, and security/compliance policies wherever they can be applied—including for closed-loop (internal/partner) solutions and transactions.

All new features, transaction flows, and integrations must:
- Leverage Mojaloop's software and APIs as the first choice, even for internal or partner-only (closed-loop) solutions, wherever technically feasible.
- Follow Mojaloop's architecture, development strategies, and security/compliance standards at all times.
- Regularly review and align with Mojaloop community updates, best practices, and regulatory guidance.

This Mojaloop-first approach ensures MyMoolah remains at the forefront of global best practice, security, and compliance, and delivers the most robust, scalable, and future-proof treasury and wallet platform in the world.

---

## Static Assets and Resource Management Best Practices

### Overview
For security, reliability, compliance, and performance, all static assets (icons, fonts, images, etc.) used in the MyMoolah platform must be self-hosted and bundled with the application. This is especially critical for fintech and banking platforms.

### Rationale
- **Reliability:** Self-hosted assets are always available, regardless of third-party service status.
- **Compliance:** No user data or analytics are leaked to external servers, supporting privacy and regulatory requirements.
- **Performance:** Eliminates extra network requests and DNS lookups, improving load times.
- **Control:** You decide when and how assets are updated, preventing unexpected changes.

### Icons Example
- Use icon libraries via NPM packages (e.g., @heroicons/react, @fortawesome/react-fontawesome).
- Import only the icons you need to keep bundle size small.
- Do not use CDN links for icons or other critical UI assets.

### Fonts and Images
- Bundle custom fonts and images with your app or serve them from your own cloud storage/CDN (never from a third-party provider you do not control).

### Summary Table
| Approach      | Reliability | Compliance | Performance | Control | Recommended? |
|---------------|-------------|------------|-------------|---------|--------------|
| Self-hosted   | High        | High       | High        | High    | Yes          |
| Third-party   | Low         | Low        | Medium      | Low     | No           |

### Implementation
- All static assets must be included in the project repository or managed via a secure, organization-controlled cloud storage/CDN.
- Review all dependencies to ensure no critical UI assets are loaded from third-party CDNs at runtime.

---

## [2024-07-12] Session Update: Wallet-First, Closed-Loop, and Mojaloop-First Strategy
- MyMoolah's urgent business requirement: launch its own wallet for individuals, and provide REST API integration for closed-loop clients (with millions of wallets/accounts) and service providers (VAS, payments) using pre-funded ledger accounts.
- All new features and integrations must use Mojaloop APIs and best practices, even for closed-loop (internal/partner) flows, to ensure future-proofing, compliance, and interoperability.
- The platform is architected as a dual-rail (closed-loop + Mojaloop) solution, with a "Mojaloop-first" policy for all transaction flows.
- This session's decisions and strategy are reflected throughout this document and all supporting docs.

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
- Each client can have millions of customers, each with an internal wallet managed by the client (MyMoolah only tracks and manages the main prefunded float account; the client is responsible for tracking and managing their own sub-wallets/customers).
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


## Salary & Wages Disbursement Portal (Standalone, Planned)

- Companies can register and upload all required business KYC documents (registration, tax, proof of address, etc.).
- After KYC approval, companies can upload employee details in bulk via Excel/CSV.
- The system validates and processes the file, then initiates salary/wage payments as follows:
  - If the payment is to a bank account, the system uses DtMercury API integration.
  - If the payment is to a MyMoolah wallet (bank name = "mymoolah"):
    - If the wallet exists (matched by mobile/account number), the payment is credited to the wallet.
    - If the wallet does not exist, the platform creates a new wallet for the employee using their mobile number, and sends an SMS prompting the employee to register and access their funds.
- Payment status and audit logs are available in the portal.
- All actions are compliant with FICA, AML, and other relevant regulations.
- This feature will be developed after the core wallet and KYC flows are complete.

## Mojaloop Integration Roadmap

### Strategic Importance
Mojaloop integration is essential for achieving true interoperability, regulatory alignment, and industry best practice for the MyMoolah wallet. This roadmap outlines the steps to become a Mojaloop-enabled platform.

### Short-Term Actions
- Study Mojaloop's official documentation and architecture.
- Map MyMoolah's API/data model to Mojaloop's Open API.
- Identify required Mojaloop components (Central Ledger, ALS, Scheme Adapter, etc.).
- Document all findings and decisions in project docs.

### Medium-Term Actions
- Deploy a Mojaloop sandbox/test hub (locally or in the cloud using Docker/Kubernetes).
- Register MyMoolah as a Mojaloop participant (FSP) in the test environment.
- Build and test scheme adapters/connectors to bridge MyMoolah's wallet to Mojaloop APIs.
- Engage with the Mojaloop community for support and best practices.

### Long-Term Actions
- Certify integration with Mojaloop (if required by local regulators).
- Go live with Mojaloop for real-time, interoperable payments.
- Maintain compliance, security, and documentation as Mojaloop evolves.

### Resources
- [Mojaloop Official Documentation](https://mojaloop.io/documentation/)
- [Mojaloop GitHub](https://github.com/mojaloop/)
- [Mojaloop Community](https://community.mojaloop.io/)
