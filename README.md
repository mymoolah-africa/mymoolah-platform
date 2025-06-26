# MyMoolah Backend

## Project Purpose
A cloud-native, Mojaloop-inspired banking and wallet platform for Africa, designed for cost efficiency, scalability, and compliance with international banking standards.

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
mymoolah-backend/
  |-- config/
  |-- routes/
  |-- server.js
  |-- .env
  |-- package.json
  |-- README.md
  |-- docs/
      |-- requirements.md
      |-- session-summary.md
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
   cd mymoolah-backend
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
- **POST /api/users/register**: User registration with input validation, password hashing, and duplicate checking. Saves users to MySQL.
- **GET /api/clients**: Lists all registered B2B clients from the database.

### Planned/Upcoming Endpoints
- Wallet funding (EFT, PayShap, voucher)
- Transaction history (user and client)
- Voucher generation, redemption, and management
- KYC document upload and approval
- Authentication (login, JWT)
- VAS integrations (airtime, data, bill payments, etc.)
- Notifications and support ticket management

## Current Status
- Codebase is fully cleaned up: **Node.js + Express + MySQL only** (no MongoDB/Mongoose).
- `.gitignore` excludes `node_modules/` and `.env`.
- All documentation is up to date and in sync with the codebase.
- User registration and client listing endpoints are live and tested.
- Database schema is robust and documented.
- GitHub repo is clean, up to date, and ready for further development.

## Git Workflow & Documentation Practices
- All code and documentation are versioned in GitHub.
- Always commit and push before switching environments (e.g., Codespaces/local).
- Always pull before starting work elsewhere to avoid divergence.
- Resolve merge conflicts promptly and keep the main branch clean.
- Documentation is maintained in `README.md`, `docs/requirements.md`, and `docs/session-summary.md` and should be updated after each major session or decision.

## Documentation
- See `docs/requirements.md` for detailed requirements and design notes.
- See `docs/session-summary.md` for a running summary and handover notes.

## Contact & Support
- For questions, see the `docs/` folder or contact the project maintainer. 

