# MyMoolah Backend

## Project Purpose
A cloud-native, Mojaloop-inspired banking and wallet platform for Africa, designed for cost efficiency, scalability, and compliance with international banking standards. The platform targets both low-income individuals and B2B clients, providing a secure, modular, and API-driven solution for digital wallets and banking services.

## Objectives & Requirements
- Serve low-income individuals and B2B clients in Africa with a secure, scalable wallet and banking platform.
- Each client has a prefunded float account; each client can have millions of customers, each with an internal wallet.
- Support for VAS (Value-Added Services) purchases, voucher generation/redemption, bill payments, cash-in/cash-out, and cross-border remittances.
- Integrate with multiple VAS providers (e.g., Mobilemart, Flash, EasyPay, DT Mercury).
- KYC for both B2B and B2C onboarding, including document upload (ID/passport, proof of address).
- Client portal for reporting, user management, and notifications (e.g., low float balance).
- REST API with UAT and production credentials, documented with OpenAPI/Swagger.
- Designed for 1000+ transactions per second (TPS).
- Modular, API-driven, and cloud-native architecture.
- Follows Mojaloop and open banking best practices.

## Technology Stack
- Node.js (Express)
- MySQL (Google Cloud SQL)
- mysql2 (Node.js MySQL client)
- dotenv (for environment variables)
- cors (for cross-origin requests)

## Project Structure
```
controllers/           # Business logic for each resource
models/                # Database models and schema logic
routes/                # Express route definitions
services/              # External integrations and business services
utils/                 # Utility functions and helpers
config/                # Configuration files (DB, env, etc.)
docs/                  # Project documentation (requirements, onboarding, session notes)
  |-- requirements.md
  |-- session-summary.md
  |-- PROJECT_ONBOARDING.md
  |-- session_decision_notes.md
server.js              # Main Express app entry point
package.json           # Project dependencies and scripts
mkdocs.yml             # MkDocs config for publishing docs
README.md              # This file
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or later)
- npm
- MySQL database (Google Cloud SQL or local)
- Google Cloud account (for deployment)

### Local Development
1. Clone the repository and navigate to the backend folder:
   ```bash
   git clone <your-repo-url>
   cd mymoolah
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following content:
   ```env
   DB_HOST=your-mysql-host
   DB_USER=your-mysql-user
   DB_PASSWORD=your-mysql-password
   DB_NAME=your-mysql-db
   PORT=5050
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. The API will be available at `http://localhost:5050/`

### Google Cloud Deployment
- Prepare an `app.yaml` for App Engine or a Dockerfile for Cloud Run.
- Ensure all secrets are managed via environment variables.
- Follow GCP deployment guides for Node.js apps.

## API Endpoints & Implementation Status (as of July 2024)

### Implemented Endpoints
- **User**
  - `POST /api/users/register`: User registration with input validation, password hashing, and duplicate checking. Saves users to MySQL.
- **Client**
  - `GET /api/clients`: Lists all registered B2B clients from the database.
- **Wallet**
  - `POST /api/wallets`: Create a wallet for a user/client.
  - `GET /api/wallets/:id/balance`: Get wallet balance.
  - `POST /api/wallets/:id/credit`: Credit a wallet.
  - `POST /api/wallets/:id/debit`: Debit a wallet.
  - `GET /api/wallets/:id/transactions`: List wallet transactions.
- **Voucher**
  - `POST /api/vouchers/issue`: Issue a voucher (with min/max value, brand-locking, config).
  - `POST /api/vouchers/redeem`: Redeem or partially redeem a voucher.

### Planned/Upcoming Endpoints
- Wallet funding (EFT, PayShap, voucher)
- Transaction history (user and client)
- KYC document upload and approval
- Authentication (login, JWT)
- VAS integrations (airtime, data, bill payments, etc.)
- Notifications and support ticket management

## Database
- MySQL schema is aligned with the API and business rules.
- Issues (missing columns, types, enums) are debugged and fixed as part of the workflow.
- See `docs/requirements.md` for schema details.

## Documentation & Workflow
- All code and documentation are versioned in GitHub.
- Always commit and push before switching environments (e.g., Codespaces/local).
- Always pull before starting work elsewhere to avoid divergence.
- Resolve merge conflicts promptly and keep the main branch clean.
- Documentation is maintained in `README.md`, `docs/requirements.md`, `docs/session-summary.md`, `docs/PROJECT_ONBOARDING.md`, and `docs/session_decision_notes.md`.
- Update documentation after each major session or decision.

## Onboarding & Session Continuity
- New developers/agents should start with `PROJECT_ONBOARDING.md` for a high-level overview and setup steps.
- Key decisions, requirements, and session notes are tracked in `session_decision_notes.md` and `docs/session-summary.md`.
- This ensures smooth handover and continuity across sessions and contributors.

## Contact & Support
- For questions, see the `docs/` folder or contact the project maintainer.

