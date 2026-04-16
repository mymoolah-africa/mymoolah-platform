# Settlements & Float Model (Mojaloop/Banking Grade)

Last Updated: 2026-04-16

## Scope
Closed‑loop settlement for MMTP using Mojaloop switch APIs. All product/service payments to Suppliers are settled from pre‑funded floats. Each Client also maintains a pre‑funded float with MMTP. MM earns configurable commissions/fees. This document defines accounts, flows, and journal patterns.

**Wallet cash withdrawals (Apr 2026):** Outbound consumer flows include **partner-facilitated cash** (e.g. **eeziCash** via Flash float `1200-10-04`, **EasyPay** cash-out float `1200-10-03`) as well as electronic rails (EFT, PayShap). **eeziCash** is economically and regulatorily a **wallet debit → cash collection** path under the TPPP framework — not VAS voucher resale; see `docs/WITHDRAWALS_COMPLIANCE_AND_KB.md` and `docs/integrations/MyMoolah_TPPP_Withdrawal_Flow_Diagrams.html` for narrative and ledger excerpts.

## Core Principles
- Closed‑loop: All movements are recorded in MMTP’s immutable ledger (journal entries + lines).
- Pre‑funded: No overdrafts; Supplier and Client floats must have available balance before authorisation.
- Mojaloop‑aligned: Clear payer/payee FSP roles, idempotency, end‑to‑end references, ISO‑like reason codes.
- Banking‑grade: Double‑entry accounting, separation of concerns, reconciliation, and auditability.
- Canonical accounts: See `docs/CHART_OF_ACCOUNTS.md` for the full Chart of Accounts (28 accounts, 15 journal templates, solvency rules, reserved ranges, environment variable map).
- Visual reference: `docs/CHART_OF_ACCOUNTS_VISUAL.html` (print-ready PDF).

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

Note: The canonical Chart of Accounts is documented in `docs/CHART_OF_ACCOUNTS.md`. Account codes follow the `XXXX-YY-ZZ` convention. See also `docs/CHART_OF_ACCOUNTS_VISUAL.html` for a printable reference.

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

## Example Account Code Conventions (implemented)
- **Supplier Float Accounts**: 1200-10-XX format (Asset accounts - prefunded balances payable to suppliers)
  - `1200-10-01`: Zapper Float Account
  - `1200-10-02`: EasyPay Top-up Float Account
  - `1200-10-03`: EasyPay Cash-out Float Account
  - `1200-10-04`: Flash Float Account
  - `1200-10-05`: MobileMart Float Account
  - `1200-10-06`: DTMercury Float Account
- **Client Float Accounts**: Format TBD (liability accounts - client balances)
- **Client Clearing Accounts**: Format TBD
- **Supplier Clearing Accounts**: Format TBD

## Float Account Ledger Integration (2026-01-15)

### **Implementation Status** ✅
All supplier float accounts now have proper ledger account codes linked to the general ledger:
- **Database Field**: `supplier_floats.ledgerAccountCode` (references `ledger_accounts.account_code`)
- **Ledger Posting**: All float movements use `ledgerAccountCode` instead of operational identifiers
- **Compliance**: Banking-grade double-entry accounting with proper chart of accounts structure

### **Float Balance Monitoring** ✅
Automated monitoring service checks all active float account balances hourly:
- **Service**: `FloatBalanceMonitoringService` (runs every hour at minute 0)
- **Thresholds**: 
  - Warning: Balance within 15% above minimum
  - Critical: Balance within 5% above minimum or below minimum
- **Notifications**: Email alerts to suppliers (or CC email) with HTML templates
- **Cooldown**: 24-hour notification cooldown to prevent spam
- **Configuration**: Environment variables for intervals, thresholds, and cooldown periods

### **Float Account Status**
- **Active Floats**: 4 (EasyPay Cash-out, EasyPay Top-up, MobileMart, Zapper)
- **All Configured**: Every float has proper ledger account code and monitoring enabled
- **Documentation**: See `docs/FLOAT_ACCOUNT_LEDGER_INTEGRATION_ISSUE.md` for complete details
