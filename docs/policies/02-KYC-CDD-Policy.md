# Know Your Customer & Customer Due Diligence Policy

| Field | Detail |
|---|---|
| **Policy Title** | Know Your Customer & Customer Due Diligence (KYC/CDD) Policy |
| **Version** | 2.0 |
| **Effective Date** | March 2026 |
| **Next Review Date** | March 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Compliance Officer |
| **Approved By** | Board of Directors, MyMoolah (Pty) Ltd |

---

## 1. Purpose

This policy defines the standards and procedures for customer identification, verification, and ongoing due diligence applied by MyMoolah (Pty) Ltd ("MyMoolah") in fulfilment of its obligations under the Financial Intelligence Centre Act 38 of 2001 (FICA), as amended. It ensures that MyMoolah establishes and verifies the identity of every customer before or during the course of establishing a business relationship or processing a single transaction, and that ongoing due diligence is conducted commensurate with the customer's risk profile.

MyMoolah's KYC/CDD programme operates through a tiered verification model integrated into the digital wallet platform, leveraging AI-powered document verification (GPT-4o as primary OCR engine, Tesseract.js as fallback) to deliver a seamless yet compliant onboarding experience.

---

## 2. Scope

This policy applies to:

- All prospective and existing customers of the MyMoolah platform, including individual consumers, business entities, and agent accounts.
- All channels through which customer onboarding occurs (mobile application at wallet.mymoolah.africa, API integrations).
- All MyMoolah products requiring identity verification, including digital wallet, VAS, PayShap, USDC cross-border transfers, and NFC deposits.
- All employees, contractors, and third-party service providers involved in the customer identification and verification process.
- The entire customer lifecycle — from onboarding through ongoing monitoring to relationship termination.

---

## 3. Definitions

| Term | Definition |
|---|---|
| **Beneficial Owner** | The natural person who ultimately owns or controls a legal entity customer, or on whose behalf a transaction is conducted, as defined in FICA S21B. |
| **CDD** | Customer Due Diligence — the process of identifying, verifying, and understanding the customer and the nature and purpose of the business relationship. |
| **EDD** | Enhanced Due Diligence — additional verification and monitoring measures applied to higher-risk customers. |
| **FICA** | Financial Intelligence Centre Act 38 of 2001, as amended. |
| **KYC** | Know Your Customer — the regulatory and institutional framework for customer identification and verification. |
| **KYC Tier** | MyMoolah's internal classification of customer verification levels (Tier 0, Tier 1, Tier 2). |
| **OCR** | Optical Character Recognition — technology used to extract text from identity document images. |
| **PEP** | Politically Exposed Person — an individual entrusted with a prominent public function, as defined in FICA S21H. |
| **SDD** | Simplified Due Diligence — reduced verification measures permitted for demonstrably low-risk customers and products. |

---

## 4. CDD Levels

MyMoolah applies three levels of due diligence in accordance with the risk-based approach mandated by FICA and FATF Recommendation 10:

### 4.1 Simplified Due Diligence (SDD)

Applicable where the ML/TF risk is assessed as demonstrably low. SDD may be applied to:

- Low-value, prepaid VAS purchases (airtime, data) below R1,000 per transaction.
- Customers at KYC Tier Bronze with wallet limits that constrain ML/TF utility.

SDD requires, at minimum:

- Mobile number verification via OTP.
- Basic personal information (name, date of birth).
- Device fingerprinting and binding.

### 4.2 Standard Due Diligence (Standard CDD)

The default level of due diligence applied to all customers upon establishment of a business relationship, in accordance with FICA S21. Standard CDD requires:

- Full name, date of birth, and South African ID number or passport number.
- Verification of identity against an official identification document.
- Proof of residential address (not older than three months).
- Screening against sanctions lists and PEP databases at onboarding.
- Risk rating assignment.

### 4.3 Enhanced Due Diligence (EDD)

Applied to all high-risk customers, PEPs, and customers engaging in products or geographies assessed as high-risk. EDD measures include, in addition to Standard CDD:

- Source of funds and source of wealth verification.
- Senior management approval for establishing or continuing the business relationship.
- Increased frequency of ongoing monitoring and periodic review.
- Additional documentation as warranted by the risk assessment.
- Enhanced transaction monitoring with lower alert thresholds.

---

## 5. MyMoolah KYC Tier Structure

MyMoolah implements a progressive three-tier KYC model that balances regulatory compliance, financial inclusion, and customer experience. Tier limits are enforced in code via `config/kycTierLimits.js` — the single source of truth.

### 5.1 Tier Definitions

| KYC Tier | Label | Channel | Verification Requirements | Regulatory Basis |
|---|---|---|---|---|
| **Tier 0** | USSD Basic | USSD | Full legal name, SA ID number or international passport number (format-validated via Luhn/regex — no document scan). Mobile number verified. | Conservative position below FIC Exemption 17 (ID format-validated only, not document-verified). |
| **Tier 1** | ID Verified | Web App | ID document uploaded and OCR-verified (GPT-4o primary, Tesseract.js fallback). Extracted data cross-checked against SA ID checksum. No proof of address required. | FIC Exemption 17 ceiling — identity verified against document, residential address exempted. |
| **Tier 2** | Fully Verified | Web App | ID document OCR-verified AND proof of address OCR-verified (utility bill, bank statement, or municipal account not older than 3 months). Sanctions and PEP screening completed. | Full FICA CDD (S21). No Exemption 17 restrictions. |

### 5.2 Transaction Limits by Tier

| Limit | Tier 0 (USSD Basic) | Tier 1 (ID Verified) | Tier 2 (Fully Verified) |
|---|---|---|---|
| **Single Transaction** | R1,000 | R5,000 | R25,000 |
| **Daily Limit** | R3,000 | R5,000 | R50,000 |
| **Monthly Limit** | R5,000 | R25,000 | R100,000 |
| **Maximum Wallet Balance** | R3,000 | R25,000 | R100,000 |
| **Send Money (P2P)** | Not allowed | Allowed | Allowed |
| **Withdraw Cash** | Not allowed | Allowed | Allowed |
| **VAS Purchases** | Allowed | Allowed | Allowed |
| **Receive Deposits** | Allowed (up to balance cap) | Allowed | Allowed |
| **International Transfers** | Not allowed | Not allowed | Allowed (subject to SARB exchange control) |

### 5.3 Account Feature Restrictions by Tier

- **Tier 0 (USSD Basic)**: May purchase VAS products (airtime, data, electricity, bills) up to tier limits. Funds may be received but not sent or withdrawn. No PayShap, no USDC. Designed for financial inclusion on basic/feature phones via USSD.
- **Tier 1 (ID Verified)**: Domestic wallet-to-wallet transfers, bill payments, cash-out (Flash eeziCash, EasyPay), and PayShap enabled within Exemption 17 limits. No international transfers. No USDC.
- **Tier 2 (Fully Verified)**: Full platform access including PayShap, NFC deposits, USDC cross-border transfers (via VALR), MoolahMove international payments, and elevated transaction limits.

### 5.4 Tier Upgrade Paths

| From | To | Action Required |
|---|---|---|
| Tier 0 | Tier 1 | Upload ID document on the web app (wallet.mymoolah.africa). Document is OCR-verified automatically. |
| Tier 1 | Tier 2 | Upload proof of address on the web app. Document is OCR-verified automatically. |
| Tier 0 | Tier 2 | Upload both ID document and proof of address in a single session on the web app. |

Wallet limits (`dailyLimit`, `monthlyLimit`) are automatically upgraded on the user's wallet record when KYC tier changes. Existing users who dial USSD and already have Tier 1 or Tier 2 KYC are only prompted to set a USSD PIN — no re-verification is required.

---

## 6. Identification and Verification Procedures

### 6.1 Accepted Identity Documents

| Document Type | Applicable Tiers | Notes |
|---|---|---|
| South African Green ID Book | Silver, Gold, Platinum | Photo page required. Must not be expired. |
| South African Smart ID Card | Silver, Gold, Platinum | Front and back required. |
| Valid Passport (any nationality) | Silver, Gold, Platinum | Bio-data page required. Must have >3 months validity. |
| Refugee Permit / Asylum Seeker Certificate | Silver, Gold | Valid permit with photo required. |

### 6.2 Accepted Proof of Address

| Document Type | Maximum Age | Notes |
|---|---|---|
| Utility bill (electricity, water, gas) | 3 months | Must show name and residential address. |
| Bank statement | 3 months | From a registered South African bank. |
| Municipal rates account | 3 months | Must show name and property address. |
| Lease agreement | 12 months | Signed by both parties. |
| Employer letter (on letterhead) | 3 months | Confirming residential address. |

### 6.3 AI-Powered Document Verification

MyMoolah employs a dual-engine OCR and verification pipeline implemented in `services/kycService.js`:

**Primary Engine — GPT-4o (OpenAI Vision)**
- Document image submitted to GPT-4o for structured data extraction (name, ID number, date of birth, document number, expiry date).
- Liveness detection and document authenticity assessment.
- Confidence scoring applied to extracted fields.
- Fields with confidence below threshold flagged for manual review.

**Fallback Engine — Tesseract.js**
- Activated when GPT-4o is unavailable, rate-limited, or returns low-confidence results.
- Local OCR processing on the Node.js backend.
- Extracted data cross-referenced against structured validation rules.

**Verification Workflow**
1. Customer uploads document photograph via the mobile application.
2. Image quality check (resolution, blur detection, glare detection).
3. Primary OCR extraction via GPT-4o.
4. Extracted data validated against South African ID number checksum (Luhn algorithm for SA IDs).
5. Data compared against customer-provided information.
6. Results stored in encrypted form in the PostgreSQL database.
7. Discrepancies or low-confidence results escalated to the Compliance team for manual review.

---

## 7. PEP Screening

### 7.1 Identification

All customers are screened against PEP databases at onboarding and at each periodic review cycle. PEP status extends to:

- The PEP individual.
- Family members of the PEP (spouse, children, parents, siblings).
- Known close associates of the PEP.

### 7.2 Treatment of PEPs

In accordance with FICA S21H:

- PEPs are automatically classified as high-risk.
- EDD measures are mandatory.
- Senior management approval is required to establish or continue the business relationship.
- Source of funds and source of wealth must be established and documented.
- Ongoing monitoring frequency is increased (quarterly review minimum).
- PEP status does not automatically preclude a business relationship but requires enhanced controls.

---

## 8. Beneficial Ownership

For business accounts and legal entity customers, MyMoolah shall:

- Identify all natural persons who hold, directly or indirectly, 25% or more of the ownership interest or voting rights in the entity.
- Identify any natural person who exercises effective control over the entity.
- Verify the identity of all identified beneficial owners to Standard CDD level or above.
- Obtain and verify the entity's registration documents (CIPC registration, tax clearance).
- Maintain a current record of the ownership and control structure.
- Re-verify beneficial ownership at least annually or upon notification of changes.

---

## 9. Sanctions Screening at Onboarding

At the point of onboarding (account creation), every customer is screened against:

- Office of Foreign Assets Control (OFAC) Specially Designated Nationals (SDN) list.
- United Nations Security Council Consolidated Sanctions List.
- European Union Consolidated List of Sanctions.
- South African targeted financial sanctions list (FIC-published).

A positive match or potential match results in:

- Immediate suspension of the onboarding process.
- Escalation to the Compliance team for manual review.
- Filing of a report with the FIC if confirmed.
- Account creation denied if match is confirmed.

---

## 10. Ongoing Monitoring

### 10.1 Continuous Transaction Monitoring

Customer transaction activity is monitored against established profiles and risk-based thresholds through automated systems integrated into the MyMoolah backend. Anomalies generate alerts for compliance review.

### 10.2 Periodic Reviews

| Customer Risk Rating | Review Frequency |
|---|---|
| Low | Every 36 months |
| Medium | Every 12 months |
| High / PEP | Every 6 months (minimum quarterly for PEPs) |

Periodic reviews include:

- Re-verification of identity and address if documents have expired.
- Updated sanctions and PEP screening.
- Review of transaction patterns against customer profile.
- Reassessment of risk rating.

### 10.3 Re-Verification Triggers

A customer's KYC status shall be subject to re-verification upon:

- A material change in the customer's risk profile or transaction patterns.
- Receipt of adverse media or negative screening results.
- A request to upgrade KYC tier.
- Expiry of the identity document on file.
- A change in beneficial ownership (business accounts).
- Regulatory direction or law enforcement request.
- Failure of a periodic review.

---

## 11. High-Risk Customer Indicators

The following indicators, individually or in combination, may warrant classification of a customer as high-risk:

- Customer is a PEP, or a family member or known close associate of a PEP.
- Customer resides in or has significant connections to a high-risk jurisdiction.
- Customer's stated occupation or source of funds is inconsistent with transaction activity.
- Customer has been the subject of a previous STR.
- Customer has been named in adverse media related to financial crime.
- Customer's account exhibits patterns consistent with structuring, layering, or rapid movement of funds.
- Customer is reluctant to provide information required for CDD or EDD.
- Customer requests USDC cross-border capabilities without a clear economic rationale.

---

## 12. Record Retention

In accordance with FICA Sections 22–25:

- All CDD records (identity documents, proof of address, verification results, risk assessments) shall be retained for a minimum of five (5) years from the date on which the business relationship is terminated.
- Records are stored in AES-256-GCM encrypted form within MyMoolah's PostgreSQL database (Google Cloud SQL) and identity document images in Google Cloud Storage with server-side encryption.
- Access to CDD records is restricted to authorised Compliance and senior management personnel via RBAC.
- Records must be retrievable in a format suitable for presentation to the FIC, SARB, or law enforcement.
- Deletion of CDD records before the expiry of the retention period is prohibited without the written approval of the CCO and legal counsel.

---

## 13. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| **Board of Directors** | Approve KYC/CDD policy; ensure adequate resources for the compliance programme. |
| **Chief Compliance Officer (CCO)** | Oversee KYC/CDD programme; approve EDD decisions; liaise with regulators. |
| **Compliance Team** | Conduct manual KYC reviews; manage PEP and sanctions screening outcomes; handle escalations. |
| **Technology Team** | Maintain and enhance AI-OCR pipeline (`services/kycService.js`), sanctions screening integration, and automated monitoring systems. |
| **Customer Support** | Guide customers through the KYC process; escalate incomplete or suspicious applications to Compliance. |
| **All Staff** | Report anomalies or concerns to Compliance; complete mandatory KYC/CDD training. |

---

## 14. Staff Training

- All employees involved in customer onboarding, account management, or compliance shall receive KYC/CDD training within 30 days of appointment and annually thereafter.
- Training shall cover: FICA CDD requirements, MyMoolah KYC tier structure, document verification procedures, PEP identification, sanctions screening, record-keeping obligations, and escalation procedures.
- Records of training completion shall be maintained by HR and available for regulatory inspection.

---

## 15. Monitoring & Review

- This policy shall be reviewed at least annually or upon material changes to FICA, regulatory guidance, or MyMoolah's product suite.
- The CCO shall report KYC/CDD programme metrics (onboarding volumes, rejection rates, EDD cases, PEP exposures) to the Board quarterly.
- Internal audit shall assess the adequacy and effectiveness of KYC/CDD controls at least annually.
- AI-OCR verification accuracy shall be monitored continuously, with accuracy metrics reported monthly.

---

## 16. Regulatory References

| Reference | Description |
|---|---|
| Financial Intelligence Centre Act 38 of 2001 (FICA) | S21 (CDD obligations), S21A (risk-based approach), S21B (beneficial ownership), S21H (PEPs), S22–25 (record keeping). |
| FICA Amendment Act 1 of 2017 | Enhanced risk-based approach, beneficial ownership, PEP requirements. |
| Protection of Personal Information Act 4 of 2013 (POPIA) | Lawful processing of personal information collected during CDD. |
| FATF Recommendation 10 | Customer due diligence standards. |
| FATF Recommendation 12 | PEP requirements. |
| Basel Committee — Guidelines on Sound Management of Risks related to ML/TF | Banking-grade CDD standards. |
| ISO 27001:2022 | Information security management for CDD data. |
| Mojaloop FSPIOP API Specification | Interoperability standards for participant identification. |
| FIC Guidance Note 3A | Guidance on customer identification and verification. |
| FIC PCC 21 (Exemption 17) | Scope and application of reduced CDD for low-value accounts (R5,000/day, R25,000/month, R25,000 balance cap). Basis for Tier 1 limits. |

---

## 17. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Chief Compliance Officer | Initial policy creation. |
| 2.0 | March 2026 | Chief Compliance Officer | Replaced Bronze/Silver/Gold/Platinum tiers with Tier 0/1/2 model. Added USSD channel (Tier 0). Defined explicit transaction limits per tier. Added FIC Exemption 17 regulatory basis. Added tier upgrade paths. Limits enforced in code via `config/kycTierLimits.js`. |

---

*This document is the property of MyMoolah (Pty) Ltd and is classified as Confidential. Unauthorised distribution is prohibited.*
