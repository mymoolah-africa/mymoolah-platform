────────────────────────────────────────────────────────────────────────────────

                         MYMOOLAH TREASURY PLATFORM

              RISK MANAGEMENT AND COMPLIANCE PROGRAMME (RMCP)

           Anti-Money Laundering and Counter-Terrorism Financing

────────────────────────────────────────────────────────────────────────────────

Document Reference:    MMTP-RMCP-001
Version:               1.0
Date:                  22 March 2026
Classification:        CONFIDENTIAL
Prepared by:           MyMoolah Treasury Platform (Pty) Ltd
Approved by:           [Director Name — TO BE SIGNED]

────────────────────────────────────────────────────────────────────────────────


════════════════════════════════════════════════════════════════════════════════
TABLE OF CONTENTS
════════════════════════════════════════════════════════════════════════════════

  1.   Introduction and Purpose
  2.   Legal and Regulatory Framework
  3.   Definitions and Abbreviations
  4.   Governance and Organisational Structure
  5.   Risk-Based Approach
  6.   Customer Due Diligence (CDD) and KYC
  7.   Enhanced Due Diligence (EDD)
  8.   Politically Exposed Persons (PEP) Screening
  9.   Targeted Financial Sanctions (TFS) Screening
  10.  Transaction Monitoring
  11.  Suspicious Transaction Reporting (STR)
  12.  Record Keeping
  13.  Training and Awareness
  14.  Internal Controls and Audit
  15.  New Products, Services and Technology
  16.  Regulatory Reporting
  17.  Programme Review and Updates


════════════════════════════════════════════════════════════════════════════════
1.  INTRODUCTION AND PURPOSE
════════════════════════════════════════════════════════════════════════════════

1.1  PURPOSE

This Risk Management and Compliance Programme (RMCP) sets out the policies,
procedures, and controls implemented by MyMoolah Treasury Platform (Pty) Ltd
("MyMoolah" or "the Company") to prevent, detect, and report money
laundering (ML), terrorist financing (TF), and proliferation financing (PF)
activities.

This RMCP is developed in compliance with Section 42 of the Financial
Intelligence Centre Act 38 of 2001 ("FICA"), as amended by the Financial
Intelligence Centre Amendment Act 1 of 2017, and is aligned with the
Financial Action Task Force (FATF) Recommendations.


1.2  SCOPE

This programme applies to:

  •  All employees, officers, and directors of MyMoolah
  •  All products and services offered through the MyMoolah Treasury Platform
  •  All customer relationships and transactions processed through the
     platform
  •  All third-party service providers and agents acting on behalf of
     MyMoolah


1.3  COMPANY OVERVIEW

MyMoolah Treasury Platform is a registered Third-Party Payment Provider
(TPPP) under the Payments Association of South Africa (PASA), sponsored by
Standard Bank of South Africa. The Company operates a banking-grade digital
wallet and payments platform offering:

  •  Digital wallet services (secure value storage, P2P transfers)
  •  Value-Added Services (airtime, data, electricity, bill payments,
     digital vouchers)
  •  Real-time bank payments via PayShap (Standard Bank integration)
  •  Cross-border remittance services (MoolahMove) for SADC corridors
  •  KYC-verified customer onboarding

The platform is hosted on Google Cloud Platform (GCP) with banking-grade
security controls including TLS 1.3, AES-256-GCM encryption, and ISO 27001
readiness.


1.4  BOARD APPROVAL

This RMCP has been approved by the Board of Directors of MyMoolah Treasury
Platform (Pty) Ltd and is subject to annual review or upon material changes
to the Company's risk profile, products, services, or applicable legislation.

  Approved by:   [Director Name]
  Signature:     ____________________________
  Date:          ____________________________



════════════════════════════════════════════════════════════════════════════════
2.  LEGAL AND REGULATORY FRAMEWORK
════════════════════════════════════════════════════════════════════════════════

This RMCP is developed in compliance with the following legislation,
regulations, and guidance:

SOUTH AFRICAN LEGISLATION
─────────────────────────
  •  Financial Intelligence Centre Act 38 of 2001 (FICA), as amended
     by Act 1 of 2017
  •  Prevention of Organised Crime Act 121 of 1998 (POCA)
  •  Protection of Constitutional Democracy Against Terrorist and
     Related Activities Act 33 of 2004 (POCDATARA)
  •  Protection of Personal Information Act 4 of 2013 (POPIA)
  •  Financial Advisory and Intermediary Services Act 37 of 2002 (FAIS)
  •  Companies Act 71 of 2008
  •  Electronic Communications and Transactions Act 25 of 2002 (ECTA)

REGULATORY GUIDANCE
───────────────────
  •  FIC Guidance Note 7A (Revised) — RMCP requirements
  •  FIC Public Compliance Communication (PCC) 44 / 44A — Targeted
     Financial Sanctions
  •  FIC PCC 53 — RMCP guidance and examples
  •  FIC PCC 118A — TPPP / MVTS classification
  •  PASA Third-Party Provider Directive 1 of 2007
  •  SARB Third-Party Provider Directive

INTERNATIONAL STANDARDS
───────────────────────
  •  FATF 40 Recommendations (particularly R1, R10–R15, R20, R26, R35)
  •  Wolfsberg Group AML Principles
  •  ISO 20022 messaging standards
  •  Mojaloop FSPIOP standards



════════════════════════════════════════════════════════════════════════════════
3.  DEFINITIONS AND ABBREVIATIONS
════════════════════════════════════════════════════════════════════════════════

  AML        Anti-Money Laundering
  CDD        Customer Due Diligence
  CFT        Counter-Terrorism Financing (also CTF)
  CTR        Cash Threshold Report
  DPIP       Domestic Prominent Influential Person
  EDD        Enhanced Due Diligence
  FATF       Financial Action Task Force
  FICA       Financial Intelligence Centre Act 38 of 2001
  FIC        Financial Intelligence Centre
  FPPO       Foreign Prominent Public Official
  goAML      FIC's electronic reporting platform
  KYC        Know Your Customer
  ML         Money Laundering
  MVTS       Money or Value Transfer Service
  PASA       Payments Association of South Africa
  PEP        Politically Exposed Person
  PF         Proliferation Financing
  PIP        Prominent Influential Person
  POPIA      Protection of Personal Information Act 4 of 2013
  RMCP       Risk Management and Compliance Programme
  SARB       South African Reserve Bank
  SDD        Simplified Due Diligence
  STR        Suspicious Transaction Report
  TF         Terrorist Financing
  TFS        Targeted Financial Sanctions
  TPPP       Third-Party Payment Provider
  UNSC       United Nations Security Council



════════════════════════════════════════════════════════════════════════════════
4.  GOVERNANCE AND ORGANISATIONAL STRUCTURE
════════════════════════════════════════════════════════════════════════════════

4.1  BOARD RESPONSIBILITY

The Board of Directors bears ultimate responsibility for ensuring that:

  •  An adequate and effective RMCP is in place
  •  Sufficient resources are allocated to AML/CFT compliance
  •  A suitably qualified Compliance Officer is appointed
  •  All employees receive appropriate training
  •  The RMCP is reviewed and updated at least annually


4.2  COMPLIANCE OFFICER

In terms of Section 42A of FICA, MyMoolah has designated a Compliance
Officer who:

  •  Is of sufficient competence and seniority to fulfil the role
  •  Has direct access to the Board on compliance matters
  •  Is responsible for the day-to-day implementation and oversight of
     this RMCP
  •  Monitors and reports on compliance with FICA obligations
  •  Oversees the filing of reports to the FIC via the goAML platform
  •  Coordinates responses to FIC enquiries and inspections

  Designated Compliance Officer:   [TO BE FILLED]
  Contact:                         [TO BE FILLED]
  Date of Appointment:             [TO BE FILLED]


4.3  THREE LINES OF DEFENCE

MyMoolah employs a three-lines-of-defence model:

  FIRST LINE — BUSINESS OPERATIONS
  •  Customer-facing staff and platform systems implement CDD, KYC,
     and transaction monitoring controls as the first point of defence
  •  Automated platform controls enforce identity verification, transaction
     limits, and suspicious activity flagging

  SECOND LINE — COMPLIANCE FUNCTION
  •  The Compliance Officer provides independent oversight of AML/CFT
     controls
  •  Reviews and investigates escalated alerts
  •  Files STRs and other regulatory reports
  •  Advises on regulatory changes and emerging risks

  THIRD LINE — INTERNAL AUDIT
  •  Independent periodic review of the RMCP's adequacy and effectiveness
  •  Reports findings directly to the Board
  •  Recommendations for remediation are tracked to completion



════════════════════════════════════════════════════════════════════════════════
5.  RISK-BASED APPROACH
════════════════════════════════════════════════════════════════════════════════

5.1  RISK PHILOSOPHY

MyMoolah adopts a risk-based approach to AML/CFT in accordance with FATF
Recommendation 1 and FICA Section 42. This means that the nature and
extent of CDD measures, monitoring, and controls are proportionate to the
assessed ML/TF/PF risk.


5.2  BUSINESS-LEVEL RISK ASSESSMENT

An entity-wide risk assessment is conducted:

  •  At the commencement of operations
  •  Annually thereafter, or more frequently when material changes occur
  •  When new products, services, or delivery channels are introduced
  •  When the regulatory landscape changes materially

The assessment considers:

  •  Nature and size of the business
  •  Types of customers and their risk profiles
  •  Products and services offered
  •  Delivery channels (digital wallet, mobile, web)
  •  Geographic risk (South Africa and SADC cross-border corridors)
  •  Transactional volumes and values


5.3  PRODUCT AND SERVICES RISK ASSESSMENT

Each product and service is assessed for its inherent ML/TF/PF risk:

  PRODUCT / SERVICE                          INHERENT RISK RATING
  ─────────────────────────────────────────  ────────────────────
  Digital wallet (domestic P2P)              Medium
  VAS purchases (airtime, data, vouchers)   Low
  PayShap real-time bank payments            Medium
  Cross-border remittance (MoolahMove)       High
  Cash-out at retail (EasyPay, Flash)        Medium
  QR code merchant payments                  Low


5.4  CLIENT-LEVEL RISK ASSESSMENT

Each customer is assigned a risk rating at onboarding and reviewed
periodically. The risk rating considers:

  •  Nature of the customer (individual, sole trader, SME)
  •  Geographic location and nationality
  •  Source of funds and expected transaction patterns
  •  PEP status (DPIP, FPPO, PIP)
  •  Sanctions screening results
  •  Adverse media screening results

  CLIENT RISK CATEGORIES
  ─────────────────────────────────────────
  Low Risk        Standard CDD, periodic review
  Medium Risk     Standard CDD, enhanced monitoring
  High Risk       Enhanced Due Diligence (EDD), senior management approval
  Prohibited      Relationship declined or terminated


5.5  RISK MATRIX

  RISK FACTOR            LOW              MEDIUM           HIGH
  ──────────────────     ────────────     ────────────     ────────────
  Customer type          Salaried         Self-employed    Cash-intensive
  Geography              South Africa     CMA countries    High-risk FATF
  Transaction type       VAS purchase     Domestic P2P     Cross-border
  Transaction value      < R5,000/mo      R5,000–R25,000   > R25,000/mo
  PEP status             Non-PEP          Family/assoc.    PEP (direct)



════════════════════════════════════════════════════════════════════════════════
6.  CUSTOMER DUE DILIGENCE (CDD) AND KYC
════════════════════════════════════════════════════════════════════════════════

6.1  CUSTOMER IDENTIFICATION AND VERIFICATION (SECTION 21 OF FICA)

Before establishing a business relationship or processing a single
transaction above the prescribed threshold, MyMoolah must:

  •  Establish the identity of the customer
  •  Verify the customer's identity using reliable, independent sources
  •  Identify beneficial owners where applicable

For natural persons, the following is required:

  •  Full name and surname
  •  Date of birth
  •  South African ID number or passport number (foreign nationals)
  •  Residential address
  •  Contact details (mobile number, email)
  •  Selfie verification (liveness check)

For legal persons (business accounts):

  •  Company registration documents (CM1 or CoR 14.3)
  •  Identification of all directors, shareholders > 25%, and beneficial
     owners
  •  Proof of registered and physical address
  •  Tax registration details


6.2  VERIFICATION METHODS

MyMoolah uses the following verification methods:

  •  Document upload and OCR verification (ID document, passport)
  •  Selfie-based liveness detection (anti-spoofing)
  •  Electronic verification against Department of Home Affairs records
     (where available)
  •  Address verification via utility bills or bank statements (dated
     within 3 months)


6.3  PROHIBITION OF ANONYMOUS CLIENTS (SECTION 20A)

MyMoolah does not establish or maintain anonymous accounts. All customers
must be identified and verified before transacting. Pseudonymous accounts,
bearer instruments, and shell structures are prohibited.


6.4  NON-FACE-TO-FACE ONBOARDING

As a digital-first platform, MyMoolah onboards customers remotely. To
mitigate the heightened risk of non-face-to-face relationships:

  •  Multi-factor identity verification is applied (document + selfie
     + OTP)
  •  Device fingerprinting and IP geolocation are recorded
  •  Transaction limits are applied until full verification is complete
  •  EDD is triggered for customers with inconsistent or incomplete
     verification data


6.5  ONGOING CDD

Customer information is reviewed and updated:

  •  When a customer's risk profile changes
  •  When transactions are inconsistent with the customer's known profile
  •  Periodically based on the customer's risk rating:
       Low risk:      Every 36 months
       Medium risk:   Every 12 months
       High risk:     Every 6 months


6.6  SIMPLIFIED DUE DILIGENCE (SDD)

SDD may be applied where the ML/TF risk is demonstrably low, such as:

  •  Low-value prepaid wallet accounts with transaction limits
  •  VAS-only accounts (airtime, data purchases below R5,000 per month)

SDD does not exempt the Company from identifying the customer; it permits
reduced verification and monitoring intensity.



════════════════════════════════════════════════════════════════════════════════
7.  ENHANCED DUE DILIGENCE (EDD)
════════════════════════════════════════════════════════════════════════════════

EDD is applied when the assessed risk is high. Triggers include:

  •  Customer identified as a PEP (DPIP, FPPO, or PIP)
  •  Customer is from or transacts with a high-risk jurisdiction
  •  Cross-border remittance transactions (MoolahMove)
  •  Complex or unusually large transactions
  •  Transactions with no apparent economic or lawful purpose
  •  Adverse media or negative screening results
  •  Sanctions screening alerts

EDD measures include:

  •  Source of funds verification (payslip, bank statement, contract)
  •  Source of wealth verification where applicable
  •  Senior management approval before establishing or continuing the
     relationship
  •  Enhanced ongoing monitoring (increased frequency and lower alert
     thresholds)
  •  Documented written findings for complex or unusually large
     transactions (FICA Section 42(2)(d))

Where satisfactory EDD cannot be completed, the business relationship
must be terminated in accordance with Section 21E of FICA.



════════════════════════════════════════════════════════════════════════════════
8.  POLITICALLY EXPOSED PERSONS (PEP) SCREENING
════════════════════════════════════════════════════════════════════════════════

8.1  DEFINITIONS (SOUTH AFRICAN TERMINOLOGY)

  DPIP    Domestic Prominent Influential Person — a South African citizen
          who holds or has held a prominent public position in South Africa

  FPPO    Foreign Prominent Public Official — a foreign national who holds
          or has held a prominent public position in a foreign country

  PIP     Prominent Influential Person — a person who holds or has held
          a position in a South African or international organisation

  Family members and known close associates of DPIPs, FPPOs, and PIPs
  are also subject to PEP screening requirements.


8.2  PEP IDENTIFICATION

MyMoolah screens all customers against PEP databases:

  •  At onboarding (before account activation)
  •  Periodically during the business relationship (aligned with CDD
     review cycles)
  •  When customer information is updated
  •  Upon reasonable suspicion


8.3  PEP MEASURES

When a customer is identified as a PEP:

  •  Senior management approval is required to establish or continue
     the relationship
  •  Source of funds and source of wealth must be established
  •  EDD measures are applied for the duration of the relationship
  •  Enhanced ongoing monitoring is implemented
  •  The PEP status is reviewed at least every 12 months

A customer who ceases to hold a prominent position remains subject to
PEP measures for a period of not less than 12 months following the end
of the appointment.



════════════════════════════════════════════════════════════════════════════════
9.  TARGETED FINANCIAL SANCTIONS (TFS) SCREENING
════════════════════════════════════════════════════════════════════════════════

9.1  LEGAL BASIS

In terms of Sections 26A, 26B, and 26C of FICA, MyMoolah is required to
screen customers and transactions against:

  •  The United Nations Security Council (UNSC) Consolidated List
  •  The FIC Targeted Financial Sanctions List


9.2  SCREENING TRIGGERS

Screening is performed:

  •  At customer onboarding (before account activation)
  •  Before processing each transaction
  •  When the UNSC or FIC TFS lists are updated
  •  Periodically for all existing customers


9.3  MATCH PROCEDURES

  CONFIRMED MATCH
  •  Immediately freeze the customer's account and all assets
  •  Refuse to process any pending transactions
  •  Report to the FIC within the prescribed timeframe
  •  Do not inform the customer of the freeze (tipping-off prohibition)

  POTENTIAL MATCH (False Positive Review)
  •  Escalate to the Compliance Officer for review
  •  Gather additional information to confirm or dismiss the match
  •  Document the review process and outcome
  •  If confirmed, follow the Confirmed Match procedures


9.4  RECORD KEEPING

All TFS screening activities, results, reviews, and escalations are
documented and retained for a minimum of 5 years. Failure to comply
with TFS obligations is a criminal offence under FICA.



════════════════════════════════════════════════════════════════════════════════
10.  TRANSACTION MONITORING
════════════════════════════════════════════════════════════════════════════════

10.1  MONITORING APPROACH

MyMoolah employs automated and manual transaction monitoring:

  AUTOMATED MONITORING (PLATFORM CONTROLS)
  •  Rule-based transaction limits (daily, weekly, monthly)
  •  Velocity checks (frequency of transactions within time windows)
  •  Cross-border transaction flagging (MoolahMove corridor monitoring)
  •  Unusual pattern detection (transaction amounts, times, recipients)
  •  Device and IP anomaly detection

  MANUAL REVIEW
  •  Compliance Officer reviews escalated alerts
  •  Investigation of flagged transactions
  •  Documented assessment and disposition


10.2  CASH THRESHOLD REPORTING (CTR)

Transactions at or above R 24,999.99 (or the equivalent in any currency)
are reported to the FIC as prescribed Cash Threshold Reports (CTRs) via
the goAML platform. This applies to both single transactions and
aggregated transactions within a 24-hour period where structuring is
suspected.


10.3  RED FLAG INDICATORS

The following are treated as potential red flags:

  •  Transactions inconsistent with the customer's known profile
  •  Rapid movement of funds through the wallet (pass-through activity)
  •  Structuring (splitting transactions to avoid thresholds)
  •  Multiple accounts linked to the same device or IP address
  •  Transactions to or from high-risk jurisdictions
  •  Unusually large or frequent cross-border remittances
  •  Use of the platform immediately after onboarding for high-value
     transactions
  •  Reluctance to provide information or inconsistent documentation
  •  Adverse media associated with a customer



════════════════════════════════════════════════════════════════════════════════
11.  SUSPICIOUS TRANSACTION REPORTING (STR)
════════════════════════════════════════════════════════════════════════════════

11.1  LEGAL OBLIGATION

In terms of Section 29 of FICA, MyMoolah must report to the FIC any
transaction or activity that is known or suspected to:

  •  Involve the proceeds of crime
  •  Be related to money laundering
  •  Be related to terrorist financing or proliferation financing
  •  Have no apparent business or lawful purpose


11.2  INTERNAL REPORTING PROCEDURES

  Step 1:   Employee identifies suspicious activity
  Step 2:   Employee escalates to Compliance Officer (internal report)
  Step 3:   Compliance Officer investigates and documents findings
  Step 4:   If suspicion is confirmed, Compliance Officer files an STR
            via the FIC goAML platform
  Step 5:   Record of the STR and investigation is retained for
            minimum 5 years


11.3  TIPPING-OFF PROHIBITION

Section 29(4) of FICA prohibits any person from disclosing to the customer
or any other person that an STR has been or is being filed. Contravention
of this provision is a criminal offence.


11.4  PROTECTION OF REPORTING EMPLOYEES

Employees who report suspicious activities in good faith are protected
under FICA. No employee shall be subject to disciplinary action, dismissal,
or victimisation for reporting a suspicion.



════════════════════════════════════════════════════════════════════════════════
12.  RECORD KEEPING
════════════════════════════════════════════════════════════════════════════════

12.1  RETENTION REQUIREMENTS (FICA SECTIONS 22 AND 23)

All records relating to CDD, transactions, and compliance activities are
retained for a minimum of 5 years from:

  •  The date the business relationship is terminated, OR
  •  The date of the transaction (for single transactions)

Records include:

  •  Customer identification and verification documents
  •  Transaction records (amount, date, parties, reference)
  •  Account files and business correspondence
  •  STR-related documentation
  •  TFS screening records
  •  PEP screening results
  •  Training records
  •  Internal audit reports


12.2  POPIA COMPLIANCE

Record retention under this RMCP is authorised by law (FICA) and therefore
falls within the exemption in Section 14 of POPIA. After the FICA retention
period expires:

  •  Records containing personal information must be de-identified or
     securely destroyed
  •  Destruction must prevent reconstruction in intelligible form
  •  A destruction register is maintained


12.3  STORAGE AND ACCESS

  •  All records are stored in encrypted databases on Google Cloud
     Platform (AES-256-GCM encryption at rest)
  •  Access is controlled via role-based access control (RBAC)
  •  Audit logs record all access to compliance-related records
  •  Records are available for inspection by the FIC, SARB, PASA, or
     other authorised regulatory bodies



════════════════════════════════════════════════════════════════════════════════
13.  TRAINING AND AWARENESS
════════════════════════════════════════════════════════════════════════════════

13.1  TRAINING POLICY

In terms of Section 42A of FICA, all employees must be trained on their
AML/CFT obligations. MyMoolah implements the following training programme:

  ONBOARDING TRAINING
  •  All new employees receive AML/CFT training within the first week
     of employment
  •  Covers FICA obligations, RMCP overview, red flag indicators,
     reporting procedures

  ANNUAL REFRESHER TRAINING
  •  All employees complete annual AML/CFT refresher training
  •  Includes updates on regulatory changes, emerging typologies, and
     lessons learned

  ROLE-BASED TRAINING
  •  Customer-facing staff:   CDD procedures, red flag identification
  •  Compliance team:         STR filing, investigation techniques, TFS
  •  Senior management:       Governance obligations, risk oversight
  •  Board of Directors:      RMCP approval, strategic AML/CFT oversight


13.2  TRAINING RECORDS

Attendance, content covered, and assessment results are recorded and
retained for a minimum of 5 years. Training records are available for
regulatory inspection.



════════════════════════════════════════════════════════════════════════════════
14.  INTERNAL CONTROLS AND AUDIT
════════════════════════════════════════════════════════════════════════════════

14.1  ONGOING MONITORING

The Compliance Officer continuously monitors the effectiveness of AML/CFT
controls through:

  •  Review of transaction monitoring alert volumes and outcomes
  •  STR filing statistics and quality reviews
  •  TFS screening effectiveness assessments
  •  CDD/KYC completeness reviews
  •  Regulatory update tracking


14.2  INDEPENDENT REVIEW

An independent review of the RMCP is conducted at least annually to
assess:

  •  Whether the RMCP remains adequate and effective
  •  Whether controls are operating as designed
  •  Whether identified deficiencies have been remediated
  •  Whether the risk assessment remains current

Findings and recommendations are reported to the Board and tracked to
completion.


14.3  REMEDIATION

Deficiencies identified through monitoring, audit, or regulatory
inspection are:

  •  Documented with severity classification
  •  Assigned to responsible owners with remediation deadlines
  •  Tracked to completion by the Compliance Officer
  •  Reported to the Board at the next scheduled meeting



════════════════════════════════════════════════════════════════════════════════
15.  NEW PRODUCTS, SERVICES AND TECHNOLOGY
════════════════════════════════════════════════════════════════════════════════

Before launching any new product, service, or delivery channel, MyMoolah
conducts an ML/TF/PF risk assessment that considers:

  •  How the product or service could be exploited for ML/TF/PF
  •  What additional controls are required
  •  Whether existing CDD, monitoring, and reporting capabilities are
     sufficient
  •  Geographic and customer-segment risk factors

Approval from the Compliance Officer and senior management is required
before any new product or service is launched.

This includes, but is not limited to:

  •  New payment corridors (e.g., MoolahMove cross-border expansion)
  •  New integration partners (e.g., TCIB, new VAS suppliers)
  •  New delivery channels (e.g., NFC payments, USSD)
  •  Technology changes that affect AML/CFT controls



════════════════════════════════════════════════════════════════════════════════
16.  REGULATORY REPORTING
════════════════════════════════════════════════════════════════════════════════

MyMoolah files the following reports with the FIC via the goAML platform:

  REPORT TYPE                  TRIGGER / FREQUENCY
  ─────────────────────────    ──────────────────────────────────────
  Suspicious Transaction       Upon identification of suspicion
  Report (STR)                 (Section 29 of FICA)

  Cash Threshold Report        Transactions >= R 24,999.99
  (CTR)                        (Section 28 of FICA)

  Terrorist Property           Upon identification of property
  Report (TPR)                 linked to terrorist activity
                               (Section 28A of FICA)

  TFS Match Report             Upon confirmed match against
                               UNSC / FIC TFS lists
                               (Section 26B of FICA)

MyMoolah is registered with the FIC and maintains active goAML access
for electronic report submission.



════════════════════════════════════════════════════════════════════════════════
17.  PROGRAMME REVIEW AND UPDATES
════════════════════════════════════════════════════════════════════════════════

This RMCP is a living document and is reviewed:

  •  At least annually by the Compliance Officer and the Board
  •  Upon material changes to legislation or regulatory guidance
  •  Upon introduction of new products, services, or markets
  •  Following a significant compliance incident or regulatory finding
  •  Following an independent audit that identifies deficiencies

All amendments are documented in the Version Control Register below and
approved by the Board.


VERSION CONTROL
───────────────

  VERSION    DATE            AUTHOR             DESCRIPTION
  ────────   ──────────────  ─────────────────  ──────────────────────────
  1.0        22 March 2026   MyMoolah           Initial RMCP document



════════════════════════════════════════════════════════════════════════════════
DECLARATION
════════════════════════════════════════════════════════════════════════════════

I, the undersigned, being a duly authorised director of MyMoolah Treasury
Platform (Pty) Ltd, hereby confirm that:

  •  This RMCP has been approved by the Board of Directors
  •  The Company is committed to complying with all applicable AML/CFT
     legislation
  •  Adequate resources will be allocated to implement and maintain this
     programme
  •  The designated Compliance Officer has been appointed with sufficient
     authority and competence to fulfil the role


  Name:        ____________________________

  Designation: ____________________________

  Signature:   ____________________________

  Date:        ____________________________


────────────────────────────────────────────────────────────────────────────────
CONFIDENTIAL — MyMoolah Treasury Platform (Pty) Ltd
────────────────────────────────────────────────────────────────────────────────
