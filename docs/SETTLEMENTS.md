# Settlements & Float Model (Mojaloop/Banking Grade)

Last Updated: 2025-08-20

## Scope
Closed‑loop settlement for MMTP using Mojaloop switch APIs. All product/service payments to Suppliers are settled from pre‑funded floats. Each Client also maintains a pre‑funded float with MMTP. MM earns configurable commissions/fees. This document defines accounts, flows, and journal patterns.

## Core Principles
- Closed‑loop: All movements are recorded in MMTP’s immutable ledger (journal entries + lines).
- Pre‑funded: No overdrafts; Supplier and Client floats must have available balance before authorisation.
- Mojaloop‑aligned: Clear payer/payee FSP roles, idempotency, end‑to‑end references, ISO‑like reason codes.
- Banking‑grade: Double‑entry accounting, separation of concerns, reconciliation, and auditability.

## Accounts (per entity)
### Supplier (per Supplier)
- Supplier Float (asset payable to supplier)
- Supplier Settlement Clearing
- Supplier Commission Expense (contra to MM revenue when supplier subsidises)
- Supplier Promotion/Discount Subsidy (optional)

### Client (per Client)
- Client Float (liability to client)
- Client Settlement Clearing
- Client Fees/Commission Expense (if client subsidises)

### MMTP (house)
- MM House Cash (asset)
- MM Commission/Fees Revenue (income)
- MM Promotions/Discounts Expense (if MM subsidises)
- Interchange/Clearing Control (internal balancing)

Note: Real chart-of-accounts naming should match models `LedgerAccount`, `JournalEntry`, `JournalLine`.

## Configuration
- Commission models: percentage, per‑unit, tiered; applied per Supplier and/or per Client.
- Transaction fees: fixed/percent, payer/beneficiary/both; applied per product category (airtime, data, electricity, bill pay, RTP, vouchers).
- Promotions/discounts: attributed to MM, Supplier, or Client; subsidy account configurable.

## Authorisation & Settlement Flow (VAS example)
1) Validation:
   - Check Client Float ≥ gross amount (price + fees if payer‑pays).
   - Lock funds (create pending hold in clearing account).
2) Execute with Supplier via gateway (Flash/MobileMart/EasyPay):
   - If success, post final journals; otherwise release hold.

### Journal Pattern (success)
Assume:
- Product price: R 100.00
- MM commission: 5% (payer‑agnostic revenue)
- Net to Supplier: R 95.00

Entries (simplified):
- DR Client Settlement Clearing     100.00
  CR Client Float                   100.00
- DR Interchange/Clearing Control    95.00
  CR Supplier Settlement Clearing    95.00
- DR Client Settlement Clearing       5.00
  CR MM Commission/Fees Revenue       5.00
- DR Supplier Settlement Clearing    95.00
  CR Interchange/Clearing Control    95.00

Settlement payout batch to Supplier reduces MM House Cash if external banking leg is used; in closed‑loop, credit increases Supplier Float available balance.

### Promotions/Discounts
If MM subsidises R 10.00 discount:
- DR MM Promotions/Discounts Expense   10.00
  CR Client Settlement Clearing        10.00
Net client debit becomes 90.00; supplier still receives 95.00 (subsidy + top‑up rules configurable).

## RTP/Payments (PayShap) – high level
- Payer: Client/User wallet (or Client Float)
- Payee: Supplier Float / external counterparty via Mojaloop switch
- Fees applied per configuration; journals mirror VAS with payee/payer fee placement.

## Reconciliation
- Daily: Per Supplier and per Client trial balance (Float, Clearing, Revenue/Expense).
- End‑to‑end reference keys: `transactionId`, `externalRef`, `mojaloopCorrelationId`.
- Break detection: clearing control must net to zero per batch.

## Operational Rules
- Pre‑funding enforcement before authorisation.
- Idempotent command processing (dedupe keys on POST).
- Reversible only via contra journal with full audit trail.

## Implementation Pointers
- Use existing models: `LedgerAccount`, `JournalEntry`, `JournalLine` for postings.
- Keep posting logic in a dedicated service (e.g., `ledgerService`) with product‑type strategies.
- All amounts decimal(18,2) and currency ZAR (configurable).

## Responsibilities
- **Suppliers**: receive settlement from Supplier Float or payout process.
- **Clients**: fund Client Float; authorise debits for purchases.
- **MMTP**: manages clearing, recognises revenue/expenses, and reconciles.

This document is canonical for settlements. Update alongside any change to fee models or ledger structures.

## Example Account Code Conventions (suggested)
- CLIENT_FLOAT_<clientId> (liability)
- CLIENT_CLEARING_<clientId>
- SUPPLIER_CLEARING_<supplierId>
- INTERCHANGE
- MM_REV_FEES
- MM_PROMO_EXP

These are examples only; align with your chart of accounts and configure codes per environment.
