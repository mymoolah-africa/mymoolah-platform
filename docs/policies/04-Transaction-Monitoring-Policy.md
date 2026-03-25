# Transaction Monitoring & Suspicious Activity Reporting Policy

| Field              | Value                                         |
|--------------------|-----------------------------------------------|
| **Policy Title**   | Transaction Monitoring & Suspicious Activity Reporting Policy |
| **Version**        | 1.0                                           |
| **Effective Date** | March 2026                                    |
| **Next Review**    | March 2027                                    |
| **Classification** | Confidential                                  |
| **Owner**          | Chief Compliance Officer                      |
| **Approved By**    | Board of Directors, MyMoolah (Pty) Ltd        |

---

## 1. Purpose

This policy establishes the framework for monitoring transactions processed through MyMoolah's digital wallet and payment platform, identifying suspicious or unusual activity, and fulfilling statutory reporting obligations to the Financial Intelligence Centre (FIC). It ensures that MyMoolah (Pty) Ltd complies with the Financial Intelligence Centre Act 38 of 2001 (FICA), the Prevention and Combating of Corrupt Activities Act 12 of 2004 (PRECCA), and international standards set by the Financial Action Task Force (FATF).

## 2. Scope

This policy applies to all transactions processed through the MyMoolah platform, including but not limited to:

- Digital wallet deposits, withdrawals, and peer-to-peer transfers
- Value-Added Services (VAS) purchases: airtime, data, electricity, and bill payments
- PayShap Real-Time Payments (RTP) initiated or received via Standard Bank South Africa
- USDC stablecoin cross-border remittances
- NFC-initiated cash deposits
- Float account movements and settlement operations
- Referral reward disbursements

This policy applies to all employees, contractors, and automated systems involved in transaction processing, compliance, and risk management.

## 3. Definitions

| Term | Definition |
|------|------------|
| **CTR** | Cash Threshold Report — mandatory report filed under FICA S28A for cash transactions at or above R24,999.99 |
| **FIC** | Financial Intelligence Centre — South Africa's financial intelligence unit |
| **goAML** | FIC's electronic reporting platform for STR/SAR/CTR submission |
| **SAR** | Suspicious Activity Report — internal report documenting suspected illicit activity |
| **STR** | Suspicious Transaction Report — statutory report filed with FIC under FICA S29 |
| **RTP** | Real-Time Payment — PayShap instant payment via the South African RTP rail |
| **Structuring** | Deliberate fragmentation of transactions to circumvent reporting thresholds |
| **Typology** | A recognised pattern or method of money laundering or terrorist financing |
| **Velocity Check** | Automated control measuring transaction frequency within a defined time window |
| **Float Account** | MyMoolah's pooled settlement account held at Standard Bank South Africa |

## 4. Monitoring System Architecture

### 4.1 Real-Time Monitoring Layer

MyMoolah operates a real-time transaction monitoring system integrated into the Node.js/Express API layer. Every transaction request is evaluated before settlement against the following controls:

- **Redis-backed rate limiting**: Per-user transaction velocity is tracked using Redis key-value stores with TTL-based expiry. The `middleware/rateLimiter.js` module enforces configurable limits per endpoint, per user, and per time window.
- **Per-user transaction limits**: Daily, weekly, and monthly aggregate limits are enforced at the API boundary. Limits are tiered by KYC verification level in accordance with FICA risk-based requirements.
- **Float balance monitoring**: Real-time alerts trigger when the pooled float account at Standard Bank deviates from expected settlement positions by more than a configurable threshold.
- **Parameterized rule engine**: Transaction attributes (amount, frequency, counterparty, geolocation, device fingerprint) are evaluated against configurable rule sets before authorisation.

### 4.2 Batch Monitoring Layer

Batch analysis runs on a scheduled basis (minimum daily) against the PostgreSQL transaction ledger:

- **End-of-day aggregation**: Daily summaries of per-user transaction volumes, amounts, and counterparty diversity.
- **Pattern detection**: SQL-based queries identify structuring patterns, dormant-to-active transitions, and round-tripping across rolling windows.
- **Peer-group analysis**: User behaviour is compared against peer cohorts segmented by KYC tier, registration age, and geographic region.
- **Reconciliation-driven alerts**: The automated multi-supplier reconciliation system flags discrepancies that may indicate transaction manipulation.

### 4.3 Data Retention

All transaction monitoring data, alerts, investigation records, and STR filings are retained for a minimum of five (5) years from the date of the transaction or the date of filing, whichever is later, in compliance with FICA S23.

## 5. Risk-Based Monitoring Rules

### 5.1 Transaction Thresholds

| Threshold | Value | Action |
|-----------|-------|--------|
| Single cash deposit/withdrawal | >= R24,999.99 | Automatic CTR generation (FICA S28A) |
| Aggregate daily transactions per user | >= R25,000 | Automatic CTR review; alert if structured below threshold |
| Single digital transfer | >= R50,000 | Enhanced review; source-of-funds verification |
| Monthly aggregate per user | >= R100,000 | Compliance review; enhanced due diligence trigger |
| USDC cross-border single transfer | >= USD 1,000 | Sanctions screening; jurisdiction risk check |

### 5.2 Mobile Wallet Typologies

The following typologies are monitored as indicators of potential money laundering, terrorist financing, or fraud:

**5.2.1 Structuring (Smurfing)**
Multiple transactions deliberately kept below the R24,999.99 CTR threshold within a rolling 24-hour or 7-day period. Detection rules aggregate per-user transaction values and flag patterns where cumulative amounts exceed thresholds while individual transactions remain just below.

**5.2.2 Rapid Movement of Funds**
Deposits followed by immediate withdrawal or transfer to a different account within a short time window (configurable; default 60 minutes). Indicative of layering.

**5.2.3 Dormant-to-Active Accounts**
Accounts with no transaction activity for 90 or more days that suddenly exhibit high-volume or high-value activity. Batch monitoring flags these transitions for manual review.

**5.2.4 Round-Tripping**
Funds moving through a circular path — deposited to wallet A, transferred to wallet B, transferred to wallet C, returned to wallet A — within a defined period. Graph-based detection identifies circular fund flows across the double-entry ledger.

**5.2.5 VAS Abuse — Airtime as Value Transfer**
Abnormal volumes of airtime or data purchases that exceed reasonable personal consumption, particularly when purchased for multiple distinct mobile numbers. This typology exploits airtime as a de facto value transfer mechanism. Detection rules flag users exceeding configurable daily/weekly VAS purchase thresholds.

### 5.3 PayShap RTP-Specific Monitoring

- **High-frequency RTP initiation**: Users initiating an unusual number of PayShap RTP requests within a short window, potentially indicative of testing or automated abuse.
- **Unusual RTP request patterns**: RTP requests to a high number of distinct counterparties, or repeated RTP requests to the same counterparty for amounts just below monitoring thresholds.
- **RTP rejection rate anomalies**: Users with abnormally high RTP rejection rates, which may indicate social engineering or payment request fraud.

### 5.4 USDC Cross-Border Monitoring

- **Sanctions screening**: All USDC cross-border transactions are screened against OFAC SDN, UN Security Council, EU, and South African targeted financial sanctions lists prior to settlement.
- **Jurisdiction risk**: Transactions involving high-risk jurisdictions as designated by FATF or the South African Reserve Bank are subject to enhanced due diligence.
- **Velocity checks**: Rapid conversion between ZAR and USDC, or high-frequency cross-border transfers, trigger automated alerts.
- **Travel rule compliance**: Originator and beneficiary information is captured and transmitted in accordance with FATF Recommendation 16.

## 6. Alerting and Escalation

### 6.1 Automated Alert Generation

Alerts are generated by the monitoring system and categorised by severity:

| Severity | Definition | Response SLA |
|----------|------------|--------------|
| **Critical** | Confirmed sanctions match; terrorism financing indicator | Immediate escalation to CCO; transaction blocked |
| **High** | Multiple typology triggers; structuring detected; large cross-border anomaly | Review within 4 hours |
| **Medium** | Single typology trigger; threshold breach; dormant-to-active | Review within 24 hours |
| **Low** | Minor anomaly; peer-group deviation; single velocity spike | Review within 72 hours |

### 6.2 Manual Review Process

All alerts classified Medium or above are assigned to a compliance analyst for investigation. The review process includes:

1. Retrieval of full transaction history from the PostgreSQL ledger
2. Review of KYC/FICA documentation and risk rating
3. Assessment against known typologies
4. Determination: (a) false positive — close with documented rationale, (b) genuine suspicion — escalate to STR filing, (c) inconclusive — request additional information or apply enhanced monitoring
5. Documentation of all review steps, findings, and decisions in the case management system

### 6.3 Escalation Matrix

| Level | Role | Trigger |
|-------|------|---------|
| L1 | Compliance Analyst | All Medium and High alerts |
| L2 | Senior Compliance Officer | Unresolved High alerts; complex typologies |
| L3 | Chief Compliance Officer | All Critical alerts; STR filing decisions; regulatory enquiries |
| L4 | Board Risk Committee | Systemic risk indicators; regulatory enforcement actions |

## 7. Suspicious Transaction Reporting

### 7.1 Obligation Under FICA S29

MyMoolah is obligated under FICA Section 29 to report to the FIC any transaction or activity that is known or suspected to:

- Constitute proceeds of unlawful activities
- Be related to money laundering or terrorist financing
- Deviate from the customer's known and expected transaction pattern without reasonable explanation

Reports must be filed within the prescribed period. Where a transaction is in progress and suspected of being related to an offence, reporting must be made as soon as possible.

### 7.2 Cash Threshold Reporting Under FICA S28A

All cash transactions at or above R24,999.99 (or the equivalent in foreign currency) are reported to the FIC via an automated CTR process. This includes NFC-initiated cash deposits processed through the MyMoolah platform.

### 7.3 goAML Filing Procedure

1. The compliance analyst prepares the STR/CTR in the prescribed format
2. The report is reviewed and approved by the Senior Compliance Officer or CCO
3. The report is submitted electronically via the FIC's goAML platform
4. A confirmation receipt is obtained and stored in the case management system
5. All supporting documentation is retained for a minimum of five (5) years
6. Tipping-off is strictly prohibited under FICA S29(4) — no disclosure of the filing to the subject or any unauthorised party

### 7.4 Property Associated with Terrorist Activity

In accordance with FICA S28A(1A), MyMoolah shall report any property that is associated with terrorist activity or a specified entity to the FIC immediately upon identification.

## 8. False Positive Management

Effective monitoring requires continuous calibration to reduce false positive rates without compromising detection sensitivity.

- **Quarterly rule review**: Monitoring rule parameters (thresholds, time windows, scoring weights) are reviewed quarterly against false positive rates and detection efficacy.
- **Tuning governance**: All rule changes require documented justification and approval by the Senior Compliance Officer.
- **False positive rate target**: The platform targets a false positive rate below 70% for Medium alerts and below 50% for High alerts, with continuous improvement.
- **Analyst feedback loop**: Analysts document false positive rationale, which feeds into rule refinement.

## 9. Quality Assurance

- **Monthly sampling**: A random sample of closed alerts (minimum 10%) is reviewed by the Senior Compliance Officer for accuracy, completeness, and consistency.
- **Annual independent review**: An independent audit of the transaction monitoring programme is conducted annually, covering rule effectiveness, STR quality, and regulatory compliance.
- **Regulatory examination readiness**: All monitoring records, rule configurations, and investigation files are maintained in an audit-ready state.

## 10. Roles and Responsibilities

| Role | Responsibility |
|------|---------------|
| **Chief Compliance Officer** | Policy ownership; STR filing approval; regulatory liaison; escalation endpoint |
| **Senior Compliance Officer** | Alert quality assurance; rule tuning governance; L2 escalation review |
| **Compliance Analyst** | Alert investigation; case documentation; STR preparation |
| **Engineering Team** | Monitoring system implementation; Redis rate-limiting configuration; rule engine maintenance |
| **Data Team** | Batch monitoring queries; reconciliation anomaly detection; reporting dashboards |
| **Board Risk Committee** | Oversight of monitoring programme effectiveness; systemic risk review |

## 11. Training

All compliance staff receive training on:

- FICA reporting obligations (S28A, S29) and goAML procedures
- MyMoolah-specific typologies and monitoring system operation
- Tipping-off prohibitions and consequences
- Sanctions screening procedures
- Annual refresher training, with additional training when rules or regulations change

## 12. Regulatory References

| Reference | Description |
|-----------|-------------|
| FICA S28A | Cash threshold reporting (R24,999.99) |
| FICA S29 | Suspicious and unusual transaction reporting |
| FICA S23 | Record retention (minimum 5 years) |
| FICA S29(4) | Prohibition on tipping-off |
| PRECCA S34 | Duty to report corrupt transactions |
| POPIA | Protection of personal information during monitoring |
| NPS Act 78 of 1998 | National Payment System oversight |
| FATF Recommendation 16 | Travel rule for cross-border transfers |
| FATF Recommendation 20 | Reporting of suspicious transactions |
| Basel Committee AML/CFT | Risk-based approach to transaction monitoring |
| ISO 20022 | Payment messaging standard (PayShap alignment) |
| Mojaloop FSPIOP | Financial Services Provider Interoperability Protocol |

## 13. Document Control

| Version | Date | Author | Change Description |
|---------|------|--------|--------------------|
| 1.0 | March 2026 | Chief Compliance Officer | Initial policy creation |

---

*This document is classified as Confidential and is the property of MyMoolah (Pty) Ltd. Unauthorised reproduction or distribution is prohibited.*
