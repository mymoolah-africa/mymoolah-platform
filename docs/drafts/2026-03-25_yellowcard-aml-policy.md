ANTI-MONEY LAUNDERING POLICY

MyMoolah (Pty) Ltd


Document Title:     Anti-Money Laundering Policy
Version:            1.0
Effective Date:     March 2026
Next Review Date:   March 2027
Classification:     Confidential
Owner:              Chief Compliance Officer
Approved By:        Board of Directors, MyMoolah (Pty) Ltd


________________________________________________________________________________

TABLE OF CONTENTS

1.  Introduction and Purpose
2.  Scope
3.  Definitions
4.  Regulatory Framework
5.  ML/TF Risk Assessment
6.  Customer Onboarding and Due Diligence
7.  Sanctions Screening
8.  Transaction Monitoring
9.  Suspicious Transaction Reporting
10. Record Keeping
11. Staff Training and Awareness
12. Roles and Responsibilities
13. Penalties for Non-Compliance
14. Monitoring and Review
15. Document Control


________________________________________________________________________________

1. INTRODUCTION AND PURPOSE

MyMoolah (Pty) Ltd ("MyMoolah") operates a Mojaloop-compliant digital wallet and payment platform under the sponsorship of Standard Bank of South Africa. This Anti-Money Laundering Policy establishes the comprehensive framework through which MyMoolah prevents, detects, and reports money laundering (ML), terrorism financing (TF), and proliferation financing activities across all products, services, and channels.

This policy consolidates the following compliance domains into a single governing document:

    - Anti-Money Laundering and Counter-Terrorism Financing — ML/TF risk assessment, suspicious activity identification, and reporting obligations.
    - Customer Onboarding and Due Diligence — Know Your Customer (KYC) standards, Customer Due Diligence (CDD), Enhanced Due Diligence (EDD), and Politically Exposed Person (PEP) screening.
    - Sanctions Screening — Screening against OFAC, UN, EU, and South African sanctions lists at onboarding, at transaction level, and on a periodic basis.
    - Transaction Monitoring — Real-time and batch monitoring of all transaction activity, alert management, and Suspicious Transaction Report (STR) filing with the Financial Intelligence Centre (FIC).

MyMoolah maintains a zero-tolerance approach to ML/TF. The platform will not knowingly facilitate, process, or tolerate any transaction or customer relationship that presents an unacceptable ML/TF risk.


________________________________________________________________________________

2. SCOPE

This policy applies to:

    - All employees, contractors, directors, and officers of MyMoolah (Pty) Ltd.
    - All products and services offered through the MyMoolah platform, including digital wallet operations, value-added services (VAS — airtime, data, electricity, bill payments), PayShap real-time payments, USDC cross-border transfers via VALR, NFC deposit services, and MoolahMove international payments.
    - All customer segments, including individual consumers, business accounts, and agent networks.
    - All jurisdictions in which MyMoolah operates or facilitates transactions, with particular attention to South African domestic operations and cross-border USDC/stablecoin corridors.
    - All third-party service providers, including VALR (USDC exchange), Standard Bank (sponsor bank), Flash, MobileMart, EasyPay, and Yellow Card.
    - The entire customer lifecycle — from onboarding through ongoing monitoring to relationship termination.


________________________________________________________________________________

3. DEFINITIONS

AML — Anti-Money Laundering — measures to prevent, detect, and report the laundering of proceeds of crime.

Beneficial Owner — The natural person who ultimately owns or controls a legal entity customer, or on whose behalf a transaction is conducted, as defined in FICA S21B.

CDD — Customer Due Diligence — the process of identifying, verifying, and understanding the customer and the nature and purpose of the business relationship.

CFT — Counter-Terrorism Financing — measures to prevent, detect, and report the financing of terrorist activities.

CTR — Cash Threshold Report — a report filed with the FIC for cash transactions at or above R24,999.99.

EDD — Enhanced Due Diligence — additional verification and monitoring measures applied to higher-risk customers.

FATF — Financial Action Task Force — the inter-governmental body setting international AML/CFT standards.

FIC — Financial Intelligence Centre — South Africa's financial intelligence unit established under FICA.

goAML — The FIC's electronic reporting platform for filing STRs, CTRs, and TPRs.

KYC — Know Your Customer — the regulatory and institutional framework for customer identification and verification.

ML/TF — Money Laundering / Terrorism Financing.

OFAC — Office of Foreign Assets Control — the U.S. Treasury Department office administering and enforcing economic sanctions.

PEP — Politically Exposed Person — an individual entrusted with a prominent public function, as defined in FICA S21H.

SDD — Simplified Due Diligence — reduced verification measures permitted for demonstrably low-risk customers and products.

SDN List — Specially Designated Nationals and Blocked Persons List, maintained by OFAC.

STR — Suspicious Transaction Report — a report filed with the FIC under FICA S29.

TPR — Terrorist Property Report — a report filed under FICA S28A.

VASP — Virtual Asset Service Provider — an entity that provides services involving virtual assets (crypto-assets), as defined by the FATF.


________________________________________________________________________________

4. REGULATORY FRAMEWORK

This policy is aligned with the following legislation and standards:

South African Legislation

    Financial Intelligence Centre Act 38 of 2001 (FICA)
    Primary AML/CFT legislation — S21 (CDD), S21A (risk-based approach), S21B (beneficial ownership), S21H (PEPs), S22–25 (record keeping), S28 (CTRs), S28A (TPRs), S29 (STRs).

    FICA Amendment Act 1 of 2017
    Risk-based approach, beneficial ownership, PEP requirements.

    Prevention of Organised Crime Act 121 of 1998 (POCA)
    ML offences — S4 (money laundering), S5 (assisting), S6 (acquisition/possession).

    Prevention and Combating of Corrupt Activities Act 12 of 2004 (PRECCA)
    Corruption and money laundering offences.

    Protection of Constitutional Democracy against Terrorist and Related Activities Act 33 of 2004 (POCDATARA)
    TF offences and designated persons.

    National Payment System Act 78 of 1998
    Payment system regulation.

    Protection of Personal Information Act 4 of 2013 (POPIA)
    Lawful processing of personal information collected during CDD.

International Standards

    FATF 40 Recommendations
    International AML/CFT standards.

    Basel Committee — Sound Management of Risks related to ML/TF
    Banking-grade risk management.

    OFAC Regulations (31 CFR Part 500 et seq.)
    U.S. sanctions regulations applicable to USD-denominated transactions.

    OFAC Guidance on Sanctions Compliance for the Virtual Currency Industry (2019)
    VASP-specific sanctions obligations.

    UN Security Council Resolutions
    Targeted financial sanctions.

    EU Council Regulations on Restrictive Measures
    EU sanctions framework.

    ISO 20022
    Payment messaging standard (PayShap alignment).

    Mojaloop FSPIOP API Specification
    Interoperability and participant identification standards.

    FIC Guidance Notes 3A, 4A, 7
    Customer identification, goAML registration, and suspicious transaction reporting guidance.


________________________________________________________________________________

5. ML/TF RISK ASSESSMENT

5.1 Risk Appetite Statement

MyMoolah maintains a low risk appetite for ML/TF exposure. Where residual risk cannot be mitigated to acceptable levels, the customer relationship or transaction shall be declined or terminated.

5.2 Enterprise Risk Assessment

MyMoolah conducts a comprehensive ML/TF risk assessment annually, or upon material changes to products, services, geographies, or the regulatory environment. The assessment evaluates risk across four dimensions:

5.3 Customer Risk

    Low Risk — KYC Tier Gold/Platinum, South African resident, no adverse media, transaction patterns consistent with profile.

    Medium Risk — KYC Tier Silver, new customer (less than 6 months), minor profile inconsistencies, moderate transaction volumes.

    High Risk — Cross-border USDC activity, high transaction velocity, PEP associations, adverse media flags, sanctions-adjacent jurisdictions.

    PEP — Any individual meeting the FICA S21H definition of a Politically Exposed Person, their family members, or known close associates. Automatically classified as high-risk.

5.4 Geographic Risk

    Low Risk — South African domestic transactions, PayShap within the South African banking system.

    Medium Risk — Cross-border USDC transfers to FATF-compliant jurisdictions.

    High Risk — Transactions involving FATF grey-list countries, high-risk jurisdictions, or countries with known deficiencies in AML/CFT frameworks.

    Prohibited — Sanctioned jurisdictions (Cuba, Iran, North Korea, Syria, Russia, and Russian-occupied Ukrainian territories).

5.5 Product/Service Risk

    Digital Wallet (domestic) — Low to Medium risk. KYC-gated, tiered limits, domestic ZAR transactions.

    VAS (airtime, data, electricity, bills) — Low risk. Low-value, prepaid, minimal ML/TF utility.

    PayShap (RTP) — Medium risk. Real-time settlement, potential for rapid layering.

    USDC Cross-Border (via VALR) — High risk. Crypto-asset exposure, cross-border flows, pseudonymity risks.

    NFC Deposits — Low to Medium risk. Physical presence required, linked to verified accounts.

    MoolahMove (international) — High risk. Cross-border, multiple jurisdictions, currency conversion.

5.6 Suspicious Activity Indicators

The following non-exhaustive indicators shall trigger enhanced review:

    - Transactions inconsistent with the customer's known profile or stated source of funds.
    - Rapid movement of funds through the wallet with no economic rationale (layering).
    - Structuring transactions below reporting thresholds (R24,999.99).
    - Multiple accounts linked to the same device, IP address, or identity document.
    - Customers unwilling to provide information required for CDD.
    - USDC transactions to or from wallets associated with sanctioned entities or darknet markets.
    - Sudden increase in VAS purchases inconsistent with historical patterns.
    - PayShap transactions sent and immediately reversed or redirected.
    - Use of the platform as a pass-through with minimal balance retention.


________________________________________________________________________________

6. CUSTOMER ONBOARDING AND DUE DILIGENCE

6.1 CDD Levels

MyMoolah applies three levels of due diligence in accordance with the risk-based approach mandated by FICA and FATF Recommendation 10:

Simplified Due Diligence (SDD)

Applicable where the ML/TF risk is assessed as demonstrably low:

    - Low-value, prepaid VAS purchases (airtime, data) below R1,000 per transaction.
    - Customers at Bronze tier with wallet limits that constrain ML/TF utility.
    - Requirements: Mobile number verification via OTP, basic personal information (name, date of birth), device fingerprinting and binding.

Standard Due Diligence (Standard CDD)

The default level applied to all customers upon establishment of a business relationship, in accordance with FICA S21:

    - Full name, date of birth, and South African ID number or passport number.
    - Verification of identity against an official identification document.
    - Proof of residential address (not older than three months).
    - Screening against sanctions lists and PEP databases at onboarding.
    - Risk rating assignment.

Enhanced Due Diligence (EDD)

Applied to all high-risk customers, PEPs, and customers engaging in high-risk products or geographies:

    - Source of funds and source of wealth verification.
    - Senior management approval for establishing or continuing the business relationship.
    - Increased frequency of ongoing monitoring and periodic review.
    - Additional documentation as warranted by the risk assessment.
    - Enhanced transaction monitoring with lower alert thresholds.

6.2 KYC Tier Structure

MyMoolah implements a progressive tiered KYC model that balances regulatory compliance with customer experience:

    Bronze (Basic)
    Requirements: Mobile number (OTP verified), name, date of birth.
    Limits: R1,000 daily / R5,000 monthly. VAS purchases only. No transfers.

    Silver (ID Verified)
    Requirements: South African ID number or passport number verified via AI-OCR. Liveness check.
    Limits: R5,000 daily / R25,000 monthly. Domestic transfers enabled.

    Gold (Fully Verified)
    Requirements: ID document photographed and verified (AI-OCR), proof of address verified (utility bill, bank statement, or municipal account not older than 3 months), sanctions and PEP screening completed.
    Limits: R25,000 daily / R100,000 monthly. Full platform access including PayShap.

    Platinum (Enhanced)
    Requirements: All Gold requirements plus source of funds declaration, enhanced screening, manual compliance review, senior management sign-off.
    Limits: Custom limits. USDC cross-border enabled. Business account features.

6.3 Accepted Identity Documents

    - South African Green ID Book — Photo page required. Must not be expired.
    - South African Smart ID Card — Front and back required.
    - Valid Passport (any nationality) — Bio-data page required. Must have more than 3 months validity.
    - Refugee Permit / Asylum Seeker Certificate — Valid permit with photo required.

6.4 Accepted Proof of Address

    - Utility bill (electricity, water, gas) — Not older than 3 months. Must show name and residential address.
    - Bank statement — Not older than 3 months. From a registered South African bank.
    - Municipal rates account — Not older than 3 months. Must show name and property address.
    - Lease agreement — Not older than 12 months. Signed by both parties.
    - Employer letter (on letterhead) — Not older than 3 months. Confirming residential address.

6.5 AI-Powered Document Verification

MyMoolah employs a dual-engine OCR and verification pipeline:

Primary Engine — GPT-4o (OpenAI Vision)
    - Document image submitted for structured data extraction (name, ID number, date of birth, document number, expiry date).
    - Liveness detection and document authenticity assessment.
    - Confidence scoring applied to extracted fields.
    - Fields with confidence below threshold flagged for manual review.

Fallback Engine — Tesseract.js
    - Activated when the primary engine is unavailable or returns low-confidence results.
    - Local OCR processing.
    - Extracted data cross-referenced against structured validation rules.

Verification Workflow
    1. Customer uploads document photograph via the mobile application.
    2. Image quality check (resolution, blur detection, glare detection).
    3. Primary OCR extraction.
    4. Extracted data validated against South African ID number checksum (Luhn algorithm).
    5. Data compared against customer-provided information.
    6. Results stored in encrypted form in the database.
    7. Discrepancies or low-confidence results escalated to the Compliance team for manual review.

6.6 PEP Screening

All customers are screened against PEP databases at onboarding and at each periodic review cycle. PEP status extends to the PEP individual, family members (spouse, children, parents, siblings), and known close associates.

In accordance with FICA S21H:

    - PEPs are automatically classified as high-risk.
    - EDD measures are mandatory.
    - Senior management approval is required to establish or continue the business relationship.
    - Source of funds and source of wealth must be established and documented.
    - Ongoing monitoring frequency is increased (quarterly review minimum).

6.7 Beneficial Ownership

For business accounts and legal entity customers, MyMoolah shall:

    - Identify all natural persons who hold, directly or indirectly, 25% or more of the ownership interest or voting rights in the entity.
    - Identify any natural person who exercises effective control over the entity.
    - Verify the identity of all identified beneficial owners to Standard CDD level or above.
    - Obtain and verify the entity's registration documents (CIPC registration, tax clearance).
    - Maintain a current record of the ownership and control structure.
    - Re-verify beneficial ownership at least annually or upon notification of changes.

6.8 Ongoing Monitoring and Periodic Reviews

    Low Risk customers — Reviewed every 36 months.
    Medium Risk customers — Reviewed every 12 months.
    High Risk / PEP customers — Reviewed every 6 months (minimum quarterly for PEPs).

Periodic reviews include re-verification of identity and address if documents have expired, updated sanctions and PEP screening, review of transaction patterns against customer profile, and reassessment of risk rating.

Re-verification is triggered by: material change in risk profile or transaction patterns, adverse media or negative screening results, request to upgrade KYC tier, expiry of identity document on file, change in beneficial ownership, regulatory direction, or law enforcement request.


________________________________________________________________________________

7. SANCTIONS SCREENING

7.1 Sanctions Lists Screened

MyMoolah screens all customers and transactions against the following sanctions lists:

    1. OFAC Specially Designated Nationals (SDN) List — U.S. Department of the Treasury. Updated within 24 hours of publication.

    2. OFAC Consolidated Sanctions List — U.S. Department of the Treasury. Updated within 24 hours of publication.

    3. UN Security Council Consolidated Sanctions List — United Nations. Updated within 24 hours of publication.

    4. EU Consolidated List of Persons, Groups and Entities Subject to Financial Sanctions — European Union. Updated within 24 hours of publication.

    5. South African Targeted Financial Sanctions List — Financial Intelligence Centre (FIC). Updated within 24 hours of publication.

    6. UK Office of Financial Sanctions Implementation (OFSI) List — HM Treasury. Updated within 48 hours of publication.

Supplementary screening includes FATF High-Risk and Other Monitored Jurisdictions lists, and adverse media screening databases.

7.2 Screening Triggers

Customer Lifecycle Triggers

    - Account creation (onboarding): Full screening against all primary lists. Name, ID number, date of birth, nationality.
    - KYC tier upgrade: Full re-screening with any new information provided.
    - Periodic review: Full re-screening at intervals determined by customer risk rating.
    - Change of customer details: Re-screening on updated name, address, or nationality.
    - Adverse media alert: Immediate re-screening and EDD assessment.

Transaction-Level Triggers

    - USDC cross-border transfer (outbound): Real-time screening of beneficiary name, wallet address (where attributable), and destination country.
    - USDC cross-border transfer (inbound): Real-time screening of originator details.
    - MoolahMove international payment: Real-time screening of beneficiary and originator.
    - PayShap transaction above R10,000: Screening of counterparty details.
    - Domestic transfer above R24,999.99: Screening of counterparty details.
    - Any transaction involving a high-risk jurisdiction: Full screening of all parties.

Periodic Rescreening

    Low Risk customers — Every 12 months.
    Medium Risk customers — Every 6 months.
    High Risk / PEP customers — Every 3 months.
    Platinum tier (USDC-enabled) — Every 3 months, plus real-time transaction screening.

7.3 Blocked Jurisdictions

MyMoolah shall not process any transaction to, from, or involving the following jurisdictions:

    - Cuba
    - Iran
    - North Korea (DPRK)
    - Syria
    - Russia (comprehensive sanctions)
    - Russian-occupied territories of Ukraine (Crimea, Donetsk, Luhansk, Zaporizhzhia, Kherson)

Any attempt to initiate a transaction involving a blocked jurisdiction shall be automatically rejected by the platform, flagged for immediate compliance review, and reported to the FIC if there are grounds to suspect sanctions evasion.

7.4 High-Risk Jurisdictions Requiring EDD

Transactions involving the following jurisdictions require Enhanced Due Diligence and senior compliance approval before processing:

    - Countries on the FATF grey list.
    - Countries with known deficiencies in AML/CFT frameworks as identified by the FATF.
    - Countries subject to partial or sectoral sanctions.
    - Any jurisdiction added to the MyMoolah internal high-risk list by the CCO based on risk assessment.

7.5 Screening Methodology

Automated Screening

    - Customer name, ID number, date of birth, and nationality are screened against all primary lists upon account creation.
    - Fuzzy matching algorithms with configurable thresholds account for name transliterations, misspellings, and alternative spellings.
    - Match score threshold: alerts generated for matches at 80% confidence or above.
    - For USDC cross-border transactions, beneficiary name, wallet address metadata (where available), and destination country are screened in real-time prior to transaction execution.
    - Transactions are held in a pending state until screening is complete. No funds are released prior to screening clearance.

Manual Review

All automated screening alerts are escalated to the Compliance team for manual investigation, including comparison of customer details against the sanctioned person's identifying information, assessment of contextual information, determination of true match versus false positive, and documentation of the review decision and rationale.

7.6 False Positive Handling

    - False positive resolution target: within 4 business hours for transaction-level alerts; within 2 business days for onboarding alerts.
    - Whitelisting of a customer to suppress future alerts requires dual approval (analyst and CCO or delegate).
    - Whitelisted entries are subject to periodic review (at least annually).
    - A register of all whitelisted entries is maintained and available for audit.

7.7 Escalation — Confirmed or Probable Match

Upon confirmation or reasonable suspicion of a sanctions match:

    1. Immediate freeze — The customer account and/or pending transaction is frozen.
    2. Notification to CCO — Within 1 business hour.
    3. Sponsor bank notification — Standard Bank of South Africa is notified per the sponsorship agreement.
    4. FIC reporting — STR and/or TPR filed via goAML.
    5. OFAC reporting (if applicable) — Where a U.S. nexus exists (USDC transactions), an OFAC report is filed.
    6. Legal counsel engagement — External legal counsel engaged where required.
    7. Board notification — The Board is informed of significant sanctions matches.

7.8 USDC-Specific Sanctions Controls

Given that USDC is a U.S. dollar-denominated stablecoin issued by Circle (a U.S.-regulated entity), MyMoolah applies the following additional controls:

    - Adherence to OFAC guidance for Virtual Asset Service Providers (VASPs).
    - Blockchain analytics to identify sanctioned wallet addresses.
    - FATF Travel Rule compliance for USDC transfers above applicable thresholds — originator and beneficiary information is collected and transmitted.
    - VALR, as the USDC exchange partner, is contractually required to comply with equivalent sanctions screening standards.

7.9 Sanctions Evasion Indicators

    - Customer provides inconsistent or evasive responses regarding the beneficiary of a cross-border transaction.
    - Transaction routed through multiple intermediaries inconsistent with the stated purpose.
    - Customer requests USDC transfers to jurisdictions adjacent to sanctioned countries.
    - Frequent small-value USDC transactions structured to avoid screening thresholds.
    - Customer uses multiple accounts or identities to circumvent sanctions controls.
    - Beneficiary details are vague, incomplete, or frequently changed.


________________________________________________________________________________

8. TRANSACTION MONITORING

8.1 Monitoring System Architecture

Real-Time Monitoring Layer

MyMoolah operates a real-time transaction monitoring system integrated into the API layer. Every transaction request is evaluated before settlement against the following controls:

    - Per-user transaction velocity tracked using Redis key-value stores with TTL-based expiry, enforcing configurable limits per endpoint, per user, and per time window.
    - Daily, weekly, and monthly aggregate limits enforced at the API boundary, tiered by KYC verification level.
    - Real-time alerts when the pooled float account deviates from expected settlement positions.
    - Transaction attributes (amount, frequency, counterparty, geolocation, device fingerprint) evaluated against configurable rule sets before authorisation.

Batch Monitoring Layer

Batch analysis runs on a scheduled basis (minimum daily) against the transaction ledger:

    - End-of-day aggregation of per-user transaction volumes, amounts, and counterparty diversity.
    - Pattern detection for structuring, dormant-to-active transitions, and round-tripping across rolling windows.
    - Peer-group analysis comparing user behaviour against cohorts segmented by KYC tier, registration age, and geographic region.
    - Reconciliation-driven alerts flagging discrepancies that may indicate transaction manipulation.

8.2 Transaction Thresholds

    Single cash deposit/withdrawal at or above R24,999.99 — Automatic CTR generation (FICA S28A).

    Aggregate daily transactions per user at or above R25,000 — Automatic CTR review; alert if structured below threshold.

    Single digital transfer at or above R50,000 — Enhanced review; source-of-funds verification.

    Monthly aggregate per user at or above R100,000 — Compliance review; enhanced due diligence trigger.

    USDC cross-border single transfer at or above USD 1,000 — Sanctions screening; jurisdiction risk check.

8.3 Mobile Wallet Typologies

The following typologies are monitored as indicators of potential ML/TF or fraud:

Structuring (Smurfing)
Multiple transactions deliberately kept below the R24,999.99 CTR threshold within a rolling 24-hour or 7-day period. Detection rules aggregate per-user transaction values and flag patterns where cumulative amounts exceed thresholds while individual transactions remain just below.

Rapid Movement of Funds
Deposits followed by immediate withdrawal or transfer to a different account within a short time window (configurable; default 60 minutes). Indicative of layering.

Dormant-to-Active Accounts
Accounts with no transaction activity for 90 or more days that suddenly exhibit high-volume or high-value activity. Flagged for manual review.

Round-Tripping
Funds moving through a circular path across multiple wallets within a defined period. Graph-based detection identifies circular fund flows across the double-entry ledger.

VAS Abuse — Airtime as Value Transfer
Abnormal volumes of airtime or data purchases exceeding reasonable personal consumption, particularly when purchased for multiple distinct mobile numbers. This typology exploits airtime as a de facto value transfer mechanism.

8.4 PayShap RTP-Specific Monitoring

    - High-frequency RTP initiation: unusual number of PayShap RTP requests within a short window.
    - Unusual RTP request patterns: requests to a high number of distinct counterparties, or repeated requests to the same counterparty for amounts just below monitoring thresholds.
    - RTP rejection rate anomalies: abnormally high rejection rates, which may indicate social engineering or payment request fraud.

8.5 USDC Cross-Border Monitoring

    - All USDC cross-border transactions screened against OFAC SDN, UN Security Council, EU, and South African targeted financial sanctions lists prior to settlement.
    - Transactions involving high-risk jurisdictions subject to enhanced due diligence.
    - Rapid conversion between ZAR and USDC, or high-frequency cross-border transfers, trigger automated alerts.
    - Travel Rule compliance: originator and beneficiary information captured and transmitted per FATF Recommendation 16.

8.6 Alerting and Escalation

    Critical — Confirmed sanctions match; terrorism financing indicator. Response: Immediate escalation to CCO; transaction blocked.

    High — Multiple typology triggers; structuring detected; large cross-border anomaly. Response: Review within 4 hours.

    Medium — Single typology trigger; threshold breach; dormant-to-active. Response: Review within 24 hours.

    Low — Minor anomaly; peer-group deviation; single velocity spike. Response: Review within 72 hours.

Escalation Matrix

    Level 1 (Compliance Analyst) — All Medium and High alerts.
    Level 2 (Senior Compliance Officer) — Unresolved High alerts; complex typologies.
    Level 3 (Chief Compliance Officer) — All Critical alerts; STR filing decisions; regulatory enquiries.
    Level 4 (Board Risk Committee) — Systemic risk indicators; regulatory enforcement actions.

8.7 False Positive Management

    - Quarterly rule review: monitoring rule parameters (thresholds, time windows, scoring weights) reviewed against false positive rates and detection efficacy.
    - All rule changes require documented justification and approval by the Senior Compliance Officer.
    - False positive rate target: below 70% for Medium alerts and below 50% for High alerts, with continuous improvement.
    - Analyst feedback loop: false positive rationale documented and fed into rule refinement.

8.8 Quality Assurance

    - Monthly sampling: a random sample of closed alerts (minimum 10%) reviewed by the Senior Compliance Officer.
    - Annual independent review of the transaction monitoring programme covering rule effectiveness, STR quality, and regulatory compliance.
    - All monitoring records maintained in an audit-ready state.


________________________________________________________________________________

9. SUSPICIOUS TRANSACTION REPORTING

9.1 STRs — FICA S29

MyMoolah shall file a Suspicious Transaction Report with the FIC via the goAML platform upon forming a suspicion or knowledge that a transaction:

    - Involves the proceeds of unlawful activity;
    - Is intended to facilitate ML or TF;
    - Has no apparent business or lawful purpose; or
    - Deviates materially from the customer's known transaction pattern.

There is no monetary threshold for STRs. The obligation arises upon reasonable suspicion regardless of transaction value.

9.2 Cash Threshold Reports (CTRs) — FICA S28

Any single cash transaction or aggregated cash transactions by the same person within a 24-hour period reaching or exceeding R24,999.99 shall be reported to the FIC via goAML. This applies primarily to NFC cash deposit transactions.

9.3 Terrorist Property Reports (TPRs) — FICA S28A

Where MyMoolah has knowledge or suspects that property in its possession or control is owned, held, or controlled by a designated person under POCDATARA, a TPR shall be filed with the FIC immediately.

9.4 goAML Filing Procedure

    1. The compliance analyst prepares the STR/CTR in the prescribed format.
    2. The report is reviewed and approved by the Senior Compliance Officer or CCO.
    3. The report is submitted electronically via the FIC's goAML platform.
    4. A confirmation receipt is obtained and stored in the case management system.
    5. All supporting documentation is retained for a minimum of five years.

9.5 Tipping-Off Prohibition

In accordance with FICA S29(4), no employee or officer of MyMoolah shall disclose to any person (including the customer) that an STR, CTR, or TPR has been or is being considered, filed, or investigated. Violation of this prohibition constitutes a criminal offence.


________________________________________________________________________________

10. RECORD KEEPING

In accordance with FICA Sections 22–25:

    - All CDD records (identity documents, proof of address, verification results, risk assessments) shall be retained for a minimum of five (5) years from the date on which the business relationship is terminated.
    - All transaction records shall be retained for a minimum of five (5) years from the date on which the transaction was conducted.
    - Records relating to STRs, CTRs, and TPRs shall be retained for a minimum of five (5) years from the date of filing.
    - All sanctions screening results (alerts and clearances) shall be retained for a minimum of five (5) years. For confirmed matches: ten (10) years.
    - All transaction monitoring alerts, investigation records, and case files shall be retained for five (5) years.
    - Records are stored in encrypted form (AES-256-GCM) within the PostgreSQL database (Google Cloud SQL) and identity document images in Google Cloud Storage with server-side encryption.
    - Access is restricted by role-based access control (RBAC).
    - All records must be retrievable in a format suitable for presentation to the FIC, SARB, OFAC, or law enforcement within a reasonable timeframe.


________________________________________________________________________________

11. STAFF TRAINING AND AWARENESS

    - All employees shall receive AML/CFT training within 30 days of onboarding and annually thereafter.

    - Training shall cover: ML/TF typologies relevant to digital wallets and crypto-assets, suspicious activity indicators, reporting obligations under FICA, tipping-off prohibitions, sanctions compliance, KYC/CDD procedures, and PEP identification.

    - Targeted training shall be provided based on role:

        Compliance staff: Advanced AML, screening tools, alert investigation, goAML filing procedures.

        Technology staff: Screening system architecture, list updates, false positive tuning, secure coding.

        Customer-facing staff: Document verification procedures, recognising suspicious customer behaviour.

    - Training completion records shall be maintained and available for regulatory inspection.

    - Training effectiveness is assessed through post-training assessments with a minimum 80% pass mark requirement.


________________________________________________________________________________

12. ROLES AND RESPONSIBILITIES

Board of Directors
Approve AML policy; allocate adequate resources; set risk appetite; oversee compliance programme; receive quarterly reports.

Chief Compliance Officer (CCO)
Day-to-day management of the AML programme; FIC liaison; STR/CTR/TPR filing authority; sanctions escalation decisions; staff training oversight.

Money Laundering Reporting Officer (MLRO)
Receive internal suspicious activity reports; assess and escalate to the FIC via goAML; maintain reporting register.

Senior Compliance Officer
Alert quality assurance; rule tuning governance; L2 escalation review; STR review and approval.

Compliance Analysts
Alert investigation; case documentation; STR preparation; manual sanctions screening review; KYC review.

Technology Team
Implement and maintain automated transaction monitoring, sanctions screening, and KYC systems; ensure timely list updates; manage screening calibration.

Customer Support
Guide customers through KYC processes; escalate incomplete or suspicious applications to Compliance.

All Staff
Identify and report suspicious activity to the MLRO; complete mandatory training; comply with this policy.


________________________________________________________________________________

13. PENALTIES FOR NON-COMPLIANCE

13.1 Regulatory Penalties

Non-compliance with FICA may result in:

    - Administrative sanctions imposed by the FIC, including financial penalties of up to R50 million per contravention.
    - Criminal prosecution under FICA S68, with penalties including imprisonment of up to 15 years.
    - Directives from the SARB or sponsor bank (Standard Bank) to suspend operations.

13.2 Internal Disciplinary Action

Any employee who knowingly or negligently fails to comply with this policy shall be subject to disciplinary proceedings up to and including dismissal, in addition to any criminal liability.


________________________________________________________________________________

14. MONITORING AND REVIEW

    - This policy shall be reviewed at least annually or upon material changes to the regulatory environment, product suite, or risk profile.
    - The CCO shall present an AML programme effectiveness report to the Board quarterly, covering: STR filing volumes and quality, screening alert metrics, false positive rates, training completion rates, and regulatory developments.
    - Internal audit shall conduct an independent assessment of AML controls at least annually.
    - External audit or regulatory examination findings shall be remediated within agreed timeframes.
    - Screening system effectiveness metrics (alert volumes, false positive rates, resolution times) shall be reported to the CCO monthly.
    - Monitoring rule parameters shall be reviewed and calibrated at least quarterly.


________________________________________________________________________________

15. DOCUMENT CONTROL

Version     Date            Author                      Changes
1.0         March 2026      Chief Compliance Officer     Initial policy creation — consolidated AML/CFT, KYC/CDD, Sanctions Screening, and Transaction Monitoring.


________________________________________________________________________________

This document is the property of MyMoolah (Pty) Ltd and is classified as Confidential. Unauthorised reproduction or distribution is prohibited.
