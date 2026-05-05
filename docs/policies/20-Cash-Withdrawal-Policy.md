# Cash Withdrawal & Ring-Fencing of Own Funds Policy

| Field | Detail |
|---|---|
| **Policy Title** | Cash Withdrawal & Ring-Fencing of Own Funds Policy |
| **Policy Reference** | POL-020 |
| **Version** | 1.3 |
| **Effective Date** | 20 April 2026 |
| **Next Review Date** | April 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Compliance Officer |
| **Approved By** | Board of Directors, MyMoolah (Pty) Ltd |

---

## 1. Purpose & Scope

This policy establishes the legal and operational position of MyMoolah Treasury Platform (Pty) Ltd ("MMTP") regarding wallet **cash withdrawals**. Its primary purpose is to ensure that MMTP does **not**, in form or in substance, conduct "the business of a bank" as defined in section 1 of the Banks Act 94 of 1990 ("Banks Act"), and that all MMTP cash-withdrawal products remain within the scope of the Banks Act Exemption Notices applicable to non-bank payment and e-money schemes.

It applies to every wallet **cash-withdrawal rail** supported by the platform, including cash-withdrawal references and credentials issued via any **Cash-Withdrawal Partner**. Current and contemplated Cash-Withdrawal Partners include, without limitation:

- **eeziCash** (Flash Group) — cash collection at Flash-enabled retailers against a PIN withdrawal credential
- **EasyPay retail cash-withdrawal** — cash collection at EasyPay retailers against a reference/token credential
- **Cliquefin / OTT cash-withdrawal references** — cash collection at OTT-enabled retailers and Flash trader points against an OTT voucher credential
- **USSD cash-withdrawal** — wallet cash-withdrawal initiated via USSD channel, redeemed through any of the above partner networks
- Any future cash-withdrawal, cash-dispense, or cash-equivalent credential mechanism integrated into the MMTP platform.

It applies to every wallet holder, every inbound deposit rail, every MMTP employee, contractor, and every Cash-Withdrawal Partner and third-party service provider involved in the cash-withdrawal chain.

---

## 2. Regulatory Basis

This policy operationalises MMTP's compliance with, and is anchored in, the following:

| Instrument | Relevance |
|---|---|
| **Banks Act 94 of 1990**, s1 (definition of "deposit") and s11 (prohibition on the business of a bank without registration) | Non-bank entities must not accept amounts from the public subject to an obligation to repay, whether or not conditional on withdrawal — unless an Exemption Notice applies and customer funds are ring-fenced in a sponsor-bank-held segregated account. |
| **SARB Position Paper NPS 01/2020 on Electronic Money** | E-money may only be issued by a registered bank; non-bank schemes must ring-fence customer float in a sponsor-bank-held segregated account separate from operator own-funds. |
| **National Payment System Act 78 of 1998** | Framework for the National Payment System, under SARB NPSD oversight. |
| **PASA SO / TPPP framework** (SO Directive 2 of 2007; authorisation.pasa.org.za) | Third-Party Payment Provider registration via a sponsoring bank. |
| **Financial Intelligence Centre Act 38 of 2001 (FICA)** | CDD, STR, CTR, record-keeping; cash-withdrawal typologies monitored under POL-004. |
| **Protection of Personal Information Act 4 of 2013 (POPIA)** | Lawful processing of remitter / wallet-holder data used in deposit classification. |
| **SARB Draft Directive on Payment Activities** (revised draft, 14 November 2025) | Forthcoming activity-based authorisation framework; MMTP will engage Standard Bank proactively as the licensing transition clarifies. |

The central legal thesis of this policy is that, because **own funds** deposited into a MMTP wallet cannot be withdrawn in cash through any mechanism, those funds do not give rise to an obligation on MMTP to "repay" a deposit in the sense contemplated by Banks Act s1. Only **third-party funds received for the wallet holder** may be paid out in cash, and those payments are effected as the delivery of a payment due to the wallet holder from an identified third party — a payment-system activity, not deposit-taking.

---

## 3. Definitions

| Term | Definition |
|---|---|
| **Own Funds** | Any amount credited to a wallet from a source where the remitting account holder is, or is reasonably determined to be, the same natural person as the wallet holder (see §6). Includes self-EFT from the wallet holder's own bank account, self-initiated PayShap credits, self-loaded NFC/Halo deposits, and all voucher-based cash-in (1Voucher, FNB Voucher, Flash Pay). |
| **Third-Party Funds** | Any amount credited to a wallet from a source where the remitter is a distinct legal or natural person (e.g. an employer paying salary, a corporate client's disbursement run, a loan disbursement, a P2P transfer from another wallet holder, a VAS commission credit). |
| **Cash Withdrawal** | Any mechanism that converts digital wallet value into physical currency in the hands of the wallet holder or a bearer of a cash-redemption credential, at a merchant, retailer, trader, ATM, or other cash point. |
| **Cash-Withdrawal Credential** | A PIN, reference number, barcode, or token issued by MMTP (directly or via a Cash-Withdrawal Partner) that entitles the bearer to receive physical cash at a cash point. Examples: an eeziCash PIN, an EasyPay cash-withdrawal token, a Cliquefin / OTT cash-withdrawal credential. |
| **Cash-Withdrawal Partner** | A third-party service provider integrated into MMTP that accepts a Cash-Withdrawal Credential at its retail/trader network and dispenses the corresponding cash. Current and contemplated partners include Flash Group (eeziCash), EasyPay, and Cliquefin (OTT). |
| **Ring-Fenced Balance** | The portion of the wallet balance classified as Own Funds (plus voucher deposits) and therefore not eligible to fund any Cash Withdrawal rail. Represented technically as `wallets.restricted_balance`. |
| **Unrestricted Balance** | `balance − restricted_balance`. Only this portion may fund a Cash Withdrawal. |
| **Sponsor Bank** | Standard Bank of South Africa Limited, under whose sponsorship MMTP operates in the National Payment System. |

---

## 4. Core Rule — Ring-Fence of Own Funds

4.1 **Own Funds are ring-fenced.** No portion of a wallet holder's Own Funds may, under any circumstance, be paid out as physical cash through any MMTP rail, direct or indirect.

4.2 **Third-Party Funds may be cashed out.** A wallet holder may use Third-Party Funds credited to their wallet to fund a Cash Withdrawal, subject to KYC tier limits, FICA controls, transaction-monitoring rules, and the ordinary fees for the selected rail.

4.3 **No "Cash-Available" figure is displayed.** The wallet user interface does not surface a numeric cash-available figure. A user who attempts a Cash Withdrawal in excess of the Unrestricted Balance is presented with a standardised restriction modal explaining the rule and pointing to permitted uses of Own Funds.

4.4 **No exceptions.** The ring-fence on Own Funds is absolute. Customer-service agents, compliance officers, executives, and engineers have **no override capability** that would allow Own Funds to be paid out as cash. Suspected exceptions must be escalated under POL-010 (Whistleblowing).

---

## 5. Permitted Uses of Own Funds

Own Funds remain fully usable by the wallet holder for every **non-cash** purpose supported by the platform, including:

- Wallet-to-wallet transfers to other MMTP users
- PayShap Rapid Payments Programme (RPP) transfers to external bank accounts
- EFT / H2H outbound payments
- Bill payments (EasyPay bill receivers, municipal accounts)
- Prepaid airtime, data, electricity, and other VAS purchases
- QR-code merchant payments (in-app)
- NFC tap-to-pay at participating merchants
- Digital voucher purchases that are **not** cash-equivalent (e.g. gift cards, gaming PINs)
- Cross-border remittances via the MoolahMove / USDC corridor (subject to POL-003 Sanctions and POL-004 Monitoring)

Own Funds may **not** fund:

- eeziCash PIN purchases (Flash Group) through all channels
- EasyPay cash-withdrawal token/voucher issuance
- Cliquefin / OTT cash-withdrawal credential issuance
- USSD cash-withdrawal via any Cash-Withdrawal Partner network
- Any future cash-withdrawal, cash-dispense, or cash-equivalent credential mechanism

---

## 6. Classification Mechanism — Name-Match at Ingress

6.1 **Policy principle.** Every inbound deposit is classified at the moment of credit as either Own Funds (restricted) or Third-Party Funds (unrestricted). Classification is automated, deterministic, auditable, and biased toward safety (a deposit that cannot be confidently classified as third-party defaults to restricted).

6.2 **Deposit-source taxonomy.**

| `fundOrigin` | Description | Treatment |
|---|---|---|
| `own_funds` | Remitter identity name-matches the FICA-verified wallet-holder name | Restricted |
| `third_party_credit` | Remitter is a distinct legal/natural person (employer, client, another wallet holder, etc.) | Unrestricted |
| `voucher_deposit` | Flash voucher redemption (1Voucher, FNB Voucher, Flash Pay) | Restricted (per POL-001 §9A and the MMTP/Flash undertaking) |
| `unknown` | Remitter name unavailable, malformed, or classification indeterminate | Restricted (conservative default) |

6.3 **Rail rules.**

- **MMTP Disbursement Rail** (payroll, wages, loans, bulk-pay) — always `third_party_credit`. No name-match required; the rail identity is sufficient.
- **SBSA Deposit Notification (inbound EFT)** and **SBSA PayShap RTP** — run name-match against the FICA-verified wallet-holder name; match → `own_funds`, no-match → `third_party_credit`.
- **NFC / Halo Dot self-load** — always `own_funds` (by rail definition).
- **Flash voucher redemption** — always `voucher_deposit`.
- **Any inbound rail without a verifiable remitter name** — `unknown` (restricted).

6.4 **Matching method.** Name normalisation (lowercase, diacritic strip, title/honorific removal, initials expansion) followed by a scored similarity function. The threshold, scoring band for manual review, and the precise algorithm are set out in the engineering-facing document `docs/OWN_FUNDS_RINGFENCE_IMPLEMENTATION_PLAN.md` and are tunable only by the Chief Compliance Officer in conjunction with the Chief Technology Officer.

6.5 **Dispute procedure.** A wallet holder who believes a deposit has been mis-classified may raise a dispute via in-app support. MMTP Compliance resolves the dispute using the immutable classification audit record (remitter name, wallet-holder name, similarity score, decision, timestamp). Re-classification requires four-eyes approval (Compliance Analyst + CCO designate). No re-classification may retroactively enable a Cash Withdrawal that has already been blocked; the customer must initiate a new Cash Withdrawal after re-classification.

---

## 7. System Controls

7.1 **Wallet-level enforcement.** The method `Wallet.prototype.canCashOut` (a pre-existing internal identifier retained for code-level continuity) evaluates `balance − restricted_balance ≥ amount` before every cash-withdrawal debit. Every cash-withdrawal endpoint — eeziCash PIN purchase, EasyPay cash-withdrawal token issuance, Cliquefin / OTT cash-withdrawal credential issuance, USSD cash-withdrawal, and any future equivalent — must route through this guard. A transaction that fails the check returns the standardised error code `WALLET.CASH_WITHDRAW_RESTRICTED` and triggers the user-facing modal.

7.2 **Ledger-level enforcement.** Restriction is posted atomically with the deposit as a Journal Entry to the sub-liability account `2100-01-02` ("Client Float Liability — Restricted"). When a wallet spends Ring-Fenced funds on a permitted (non-cash) rail, a FIFO release Journal Entry reverses the restriction for the spent amount. Every entry is SHA-256 hash-chained and immutable.

7.3 **Reconciliation.** An hourly automated reconciliation asserts that `SUM(wallets.restricted_balance) == Net credit balance of account 2100-01-02`. Any variance greater than R0.01 raises an immediate alert to the on-call engineer and the CCO.

7.4 **Audit trail.** Every classification decision is recorded in the append-only table `deposit_classification_audit` with the remitter name, wallet-holder name, similarity score, decision, threshold in effect at the time, rail, and any manual override. Records are retained for no less than five years in accordance with POL-007 (Data Retention).

7.5 **Blocked-attempt logging.** Every blocked Cash Withdrawal attempt generates a log entry with user, amount, rail, `restricted_balance`, and `unrestricted_balance` at the time of attempt. Patterns of repeated blocked attempts feed the transaction-monitoring rule family defined in POL-004 §5.2.7.

7.6 **Velocity count caps.** In addition to the tier-level value limits in POL-002, every Cash Withdrawal is subject to count-based velocity caps, enforced per wallet holder across **all** Cash-Withdrawal Partners combined:

| Control | Tier 0 | Tier 1 | Tier 2 |
|---|:-:|:-:|:-:|
| Cash Withdrawal permitted? | No | Yes | Yes |
| Max Cash Withdrawals per **rolling 60 minutes** | n/a | **2** | **3** |
| Max Cash Withdrawals per **rolling 24 hours** | n/a | **3** | **5** |
| Max Cash Withdrawals per **calendar month** | n/a | **15** | **30** |
| Unique Cash-Withdrawal Partners per 24 h before step-up | n/a | **2** | **3** |
| Unique redemption retailers / traders per 24 h before step-up | n/a | **3** | **5** |

A Cash Withdrawal attempt that would breach a count cap is rejected with error code `WALLET.CASH_WITHDRAW_VELOCITY_EXCEEDED` and generates a POL-004 §5.2.8 alert.

7.7 **Aggregation triggers (FICA-aligned).** Regardless of count caps, cumulative cash-withdrawal activity across all Cash-Withdrawal Partners produces:

- **≥ R24,999.99 in rolling 24 h** → enhanced review flag (no auto-block); FICA Reg monitoring threshold.
- **≥ R49,999.99 in rolling 24 h** → automated `goAML` Cash Threshold Report filing and a compliance hold on further Cash Withdrawals for the remainder of the calendar day (per FICA s28 and GN 3287).
- **≥ 80 % of the applicable tier daily value cap within any 2-hour window** → rapid-deployment flag; next Cash Withdrawal attempt requires OTP step-up authentication.

7.8 **Structuring detection.** The following count-and-value patterns, observed across any Cash-Withdrawal Partner, raise an alert to Compliance:

- ≥ 3 Cash Withdrawals in rolling 24 h, each ≥ R2,000 and each below the applicable per-credential partner ceiling (structuring around partner ceilings).
- ≥ 5 Cash Withdrawals in rolling 7 days where the product (amount × count) reaches ≥ 90 % of the applicable tier monthly value cap (layering).
- Third-party credit followed by a Cash Withdrawal of ≥ 70 % of that credit amount within 60 minutes (suspected money-mule).

7.9 **Channel-rotation detection.** Use of **two or more distinct Cash-Withdrawal Partners by the same wallet holder within rolling 60 minutes** raises a soft alert. Use of **three or more distinct Cash-Withdrawal Partners within rolling 4 hours** raises a hard block pending compliance review.

7.10 **Step-up & compliance hold.**

- At **80 %** of any 24-hour count cap, the next Cash Withdrawal attempt requires OTP step-up authentication (independent of device trust).
- At **100 %** of any 24-hour count cap, further Cash Withdrawal attempts that day are placed in a **pending-review** state (not surfaced as a hard refusal); the compliance review must be completed within 2 hours or the attempt expires and must be re-initiated.
- Manual override of a velocity block is permitted only with maker-checker approval (Ops Lead + CCO delegate), is fully logged to the immutable audit trail, and never applies to Own Funds — §4.4 absolute rule stands.

7.11 **Implementation staging.** Velocity enforcement is implemented and rolled out in accordance with the phased plan in `docs/OWN_FUNDS_RINGFENCE_IMPLEMENTATION_PLAN.md` (Phase 3). Until enforcement is live, the thresholds in §7.6 – §7.10 constitute the authoritative policy configuration and are mirrored in `config/kycTierLimits.js` and `config/cashWithdrawalVelocity.js` as a single source of truth. The Compliance function retains the right to operate detection in log-only mode during initial rollout.

---

## 8. FICA / AML Alignment

8.1 **CDD.** All MMTP wallet holders are FICA-verified at onboarding under POL-002 (KYC/CDD). The wallet holder is, in every case, the originating transactor for any Cash-Withdrawal Credential issued from their wallet.

8.2 **CTR / STR.** Cash Withdrawals are monitored against the R24,999.99 enhanced-review threshold and the R49,999.99 FICA Cash Threshold Report trigger. Velocity, structuring, channel-rotation, and rapid deposit-to-withdrawal patterns are enforced per §7.6 – §7.10 and routed into the POL-004 §5.2.8 rule family; qualifying cases produce a CTR filing via goAML and, where the pattern is suspicious rather than merely threshold-crossing, an STR filing.

8.3 **PIN-/token-only redemption risk.** MMTP acknowledges that every cash-withdrawal credential currently supported (eeziCash PIN, EasyPay token/voucher, Cliquefin / OTT voucher) involves PIN- or token-only cash dispensing at the merchant/trader point, without independent identity verification of the physical cash recipient. This risk is mitigated by:

- The maximum per-credential value configured by each Cash-Withdrawal Partner (e.g. R500 per eeziCash PIN; partner-specific ceilings for EasyPay and Cliquefin / OTT)
- Full FICA verification of the wallet holder as the originating transactor
- End-to-end digital audit trail from wallet debit through voucher generation to partner redemption confirmation
- Transaction-monitoring rules for unusual voucher-generation patterns (POL-004)
- The ring-fence itself, which ensures only Third-Party Funds (traceable to an identified remitter) can fund a Cash Withdrawal

8.4 **Sponsor-bank reporting chain.** MMTP proposes, and is committed to, a multi-party FICA compliance protocol among MMTP, its sponsor bank (currently Standard Bank), and each Cash-Withdrawal Partner (Flash, EasyPay, Cliquefin / OTT, and any successor). The protocol allocates CTR and STR responsibilities across the cash-withdrawal chain end-to-end. This proposal is formally reflected in the MMTP letter to Standard Bank (see §10).

---

## 9. Governance

| Aspect | Detail |
|---|---|
| **Owner** | Chief Compliance Officer |
| **Review cadence** | Annual, and within 30 days of any material change to a cash-withdrawal rail or Cash-Withdrawal Partner, the SARB Draft Directive on Payment Activities, the NPS Act, the Banks Act, or any applicable Exemption Notice. |
| **Tuning authority** | Name-match threshold and scoring band changes require joint CCO + CTO sign-off, recorded in the policy change log (Appendix B). |
| **Override policy** | No override may enable a Cash Withdrawal from Own Funds. Classification overrides (re-tagging a deposit as `third_party_credit`) require four-eyes approval and are recorded in `deposit_classification_audit`. |
| **Training** | Included in the mandatory annual compliance curriculum under POL-017. |
| **Independent review** | Reviewed annually under POL-018 (Compliance Review & Audit). |

---

## 10. Related Policies & Documents

- **POL-001** — Anti-Money Laundering & Counter-Terrorism Financing
- **POL-002** — Know Your Customer & Customer Due Diligence
- **POL-004** — Transaction Monitoring & Suspicious Activity Reporting
- **POL-005** — Fraud Prevention & Detection
- **POL-007** — Data Retention & Records Management
- **POL-013** — Information Security
- **POL-017** — Compliance Training & Awareness
- **POL-018** — Independent Compliance Review & Audit
- **Hub** — `docs/WITHDRAWALS_COMPLIANCE_AND_KB.md`
- **Engineering plan** — `docs/OWN_FUNDS_RINGFENCE_IMPLEMENTATION_PLAN.md`
- **Flash undertaking** — `docs/FLASH_VOUCHER_RINGFENCING_UNDERTAKING.md`
- **Standard Bank letter** — `docs/policies/2026-04-20_StandardBank_CashWithdrawal_Policy_Letter.html`
- **Terms & Conditions** — `docs/TERMS_AND_CONDITIONS.md` §4.4

---

## Appendix A — Worked Examples

**Example A1 — Own-deposit blocked.** User A has R0 in their wallet. User A transfers R1,000 from their Capitec account (same name) into their MMTP wallet via SBSA deposit-notification rail. The classifier name-matches the remitter against the FICA-verified wallet-holder name, scores 0.97, and tags the deposit `own_funds`. Wallet state: `balance = R1,000`, `restricted_balance = R1,000`, unrestricted = R0. User A attempts to issue an R500 cash-withdrawal credential (via any Cash-Withdrawal Partner — eeziCash, EasyPay, or Cliquefin / OTT). The wallet-level guard returns `allowed = false`. The user sees the restriction modal. The funds remain available for PayShap, VAS, bill payments, etc.

**Example A2 — Salary credit cash-withdrawal allowed.** User B's employer, Acme (Pty) Ltd, runs a payroll disbursement through the MMTP Disbursement Rail, crediting R5,000 to User B's wallet. The rail classifies the credit as `third_party_credit` by rail identity; no name-match needed. Wallet state: `balance = R5,000`, `restricted_balance = R0`, unrestricted = R5,000. User B issues an R500 cash-withdrawal credential and collects cash at a participating Cash-Withdrawal Partner retailer or trader. Permitted.

**Example A3 — Mixed balance, FIFO release.** User C holds `balance = R1,500` of which `restricted_balance = R1,000` (own deposit) and R500 is from a P2P transfer from another wallet holder (third-party credit). User C spends R800 on electricity (a permitted non-cash rail). The release logic first reduces `restricted_balance` by min(R1,000, R800) = R800 (FIFO within the Ring-Fenced pool). Post-spend state: `balance = R700`, `restricted_balance = R200`, unrestricted = R500. User C may now withdraw cash up to R500 through any Cash-Withdrawal Partner.

**Example A4 — Unknown remitter defaults to restricted.** An inbound EFT arrives with a malformed debtor-name field. The classifier cannot determine a match; `fundOrigin = unknown`; treated as restricted. User may raise a dispute (§6.5).

---

## Appendix B — Change Log

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 20 April 2026 | MyMoolah Compliance | Initial issue. Establishes the Own-Funds ring-fence, the name-match classification mechanism (single-pool `restricted_balance`), the no-Cash-Available UX rule, and the tri-party FICA-protocol proposal. |
| 1.1 | 20 April 2026 | MyMoolah Compliance | Terminology alignment: adopted "Cash Withdrawal" (not "cash-out") as the canonical term throughout; introduced the generic "Cash-Withdrawal Partner" category covering eeziCash (Flash), EasyPay, and Cliquefin / OTT cash-withdrawal references; widened the multi-party FICA protocol to cover all Cash-Withdrawal Partners in addition to the sponsor bank. No change to the substantive ring-fence rule or classification mechanism. |
| 1.2 | 20 April 2026 | MyMoolah Compliance | Added §7.6 – §7.11 — count-based velocity caps per tier (Tier 1: 2/60 m, 3/24 h, 15/month; Tier 2: 3/60 m, 5/24 h, 30/month), FICA-aligned aggregation triggers (R24,999.99 review; R49,999.99 CTR auto-file), structuring detection, channel-rotation detection, step-up and pending-review mechanics, and a staged-enforcement clause. §8.2 updated to reference the new rule family. Thresholds mirrored in `config/kycTierLimits.js` and `config/cashWithdrawalVelocity.js`. No change to the Own-Funds ring-fence rule. |
| 1.3 | 20 April 2026 | MyMoolah Compliance | Legal-characterisation alignment: replaced "sponsor-bank trust posture" and "sponsor-bank-held trust account" with "sponsor-bank-held segregated account" in the §5 regulatory framework table, to consistently reflect MyMoolah's legal position that customer float is held in segregated accounts at the sponsor bank (not trust accounts). No change to the substantive ring-fencing, segregation, or reconciliation controls. |

---

*This policy is the property of MyMoolah (Pty) Ltd and is classified as Confidential. Unauthorised distribution is prohibited.*
