# Withdrawals — Compliance, Security, and Knowledge Base (MMTP)

**Last updated:** 2026-04-16  
**Classification:** Internal — regulatory, security, and support alignment  
**Related artefact:** `docs/integrations/MyMoolah_TPPP_Withdrawal_Flow_Diagrams.html` (print-to-PDF flow diagrams, ledger excerpts, role matrices)  
**Session context:** `docs/session_logs/2026-04-14_2200_tppp-withdrawal-flow-diagrams-legal.md`

---

## 1. Regulatory characterisation (non-negotiable for external comms)

**eeziCash (Flash partner channel)** is a **wallet cash-withdrawal service** operating within the **Third-Party Payment Provider (TPPP)** / sponsor-bank framework (Standard Bank), **not** “VAS voucher resale” or a standalone retail VAS product purchase.

| Correct | Incorrect (do not use in PASA, sponsor-bank, or partner legal comms) |
|--------|------------------------------------------------------------------------|
| Wallet cash withdrawal; user debited **before** a withdrawal credential (PIN) is generated | “Resale of Flash eeziCash voucher PINs” as if the PIN were a VAS product sold to the end customer |
| PIN is a **withdrawal credential** for collection of cash at authorised retail | PIN described as a **VAS airtime/data product** |

**Why it matters:** Misclassification mixes **NPS / e-money wallet** rules with **VAS retail** narratives and weakens AML/CFT, transaction monitoring, and sponsor oversight. The corrected position is aligned with:

- National Payment System Act 78 of 1998 (e.g. s7 — payment instructions)  
- SARB position paper on electronic money in South Africa (NPS 01/2009)  
- Banks Act 94 of 1990 (sponsor bank context)  
- PASA TPPP framework (where applicable)

---

## 2. Withdrawal rails (high level)

MyMoolah supports multiple **outbound** paths from the consumer wallet (each with its own partner, ledger pattern, and monitoring rules):

| Channel | Nature | Compliance / security notes |
|---------|--------|------------------------------|
| **eeziCash (Flash)** | Partner-facilitated **cash** collection after wallet debit | Treat as **cash-out** typology in monitoring; PII redaction in logs per POPIA; double-entry audit trail |
| **EasyPay cash-out** | Retail token / reference for cash | Existing EasyPay float and fee postings; CTR / structuring rules per FICA where cash thresholds apply |
| **EFT / PayShap outbound** | Electronic transfer to bank / RTP | APP fraud typologies, velocity, PayShap-specific monitoring |
| **MobileMart VAS** | Airtime, data, electricity, bill pay | **Purchase** typology — not a substitute for eeziCash legal characterisation |

Canonical sponsor brief (high level): `docs/STANDARD_BANK_TPPP_BRIEF.md`.  
Float references: `docs/SETTLEMENTS.md` (e.g. EasyPay cash-out float, Flash float).

---

## 3. AML / CFT / transaction monitoring

**Primary policies:**

- `docs/policies/01-AML-CFT-Policy.md` — wallet cash withdrawals in scope; dedicated subsection on eeziCash characterisation  
- `docs/policies/03-Sanctions-Policy.md` — screening scope includes cash-out rails  
- `docs/policies/04-Transaction-Monitoring-Policy.md` — cash-out typologies, structuring, rapid movement, CTR context  
- `docs/policies/05-Fraud-Prevention-Policy.md` — account takeover, social engineering on withdrawals  
- `docs/policies/02-KYC-CDD-Policy.md` — tier limits and CDD for cash-out and high-value outflows  

**Control themes:** velocity, peer-group deviation, dormant-to-active, structuring around **R24,999.99** CTR threshold where cash or partner-reported cash events apply, cross-channel correlation (wallet → cash-out → RTP).

---

## 4. Information security and POPIA

- `docs/security.md` — platform security posture and logging expectations  
- `docs/policies/13-Information-Security-Policy.md` — structured logging, PII redaction, audit retention  

Withdrawal flows must not leak MSISDNs, ID numbers, or full PINs in application logs. Meter numbers and addresses follow existing **VAS PII redaction** standards where shared services log both VAS and cash channels.

---

## 5. Knowledge base and customer-facing content

**Authoritative customer FAQ:** `docs/FAQ_MASTER.md` — withdrawals and eeziCash (distinguish **eeziPay / eeziAirtime / eeziPower** VAS redemption from **eeziCash wallet cash withdrawal**).

**AI support / RAG:**

- `docs/AI_SUPPORT_SYSTEM.md` — LangChain RAG over `ai_knowledge_base`; run `npm run embed:kb` after seeding new entries  
- `docs/BANKING_GRADE_SUPPORT_SYSTEM.md` — legacy banking-grade support narrative and KB history  

**When adding KB rows** (scripts such as `scripts/seed-support-knowledge-base.js` or dedicated seed scripts):

1. Use language consistent with this document and `FAQ_MASTER.md`.  
2. Never describe eeziCash as “buying a VAS voucher to resell.”  
3. Link internal agents to `MyMoolah_TPPP_Withdrawal_Flow_Diagrams.html` for flow and ledger wording.  

**Suggested KB categories / intents:** `withdrawal`, `eezicash`, `easypay-cashout`, `cash-out-limits`, `tppp`, `flash-cash`.

---

## 6. Engineering and zero-shortcuts

- `docs/ZERO_SHORTCUTS_POLICY.md` — product and enum modelling must reflect **actual** legal/economic substance (cash withdrawal vs VAS).  
- `docs/CURSOR_2.0_RULES_FINAL.md` / `.cursor/rules/` — rules still override any third-party skill text.  

---

## 7. Change control

Any change to Flash / EasyPay / EFT / PayShap withdrawal behaviour, limits, or ledger accounts must update:

1. `docs/integrations/MyMoolah_TPPP_Withdrawal_Flow_Diagrams.html` (if flows change)  
2. Relevant policies in `docs/policies/`  
3. `docs/FAQ_MASTER.md` and KB seeds  
4. `docs/CHANGELOG.md`  

---

*This hub document is maintained by the compliance and engineering documentation owners. For handover status see `docs/AGENT_HANDOVER.md`.*
