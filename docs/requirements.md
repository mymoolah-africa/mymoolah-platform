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

For infrastructure and database setup details, see the 'Infrastructure & Database Setup' section in AGENT_HANDOVER.md and PROJECT_ONBOARDING.md. For technical details, diagrams, and change history, see infrastructure.md.
