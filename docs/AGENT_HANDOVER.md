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