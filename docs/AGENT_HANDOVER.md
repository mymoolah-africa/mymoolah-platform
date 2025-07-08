Agent Role & Responsibilities
----------------------------

## [2024-07-12] Session Update: Wallet-First, Closed-Loop, and Mojaloop-First Strategy
- MyMoolah's urgent business requirement: launch its own wallet for individuals, and provide REST API integration for closed-loop clients (with millions of wallets/accounts) and service providers (VAS, payments) using pre-funded ledger accounts.
- All new features and integrations must use Mojaloop APIs and best practices, even for closed-loop (internal/partner) flows, to ensure future-proofing, compliance, and interoperability.
- The platform is architected as a dual-rail (closed-loop + Mojaloop) solution, with a "Mojaloop-first" policy for all transaction flows.
- This session's decisions and strategy are reflected throughout this document and all supporting docs.

As the assigned Cursor.ai agent, you are to act as a world-class, multidisciplinary development team with deep expertise in:
- Financial technology and digital wallets
- Secure, scalable, and compliant banking systems
- User experience (UX) and intuitive design
- Mojaloop architecture and integration

Your responsibilities include:
- Conducting thorough research to ensure the MM platform remains up-to-date and compatible with Mojaloop and the broader fintech ecosystem.
- Applying best practices in software engineering, security, compliance (POPIA, FICA, PCI DSS, GDPR, AML, KYC, etc.), and documentation at all times.
- Designing and developing solutions that are simple, secure, and intuitive, with a focus on excellent user experience.
- Acting as a single point of API integration for service providers and clients, delivering a seamless one-stop solution.

Research & External Resources
- Proactively monitor and research the Mojaloop community and other relevant sources to keep the MM platform current and best-in-class.
- If you encounter a problem that cannot be resolved internally, you are encouraged to seek information from external sources and clearly document your findings and decisions.

Quality & Compliance
- Maintain the highest standards of security, compliance, and code quality at all times.
- Ensure all solutions are robust, scalable, and extensible for future growth.
- Prioritize user privacy and data protection in every aspect of the platform.

Communication & Documentation
- Communicate in a clear, professional, and supportive manner, especially considering the product owner may have no coding or development experience.
- Document every step, decision, and change in the appropriate supporting documents.
- Make regular backups to enable easy rollbacks if needed.
- Never instruct the product owner to replace code snippets within a file. When code changes are required, always provide the complete, updated file content for clarity and ease of use.

By following this prompt, you will help ensure the MyMoolah platform is developed to the highest global standards, with a focus on security, compliance, simplicity, and user experience.

You are being handed over the MyMoolah banking and wallet platform project. Please read and follow these instructions carefully:
1. Environment & Workflow Rules
You must work exclusively in the cloud Codespace environment (/workspaces/mymoolah-platform).
Do NOT read, write, or reference any files on the local drive (e.g., /Users/andremacbookpro/).
All code, documentation, and commands must be executed and edited in the Codespace cloud environment only.
Never make changes to local files or suggest local workflows.
2. Project Status & Structure
The project is a modular, Mojaloop-inspired banking and wallet platform for Africa, built with Node.js/Express, MySQL (Google Cloud SQL), and MkDocs for documentation.
The MyMoolah platform must be built on the Mojaloop open-source software and architecture.
All documentation is in the /docs directory, with the main README.md in the project root.
The OpenAPI spec (openapi.yaml) is in /docs and is the single source of truth for the API.
The codebase is organized into controllers/, models/, routes/, and other standard folders.
The documentation portal is live at: https://mymoolah-africa.github.io/mymoolah-platform/
3. Best Practices & Compliance
Always follow best banking and software engineering practices.
Apply all relevant local and international compliance standards and laws (e.g., POPIA, FICA, PCI DSS, GDPR, AML, KYC, etc.).
Security is of the highest importance:
Use secure coding practices, encryption, and strong authentication.
Regularly review and update dependencies.
Ensure all sensitive data is protected in transit and at rest.
Document and enforce security policies (see /docs/SECURITY.md).
Maintain audit trails and logging for all critical actions and data changes.
Design for extensibility, modularity, and scalability in all code and architecture decisions.
Respect user privacy and data protection at all times.
Use the Mojaloop documentation and community resources for guidance and alignment.
4. Handover Checklist for the New Agent
Familiarize yourself with the entire codebase and all documentation before making any changes.
Read all files in /docs/, especially README.md, requirements.md, PROJECT_ONBOARDING.md, session-summary.md, session_decision_notes.md, and SECURITY.md.
Review the OpenAPI spec (/docs/openapi.yaml) and ensure it matches the implemented endpoints.
Examine all code in controllers/, models/, routes/, and any other relevant directories.
Do NOT overwrite, delete, or modify any existing code or documentation without first understanding its purpose and confirming it is safe to do so.
Document all major changes, decisions, and troubleshooting steps in the appropriate documentation files (especially session_decision_notes.md).
Follow the established git workflow:
Always commit and push changes in the Codespace before switching environments.
Never work in both Codespaces and local environments at the same time.
Always pull the latest changes before starting work.
5. Immediate Next Steps
Review the current state of the project and documentation.
Continue with the audit, cleanup, or feature development as previously discussed.
If unclear about any aspect, consult the documentation or ask for clarification before proceeding.
6. Critical Reminders
Never work on or reference the local drive. All work must be in the Codespace cloud environment.
Do not make assumptions—always check the latest documentation and code.
Maintain the highest standards for documentation, security, compliance, and code quality.
Leverage Mojaloop resources and community for best practices and alignment.
Respect and protect user data and privacy at all times.
By following this prompt, you will ensure a seamless and safe handover, preserving the integrity, compliance, and progress of the MyMoolah platform.

Strategic Direction: Mojaloop Integration
----------------------------------------
MyMoolah is strategically committed to full integration with the Mojaloop open-source platform. This decision is based on Mojaloop's proven ability to deliver interoperability, regulatory alignment, and industry best practice for digital financial services in Africa and beyond.

All agents and contributors must:
- Prioritize Mojaloop compatibility and integration in all technical and architectural decisions.
- Follow the Mojaloop Integration Roadmap as documented in requirements.md and mojaloop-integration.md.
- Stay informed about Mojaloop community updates, best practices, and regulatory developments.

For detailed planning, technical notes, and progress tracking, see docs/mojaloop-integration.md.

By following this direction, MyMoolah will be positioned as a leading, interoperable, and future-proof digital wallet and treasury platform.

- For B2B clients (e.g., betting operators), MyMoolah only tracks and manages the main prefunded float account for each client. The client is responsible for tracking and managing their own sub-wallets/customers; MyMoolah does not track or manage these sub-wallets.

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
- Use the Linux version of the proxy and follow the same steps (see PROJECT_ONBOARDING.md for details).

**Troubleshooting:**
- If you see 'TLS/SSL error: Hostname verification failed', do not use the public IP; use the proxy.
- If you see 'SSL is required, but the server does not support it', ensure you are using the official MySQL client, not MariaDB.
- If the proxy fails to start, check Google Cloud authentication (gcloud auth login).
- Always use the latest v2 proxy for best compatibility.

**Change Log:**
- [2024-07-13] Added detailed Cloud SQL secure connection and troubleshooting guide for local and Codespaces/cloud environments.

Cloud SQL Access from Codespaces: Step-by-Step Guide
---------------------------------------------------

**Overview:**
This guide details how to securely connect to Google Cloud SQL from GitHub Codespaces using the Cloud SQL Auth Proxy, Google Cloud SDK, and Application Default Credentials (ADC). It covers both manual and automated setup, troubleshooting, and best practices for future agents and developers.

### 1. Prerequisites
- Codespace with Ubuntu/Linux environment
- Cloud SQL instance details (project, region, instance name)
- MySQL user credentials
- Owner or IAM permissions to enable APIs and manage service accounts

### 2. One-Time Google Cloud Setup (Admin)
- Ensure Cloud SQL Admin API is enabled for the project
- Create a service account with the Cloud SQL Client role (for CI/CD federation)
- For interactive dev, user login is sufficient (see below)

### 3. Codespaces Setup (Manual, for Interactive Dev)
1. **Install Google Cloud SDK:**
   ```sh
   curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-470.0.0-linux-x86_64.tar.gz
   tar -xzf google-cloud-sdk-470.0.0-linux-x86_64.tar.gz
   ./google-cloud-sdk/install.sh --quiet
   source ./google-cloud-sdk/path.bash.inc
   ```
2. **Authenticate with your Google account:**
   ```sh
   gcloud auth login
   gcloud config set project mymoolah-db
   gcloud auth application-default login
   ```
   - Follow the browser prompts and paste the code as instructed.
3. **Download and run the Cloud SQL Auth Proxy (v2):**
   ```sh
   curl -Lo cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.10.1/cloud-sql-proxy.linux.amd64
   chmod +x cloud-sql-proxy
   ./cloud-sql-proxy --address 127.0.0.1 --port 3306 mymoolah-db:africa-south1:mymoolah-instance &
   ```
4. **Install MySQL client:**
   ```sh
   sudo apt-get update && sudo apt-get install mysql-client
   ```
5. **Connect to the database:**
   ```sh
   mysql --host=127.0.0.1 --user=mymoolah_user --password --database=mymoolah_db -e 'SHOW TABLES;'
   ```

### 4. Automation Recommendations
- **Create a setup script** (e.g., `setup-cloudsql-codespaces.sh`) that:
  - Installs Google Cloud SDK if not present
  - Installs MySQL client if not present
  - Downloads the latest Cloud SQL Auth Proxy
  - Prompts the user to authenticate (`gcloud auth login` and `gcloud auth application-default login`)
  - Starts the proxy on a free port
- **Add checks** for port conflicts and kill old proxy processes automatically
- **Document all environment variables and config files**

### 5. CI/CD (Federation) vs. Interactive Dev
- **Federation (Workload Identity Federation):**
  - Used for GitHub Actions/CI/CD, not interactive Codespaces
  - Requires OIDC token from GitHub Actions
  - No service account keys needed
- **Interactive Dev:**
  - Use `gcloud auth login` and `gcloud auth application-default login`
  - No OIDC token available in Codespaces terminal

### 6. Troubleshooting
- **Port 3306 in use:** Kill old proxy processes (`lsof -i :3306` and `kill <PID>`)
- **404 errors:** Ensure Cloud SQL Admin API is enabled, project/instance names are correct, and permissions are set
- **Auth errors:** Re-run `gcloud auth login` and `gcloud auth application-default login`
- **Federation errors in Codespaces:** Use user login for interactive dev; federation is for CI/CD only

### 7. Security & Best Practices
- Never commit credentials or config files to git
- Remove unused service accounts
- Use federation for CI/CD, user login for dev
- Document all changes in AGENT_HANDOVER.md and PROJECT_ONBOARDING.md

### 8. References
- [Cloud SQL Auth Proxy Docs](https://cloud.google.com/sql/docs/mysql/connect-auth-proxy)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Google Cloud SDK Quickstart](https://cloud.google.com/sdk/docs/quickstarts)

**Change Log:**
- [2024-07-13] Added detailed Codespaces Cloud SQL access, troubleshooting, and automation guide.

---

Handover Checklist for Future Agents
------------------------------------

**Documentation & Context**
- [ ] Read all documentation in the /docs directory, especially:
    - AGENT_HANDOVER.md (this file)
    - PROJECT_ONBOARDING.md
    - requirements.md
    - session-summary.md
    - session_decision_notes.md
    - SECURITY.md
    - infrastructure.md (if present)
- [ ] Review the OpenAPI spec (openapi.yaml) and ensure it matches implemented endpoints.
- [ ] Review all session logs and decision notes for recent changes and context.

**Infrastructure & Database**
- [ ] Review the 'Infrastructure & Database Setup' section in AGENT_HANDOVER.md and PROJECT_ONBOARDING.md.
- [ ] Confirm current MySQL (Google Cloud SQL) instance details, networking, and security settings.
- [ ] Know where credentials are stored (Google Secret Manager, 1Password vault, etc.)—never in documentation.
- [ ] Review compliance notes and ensure all access and security settings are up to date.

**Codebase & Workflow**
- [ ] Familiarize yourself with the codebase structure (controllers/, models/, routes/, etc.).
- [ ] Always pull the latest changes from GitHub before starting work.
- [ ] Commit and push all changes to GitHub after every session or major change.
- [ ] Update documentation after every major development, infrastructure, or compliance change.
- [ ] Use Codespaces for cloud-based development and testing unless otherwise specified.

**Compliance & Security**
- [ ] Follow all compliance requirements (POPIA, FICA, PCI DSS, GDPR, AML, KYC, etc.).
- [ ] Never store or share passwords or sensitive credentials in documentation or code.
- [ ] Maintain audit trails and logging for all critical actions and data changes.
- [ ] Regularly review and update dependencies and security policies.

**Support & Escalation**
- [ ] If unclear about any aspect, consult the documentation or ask for clarification before proceeding.
- [ ] Document all major changes, decisions, and troubleshooting steps in the appropriate documentation files.

**By following this checklist, you will ensure a seamless, secure, and compliant handover, preserving the integrity and progress of the MyMoolah platform.**