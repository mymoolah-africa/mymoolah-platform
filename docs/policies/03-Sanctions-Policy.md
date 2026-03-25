# Sanctions Screening & Compliance Policy

| Field | Detail |
|---|---|
| **Policy Title** | Sanctions Screening & Compliance Policy |
| **Version** | 1.0 |
| **Effective Date** | March 2026 |
| **Next Review Date** | March 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Compliance Officer |
| **Approved By** | Board of Directors, MyMoolah (Pty) Ltd |

---

## 1. Purpose

This policy establishes the framework through which MyMoolah (Pty) Ltd ("MyMoolah") ensures compliance with domestic and international sanctions regimes. It defines the sanctions lists screened, screening triggers, methodology, escalation procedures, and record-keeping obligations to prevent MyMoolah from facilitating transactions with sanctioned persons, entities, or jurisdictions.

Given MyMoolah's USDC cross-border capability (via VALR) and MoolahMove international payment service, sanctions compliance is of paramount importance. Failure to screen effectively exposes the platform, its sponsor bank (Standard Bank of South Africa), and the South African financial system to legal, reputational, and operational risk.

---

## 2. Scope

This policy applies to:

- All customers, counterparties, and beneficial owners of MyMoolah accounts.
- All transactions processed through the MyMoolah platform, including domestic wallet transfers, PayShap real-time payments, VAS purchases, NFC deposits, USDC cross-border transfers, and MoolahMove international payments.
- All employees, contractors, and third-party service providers.
- All jurisdictions in which MyMoolah operates or to which it facilitates fund flows.
- Both the originator and beneficiary of every transaction, where identifiable.
- The entire customer lifecycle — onboarding, transaction processing, periodic review, and relationship termination.

---

## 3. Definitions

| Term | Definition |
|---|---|
| **Blocked Person** | An individual or entity appearing on a sanctions list, with whom all dealings are prohibited. |
| **Designated Person** | A person or entity designated under South African or international sanctions legislation. |
| **OFAC** | Office of Foreign Assets Control — the U.S. Treasury Department office administering and enforcing economic sanctions. |
| **Sanctions** | Legal prohibitions and restrictions on dealings with designated persons, entities, countries, or sectors, imposed by governments or international bodies. |
| **SDN List** | Specially Designated Nationals and Blocked Persons List, maintained by OFAC. |
| **VASP** | Virtual Asset Service Provider — an entity that provides services involving virtual assets (crypto-assets), as defined by the FATF. |
| **EDD** | Enhanced Due Diligence — additional verification and monitoring measures applied to higher-risk customers and transactions. |
| **False Positive** | A screening alert that, upon investigation, is determined not to be a true match against a sanctioned person or entity. |
| **Fuzzy Matching** | An algorithmic technique that identifies potential matches even where names are misspelled, transliterated, or partially matching. |

---

## 4. Sanctions Lists Screened

MyMoolah screens all customers and transactions against the following sanctions lists:

### 4.1 Primary Lists

| List | Issuing Authority | Update Frequency |
|---|---|---|
| OFAC Specially Designated Nationals (SDN) List | U.S. Department of the Treasury | Real-time (within 24 hours of publication) |
| OFAC Consolidated Sanctions List | U.S. Department of the Treasury | Real-time |
| UN Security Council Consolidated Sanctions List | United Nations | Within 24 hours of publication |
| EU Consolidated List of Persons, Groups and Entities Subject to Financial Sanctions | European Union | Within 24 hours of publication |
| South African Targeted Financial Sanctions List | Financial Intelligence Centre (FIC) | Within 24 hours of publication |
| UK Office of Financial Sanctions Implementation (OFSI) List | HM Treasury | Within 48 hours of publication |

### 4.2 Supplementary Lists

- FATF High-Risk and Other Monitored Jurisdictions lists (grey list and black list).
- Interpol Red Notice database (for PEP and high-risk screening).
- Adverse media screening databases.

### 4.3 List Maintenance

- Sanctions list updates are ingested automatically into MyMoolah's screening infrastructure.
- The Compliance team is responsible for verifying successful list updates and documenting any delays.
- A log of all list update timestamps is maintained for audit purposes.

---

## 5. Screening Triggers

Sanctions screening is performed at the following points:

### 5.1 Customer Lifecycle Triggers

| Trigger | Screening Type |
|---|---|
| **Account creation (onboarding)** | Full screening against all primary lists. Name, ID number, date of birth, nationality. |
| **KYC tier upgrade** | Full re-screening with any new information provided. |
| **Periodic review** | Full re-screening at intervals determined by customer risk rating (see KYC/CDD Policy). |
| **Change of customer details** | Re-screening on updated name, address, or nationality. |
| **Adverse media alert** | Immediate re-screening and EDD assessment. |

### 5.2 Transaction-Level Triggers

| Trigger | Screening Type |
|---|---|
| **USDC cross-border transfer (outbound)** | Real-time screening of beneficiary name, wallet address (where attributable), and destination country against all lists. Implemented in `services/usdcTransactionService.js`. |
| **USDC cross-border transfer (inbound)** | Real-time screening of originator details. |
| **MoolahMove international payment** | Real-time screening of beneficiary and originator. Implemented in `services/internationalPaymentService.js`. |
| **PayShap transaction above R10,000** | Screening of counterparty details. |
| **Domestic transfer above R24,999.99** | Screening of counterparty details. |
| **Any transaction involving a high-risk jurisdiction** | Full screening of all parties. |

### 5.3 Periodic Rescreening

All active customers are rescreened against updated sanctions lists on the following schedule:

| Customer Risk Rating | Rescreening Frequency |
|---|---|
| Low | Every 12 months |
| Medium | Every 6 months |
| High / PEP | Every 3 months |
| Platinum tier (USDC-enabled) | Every 3 months, plus real-time transaction screening |

---

## 6. Blocked and High-Risk Jurisdictions

### 6.1 Blocked Jurisdictions

MyMoolah shall not process any transaction — whether in ZAR, USDC, or any other currency or crypto-asset — to, from, or involving the following jurisdictions:

- **Cuba**
- **Iran**
- **North Korea (DPRK)**
- **Syria**
- **Russia** (comprehensive sanctions)
- **Russian-occupied territories of Ukraine** (Crimea, Donetsk, Luhansk, Zaporizhzhia, Kherson)

Any attempt to initiate a transaction involving a blocked jurisdiction shall be:

1. Automatically rejected by the platform.
2. Flagged for immediate compliance review.
3. Reported to the FIC if there are grounds to suspect sanctions evasion.

### 6.2 High-Risk Jurisdictions Requiring EDD

Transactions involving the following jurisdictions require Enhanced Due Diligence and senior compliance approval before processing:

- Countries on the FATF grey list (currently includes South Africa — internal controls must therefore exceed minimum standards).
- Countries with known deficiencies in AML/CFT frameworks as identified by the FATF.
- Countries subject to partial or sectoral sanctions.
- Any jurisdiction added to the MyMoolah internal high-risk list by the CCO based on risk assessment.

The high-risk jurisdiction list is reviewed quarterly and updated in the platform's configuration.

---

## 7. Screening Methodology

### 7.1 Automated Screening

MyMoolah implements automated sanctions screening integrated into the Node.js backend, operating at the following stages:

**Onboarding Screening**
- Customer name, ID number, date of birth, and nationality are screened against all primary lists upon account creation.
- Screening uses fuzzy matching algorithms with configurable thresholds to account for name transliterations, misspellings, and alternative spellings.
- Match score threshold: alerts generated for matches at 80% confidence or above.

**Transaction Screening**
- For USDC cross-border transactions (`services/usdcTransactionService.js`), the beneficiary name, wallet address metadata (where available), and destination country are screened in real-time prior to transaction execution.
- For MoolahMove international payments (`services/internationalPaymentService.js`), originator and beneficiary details are screened against all primary lists.
- Transactions are held in a pending state until screening is complete. No funds are released prior to screening clearance.

**Batch Rescreening**
- Periodic rescreening is executed as a batch process against the full customer base, segmented by risk rating.
- Results are logged and alerts generated for new or changed matches.

### 7.2 Manual Review

All automated screening alerts are escalated to the Compliance team for manual investigation. Manual review includes:

- Comparison of customer details (full name, date of birth, nationality, ID number) against the sanctioned person's identifying information.
- Assessment of contextual information (address, known associates, business activities).
- Determination of whether the alert constitutes a true match, a partial match requiring further investigation, or a false positive.
- Documentation of the review decision and rationale.

---

## 8. False Positive Handling

### 8.1 Definition

A false positive occurs when the automated screening system generates an alert for a customer or counterparty who is determined, upon manual investigation, not to be the sanctioned person or entity.

### 8.2 Procedure

1. Alert is received by the Compliance team via the internal alert queue.
2. Analyst conducts manual review comparing all available identifying information.
3. If determined to be a false positive:
   - The alert is documented with the rationale for dismissal.
   - The customer record is annotated to reduce future false positive alerts (whitelisting with justification).
   - The transaction or onboarding process is released to proceed.
4. If determined to be a potential or confirmed match:
   - The escalation procedure in Section 9 is invoked.
5. False positive resolution target: within 4 business hours for transaction-level alerts; within 2 business days for onboarding alerts.

### 8.3 Whitelisting Controls

- Whitelisting of a customer to suppress future alerts requires dual approval (analyst + CCO or delegate).
- Whitelisted entries are subject to periodic review (at least annually).
- A register of all whitelisted entries is maintained and available for audit.

---

## 9. Escalation Procedures

### 9.1 Confirmed or Probable Match

Upon confirmation or reasonable suspicion that a customer, counterparty, or transaction involves a sanctioned person or entity:

1. **Immediate freeze**: The customer account and/or pending transaction is frozen. No funds may be moved.
2. **Notification to CCO**: The CCO is notified within 1 business hour.
3. **Sponsor bank notification**: Standard Bank of South Africa is notified in accordance with the sponsorship agreement.
4. **FIC reporting**: A Suspicious Transaction Report (STR) and/or Terrorist Property Report (TPR) is filed with the FIC via goAML.
5. **OFAC reporting** (if applicable): Where a U.S. nexus exists (e.g., USDC transactions), an OFAC report is filed within the prescribed timeframe.
6. **Legal counsel engagement**: External legal counsel is engaged where required.
7. **Board notification**: The Board is informed of significant sanctions matches at the next scheduled meeting or immediately if the match presents systemic risk.

### 9.2 Escalation Matrix

| Severity | Action | Timeline | Approver |
|---|---|---|---|
| Potential match (low confidence) | Manual review, document decision | Within 4 business hours | Compliance Analyst |
| Probable match (high confidence) | Account freeze, CCO notification | Within 1 business hour | CCO |
| Confirmed match | Full freeze, FIC/OFAC reporting, sponsor bank notification | Immediately | CCO + Board notification |
| Sanctions evasion attempt | Full freeze, law enforcement referral, FIC reporting | Immediately | CCO + CEO |

---

## 10. USDC-Specific Sanctions Controls

Given that USDC is a U.S. dollar-denominated stablecoin issued by Circle (a U.S.-regulated entity), MyMoolah applies the following additional controls for all USDC transactions:

### 10.1 OFAC VASP Guidance Compliance

- MyMoolah adheres to OFAC guidance for Virtual Asset Service Providers (VASPs), including the requirement to screen all counterparties to USDC transactions.
- Where a USDC transaction is identified as involving a sanctioned address (as published by OFAC or identified through blockchain analytics), the transaction is blocked and reported.

### 10.2 Blockchain Analytics

- USDC wallet addresses involved in cross-border transactions are checked against known sanctioned wallet addresses.
- Where blockchain analytics tools identify that funds originate from or are destined for a high-risk or sanctioned source, the transaction is held for compliance review.

### 10.3 Travel Rule Compliance

- For USDC transfers above the applicable threshold, MyMoolah collects and transmits originator and beneficiary information in compliance with the FATF Travel Rule (Recommendation 16) and South African requirements.
- VALR, as the USDC exchange partner, is required to comply with equivalent sanctions screening standards under the terms of the service agreement.

---

## 11. Record Keeping

- All sanctions screening results (both alerts and clearances) shall be retained for a minimum of five (5) years from the date of screening.
- Records include: customer/counterparty name screened, lists screened against, date and time of screening, match score, alert disposition, analyst name, and rationale for decision.
- For confirmed matches: all correspondence, reports filed (STRs, TPRs, OFAC reports), and account freeze documentation shall be retained for a minimum of ten (10) years.
- Records are stored in encrypted form within MyMoolah's PostgreSQL database (Google Cloud SQL) with access restricted by RBAC.
- Records must be retrievable for presentation to the FIC, SARB, OFAC, or law enforcement upon request.

---

## 12. Sanctions Breach Reporting

### 12.1 Internal Reporting

Any employee who becomes aware of a potential sanctions breach — whether through screening alerts, customer communication, or any other means — shall report it immediately to the Compliance team and the CCO. Internal reporting channels are available 24/7.

### 12.2 External Reporting

| Authority | Reporting Obligation | Timeline |
|---|---|---|
| Financial Intelligence Centre (FIC) | STR and/or TPR via goAML | Within prescribed FICA timeframes |
| OFAC (U.S.) | Voluntary self-disclosure where U.S. nexus exists (USDC) | Within 30 calendar days of discovery |
| Standard Bank (sponsor bank) | Notification per sponsorship agreement | Immediately upon confirmation |
| South African Reserve Bank (SARB) | As directed by the FIC or SARB | As directed |

---

## 13. Staff Training

- All employees shall receive sanctions compliance training within 30 days of onboarding and annually thereafter.
- Training shall cover: overview of sanctions regimes (OFAC, UN, EU, SA), sanctions screening procedures, recognising sanctions evasion indicators, escalation procedures, USDC-specific sanctions obligations, and the consequences of non-compliance.
- Targeted training shall be provided to:
  - Compliance staff: detailed training on screening tools, alert investigation, and reporting procedures.
  - Technology staff: training on screening system architecture, list updates, and false positive tuning.
  - Customer-facing staff: training on recognising customer behaviour indicative of sanctions evasion.
- Training completion records shall be maintained and available for regulatory inspection.

---

## 14. Sanctions Evasion Indicators

The following indicators, individually or in combination, may suggest attempted sanctions evasion:

- Customer provides inconsistent or evasive responses regarding the beneficiary of a cross-border transaction.
- Transaction routed through multiple intermediaries in a manner inconsistent with the stated purpose.
- Customer requests USDC transfers to jurisdictions adjacent to sanctioned countries.
- Frequent small-value USDC transactions structured to avoid screening thresholds.
- Customer uses multiple accounts or identities to circumvent sanctions controls.
- Beneficiary details are vague, incomplete, or frequently changed.
- Transaction involves entities or individuals in sectors subject to sectoral sanctions.
- Customer is unwilling to provide information required to complete sanctions screening.

---

## 15. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| **Board of Directors** | Approve sanctions policy; ensure adequate resources; receive reports on sanctions programme effectiveness. |
| **Chief Compliance Officer (CCO)** | Oversee sanctions programme; approve escalation decisions; manage regulatory reporting; maintain relationships with the FIC and OFAC (where applicable). |
| **Compliance Analysts** | Conduct manual review of screening alerts; investigate potential matches; document decisions; manage the false positive register. |
| **Technology Team** | Implement and maintain automated screening systems in `services/usdcTransactionService.js` and `services/internationalPaymentService.js`; ensure timely list updates; manage fuzzy matching calibration. |
| **MLRO** | Receive and assess sanctions-related STRs; file reports with the FIC via goAML. |
| **All Staff** | Report sanctions concerns immediately; complete mandatory training; comply with this policy. |

---

## 16. Monitoring & Review

- This policy shall be reviewed at least annually or upon material changes to applicable sanctions regimes, MyMoolah's product suite, or the regulatory environment.
- Screening system effectiveness metrics (alert volumes, false positive rates, resolution times) shall be reported to the CCO monthly and to the Board quarterly.
- Internal audit shall conduct an independent assessment of sanctions controls at least annually.
- Fuzzy matching thresholds and screening rules shall be calibrated at least semi-annually, informed by false positive analysis and regulatory developments.
- Any material findings from regulatory examinations or internal audits shall be remediated within agreed timeframes and tracked to closure.

---

## 17. Regulatory References

| Reference | Description |
|---|---|
| Financial Intelligence Centre Act 38 of 2001 (FICA) | S28A (terrorist property reports), S29 (suspicious transaction reports). |
| Protection of Constitutional Democracy against Terrorist and Related Activities Act 33 of 2004 (POCDATARA) | Designation of persons and entities; offences related to TF. |
| United Nations Security Council Resolutions | Various resolutions imposing targeted financial sanctions. |
| OFAC Regulations (31 CFR Part 500 et seq.) | U.S. sanctions regulations applicable to USD-denominated transactions. |
| OFAC Guidance on Sanctions Compliance for the Virtual Currency Industry (2019) | VASP-specific sanctions obligations. |
| EU Council Regulations on Restrictive Measures | EU sanctions framework. |
| FATF Recommendation 6 | Targeted financial sanctions related to terrorism and TF. |
| FATF Recommendation 7 | Targeted financial sanctions related to proliferation. |
| FATF Recommendation 16 | Wire transfers — Travel Rule. |
| National Payment System Act 78 of 1998 (NPS Act) | Payment system regulation. |
| Banks Act 94 of 1990 | Banking regulatory framework. |
| ISO 27001:2022 | Information security management for sanctions screening data. |
| Mojaloop FSPIOP API Specification | Interoperability and participant identification standards. |

---

## 18. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Chief Compliance Officer | Initial policy creation. |

---

*This document is the property of MyMoolah (Pty) Ltd and is classified as Confidential. Unauthorised distribution is prohibited.*
