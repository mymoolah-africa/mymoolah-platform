# MyMoolah Domain Model (Mojaloop- and Banking-Grade)

Last Updated: 2025-08-20

## Purpose
This document clarifies core business entities and relationships to ensure a shared understanding across product, engineering, and compliance. It is implementation-agnostic and applies to all channels (web, mobile, API).

## Core Entities

### 1) Client (B2B)
- A legal entity (business, NGO, school, employer) onboarded by MyMoolah (MM).
- Has its own configuration, limits, and operational controls (KYB, risk tiers, product entitlements).
- Can sponsor and manage downstream end-users (see Customer below).
- Example: "Retailer Group Pty Ltd" using MM to pay employees and sell VAS.

### 2) Customer (End-User under a Client)
- An end-user or employee associated to a specific Client (B2B context).
- May transact within the Client program (wallet funding, payouts, VAS purchases).
- Identity of a Customer can map to an MM platform `User` (see next section) to enable self-service.

### 3) User (Individual on the MM Platform)
- Any person registered on the MyMoolah platform/wallet.
- A single person can be both:
  - an individual `User` (personal wallet), and
  - a `Customer` of one or more `Clients` (e.g., as an employee or program participant).
- KYC and risk tiering are applied at the User level; role/entitlements may vary per context (personal vs. under a Client).

### 4) Supplier (Integrated Partner)
- External service provider connected to MM for payments and/or VAS.
- Current categories:
  - Payments: Peach Payments (RTP/PayShap), dtMercury (bank rails), Zapper (QR acceptance)
  - VAS: Flash, MobileMart, EasyPay (airtime, data, electricity, bill payments, vouchers)
- Supplier integrations are abstracted behind MM APIs and governed by compliance (SLAs, security, idempotency).

## Relationships (high level)
- Client ↔ Customer: 1..N (a Client has many Customers)
- User ↔ Client/Customer: N..M via a linking relation (a User may belong to multiple Client programs; a Customer may be linked to a User identity)
- User ↔ Wallet: 1..1 primary wallet (additional scoped wallets possible per program where applicable)
- Supplier ↔ Product/Service: 1..N (each Supplier exposes multiple products/services)
- User/Client ↔ Transaction/Voucher: N..N (ledger-driven, immutable journal)

## Business Rules (confirmed)
1. MM has B2B Clients; those Clients have Customers (often employees). Customers can also be MM platform Users.
2. MM also serves individual Users directly (not tied to a Client). The same person can be both an individual User and a Client Customer.
3. MM integrates Suppliers (Flash, MobileMart, dtMercury, EasyPay, Zapper, PeachPayments) to provide Payments (e.g., PayShap, vouchers, cash-out) and VAS (airtime, data, electricity, bill pay).

These rules are canonical and must be preserved in future feature design and data modeling.

## Architecture Principles (Mojaloop & Banking Grade)
- Idempotent APIs for commands (POST/PUT) with strong deduplication keys.
- Event-driven flows; remove polling except for explicit, narrow cases.
- CQRS + immutable ledger journal for financial events; audit-first design.
- Keyset pagination and trimmed payloads for all high-traffic listings.
- Security: mTLS/JWS where required by FSPIOP/partner specs; least-privilege tokens; PII minimization.
- Observability: structured logs, correlation IDs, and end-to-end traceability (transaction references across systems).
- Performance: index strategy for hot paths, connection pooling, and backpressure aware queues.

## Data Model Hints (non-exhaustive)
- `clients` (KYB, program settings)
- `client_users` (join: user_id, client_id, role/entitlements)
- `users` (KYC, registration metadata)
- `wallets` (scoped per user/program)
- `suppliers` (registry of integrated partners)
- `products` (VAS/payment capabilities per supplier)
- `transactions` (immutable journal entries referencing wallets and suppliers)
- `vouchers` (EP/MM vouchers with linkage rules; see `VOUCHER_BUSINESS_LOGIC.md`)

## Voucher/Payments Notes
- Voucher rules (EP vs MM, settlement, expiry, cancellation) are governed by `VOUCHER_BUSINESS_LOGIC.md` and must not be altered without business approval.
- Payments must follow banking-grade reconciliation, references, and idempotency.

## Frontend Guidance (Airtime/Data/Electricity pages)
- Keep flows simple and consistent; surface Client context if the User is acting under a Client program.
- Always reflect wallet balance and applicable limits; defer to server for pricing and availability per Supplier.
- Apply keyset pagination and skeleton loaders for catalog/product searches.

---

This document is source-of-truth for entity definitions and relationships. Update alongside any schema/API changes.
