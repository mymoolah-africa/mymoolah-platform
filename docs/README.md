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

## Current Status
- Project code and documentation are versioned in GitHub and developed in GitHub Codespaces.
- MySQL database (Google Cloud SQL) is set up with core tables: clients, users, wallets, transactions, vouchers.
- Node.js backend is running and connected to the database (pending user privilege troubleshooting for remote access).
- API endpoint `/api/clients` is implemented for listing clients.
- Documentation is maintained in `README.md`, `docs/requirements.md`, and `docs/session-summary.md`.

## Next Steps
- Resolve MySQL user privilege issues for remote access from Codespaces.
- Add more API endpoints (create client, user registration, wallet funding, etc.).
- Implement authentication, KYC, and VAS integrations.
- Continue documenting all features and decisions.

## Documentation
- See `docs/requirements.md` for detailed requirements and design notes.
- See `docs/session-summary.md` for a running summary and handover notes.

## Contact & Support
- For questions, see the `docs/` folder or contact the project maintainer.

## Technology Stack
- Node.js (Express)
- MongoDB Atlas (cloud database)
- Mongoose (ODM)
- Environment variables for configuration
- Ready for Google Cloud deployment

## Mojaloop-Inspired Goals
- Modular, API-driven architecture
- Support for user onboarding, wallet creation, and transactions
- Secure, auditable, and extensible design
- Follows open banking and Mojaloop best practices

## Setup Instructions

### Prerequisites
- Node.js (v18 or later)
- npm
- MongoDB Atlas account (or local MongoDB for development)
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
   PORT=5050
   MONGO_URI=your-mongodb-atlas-uri
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

## Project Structure
```
mymoolah-backend/
  |-- config/
  |-- controllers/
  |-- models/
  |-- routes/
  |-- utils/
  |-- server.js
  |-- .env
  |-- package.json
  |-- README.md
```

## Documentation & Notes
- All major decisions, requirements, and architecture notes are kept in the `docs/` folder.
- This project references Mojaloop public documentation and best practices.

## Contact & Support
- For questions, see the `docs/` folder or contact the project maintainer. 