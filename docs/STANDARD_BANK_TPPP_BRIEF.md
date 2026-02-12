# MyMoolah Treasury Platform (MMTP) — T-PPP Sponsor Brief (Standard Bank)

Last updated: 2026-02-12

## Executive Summary

MyMoolah operates a banking‑grade Treasury Platform (MMTP) built to Mojaloop principles. The platform supports:
- Prefunded B2B client floats held in a T‑PPP account at Standard Bank.
- Prefunded supplier floats for VAS (airtime, data, electricity, bill pay) settlement.
- Consumer wallets funded via RTP/RPP into the T‑PPP account using MSISDN as reference.
- Double‑entry ledger with immutable journals, idempotent processing, strict input validation, and atomic transactions.
- Commission recognition with VAT split to VAT Control and net to Commission Revenue for accurate reconciliation.

The net effect is an always‑in‑balance ledger, instant settlement capability to suppliers, and end‑to‑end auditable flows for sponsor oversight.

**PayShap Integration (2026-02-12)**: RPP (outbound) and RTP (Request to Pay) implemented via Standard Bank OneHub. MM SBSA main account used for all flows (no prefunded float). R4 transaction fee (VAT incl) charged to users; VAT split to revenue and VAT control. Deposit notification endpoint credits wallets when reference (CID) = MSISDN. UAT ready; awaiting OneHub credentials. See `docs/SBSA_PAYSHAP_UAT_GUIDE.md` and `docs/integrations/StandardBankPayShap.md`.

## Parties and Accounts

- Standard Bank T‑PPP account(s) (house/master)
  - Receives client prefunding and consumer RTP/RPP deposits (MSISDN reference).
  - Source of prefunding into supplier floats.
- Client Prefunded Float (per B2B client)
  - Liability balance to the client; funds purchases and payouts.
- Supplier Prefunded Float and Clearing (per supplier)
  - Asset/clearing balances that enable immediate settlement when delivering VAS.
- MyMoolah House Accounts
  - Commission/Fees Revenue, VAT Control, Interchange/Clearing Control.
- Consumer Wallets (MM Wallet)
  - Customer balances credited from T‑PPP deposits (MSISDN reference).

## High‑Level Funds Flow

1) Client prefunding (B2B):
   - Client credits T‑PPP account.
   - MMTP posts a journal: House cash ↑, Client Float liability ↑.

2) Consumer deposit (RTP/RPP):
   - Consumer sends to T‑PPP with MSISDN ref.
   - Wallet credited; posting mirrors: House cash ↑, Wallet liability ↑.

3) VAS purchase:
   - Authorization against Client Float or Wallet.
   - Ledger posts lock/settle; Supplier float/clearing receives net; MM commission recognized (VAT split).
   - Supplier delivers service token/top‑up.

4) Reconciliation:
   - Daily TB, aging, and float/clearing reconciliations (client, supplier, house).
   - VAT and revenue ready for statutory returns and management reporting.

### ASCII Diagram (VAS example)

```
Client Float (Liability)     Supplier Clearing/Float (Asset)
        |   (debit)                        ^   (credit)
        v                                   |
 Client Clearing (Liab)  --->  Interchange/Clearing Control  ---> Settlement/Delivery
        |        ^                       ^           |
 (debit) |        | (credit)             | (credit)  | (debit)
        v        |                       |           v
   MM Commission Revenue (credit)   VAT Control (credit)
```

## Security and Atomicity (Code Cues)

Atomic VAS processing (single DB transaction with row lock and idempotency):

```520:629:routes/overlayServices.js
// Wallet row locked, balance checked, VAS + ledger entry committed together
```

Balanced double‑entry journal posting (debit=credit enforced at commit):

```22:68:services/ledgerService.js
// postJournalEntry: validates totals, posts entry + lines in a DB transaction
```

Draft VAS posting pattern (client clearing, supplier clearing, interchange, revenue):

```134:166:services/ledgerService.js
// draftPostVasPurchase: example lines that keep books balanced
```

Commission VAT allocation (internal; hidden from user history, visible in ledger/tax):

```520:740:routes/overlayServices.js
// After VAS commit, commission and VAT are computed and posted via ledgerService
```

## Compliance Posture

- TLS 1.3, strict security headers, input validation, rate limiting, structured logs with PII redaction.
- Idempotent financial endpoints (idempotency keys).
- Immutable audit trail via `JournalEntry` + `JournalLine`.
- VAT handling: commission treated as VAT‑inclusive; VAT portion credited to VAT Control; net to Commission Revenue.
- Separation of duties: user histories show gross only; internal accounting lines are ledger‑only.

## Performance

- Hot paths complete within a single DB transaction (reduced round‑trips).
- DB connection pooling and background index usage for reporting queries.
- Optional Redis caching/queues in non‑authoritative paths; authoritative ledger writes remain ACID.
- Observability: health checks and performance metrics enabled in development/testing; production‑ready.

## Settlement Controls

- Client Float: per‑client limits and validations on authorization.
- Supplier Float: prefund levels monitored; purchases debit net to supplier clearing, ensuring immediate delivery capability.
- Bank Advises (future integration): RTP/RPP and settlement notices from Standard Bank ingested to auto‑reconcile floats and update ledgers (MSISDN/structured refs).

## Evidence (Selected Code References)

- Atomic purchase path and notifications:

```640:739:routes/overlayServices.js
// Successful commit → beneficiary/purchaser notifications, idempotent returns
```

- Journal model definitions:

```1:35:models/JournalEntry.js
// JournalEntry: reference, description, postedAt + index
```

```1:50:models/JournalLine.js
// JournalLine: entryId, accountId, dc, amount, memo + indexes
```

- Ledger account master:

```1:48:models/LedgerAccount.js
// LedgerAccount: code, name, type, normalSide; indexed
```

---

### Submission Note (for Standard Bank)
This brief outlines the end‑to‑end flow of funds, controls, and the corresponding code points that enforce atomicity, balance, auditability, and VAT correctness. It demonstrates that MMTP can operate as a T‑PPP with prefunded floats (clients and suppliers), Mojaloop‑aligned flows, and banking‑grade reconciliation. A full technical due diligence pack (schemas, ERDs, sequence diagrams) is available on request. 


