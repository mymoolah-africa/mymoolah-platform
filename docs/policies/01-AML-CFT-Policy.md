# Anti-Money Laundering & Counter-Terrorism Financing Policy

| Field | Detail |
|---|---|
| **Policy Title** | Anti-Money Laundering & Counter-Terrorism Financing (AML/CFT) Policy |
| **Version** | 1.0 |
| **Effective Date** | March 2026 |
| **Next Review Date** | March 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Compliance Officer |
| **Approved By** | Board of Directors, MyMoolah (Pty) Ltd |

---

## 1. Purpose

This policy establishes the framework through which MyMoolah (Pty) Ltd ("MyMoolah") prevents, detects, and reports money laundering (ML) and terrorism financing (TF) activities across all products, services, and channels. It ensures compliance with the Financial Intelligence Centre Act 38 of 2001 (FICA), as amended, the Prevention and Combating of Corrupt Activities Act 12 of 2004 (PRECCA), and aligns with the Financial Action Task Force (FATF) 40 Recommendations.

MyMoolah operates as a Mojaloop-compliant digital wallet and payment platform under sponsorship of Standard Bank of South Africa. All AML/CFT obligations apply to every transaction processed through the MyMoolah platform, including digital wallet operations, value-added services (VAS), PayShap real-time payments, USDC cross-border transfers via VALR, and NFC deposit services.

---

## 2. Scope

This policy applies to:

- All employees, contractors, directors, and officers of MyMoolah (Pty) Ltd.
- All products and services offered through the MyMoolah platform (api-mm.mymoolah.africa, wallet.mymoolah.africa).
- All customer segments, including individual consumers, business accounts, and agent networks.
- All jurisdictions in which MyMoolah operates or facilitates transactions, with particular attention to South African domestic operations and cross-border USDC/stablecoin corridors.
- All third-party service providers, including VALR (USDC exchange), Standard Bank (sponsor bank), and VAS suppliers.

---

## 3. Definitions

| Term | Definition |
|---|---|
| **AML** | Anti-Money Laundering — measures to prevent, detect, and report the laundering of proceeds of crime. |
| **CFT** | Counter-Terrorism Financing — measures to prevent, detect, and report the financing of terrorist activities. |
| **CDD** | Customer Due Diligence — the process of identifying and verifying the identity of customers and assessing ML/TF risk. |
| **CTR** | Cash Threshold Report — a report filed with the FIC for cash transactions at or above R24,999.99. |
| **EDD** | Enhanced Due Diligence — additional measures applied to higher-risk customers, products, or geographies. |
| **FATF** | Financial Action Task Force — the inter-governmental body setting international AML/CFT standards. |
| **FIC** | Financial Intelligence Centre — South Africa's financial intelligence unit established under FICA. |
| **goAML** | The FIC's electronic reporting platform for filing STRs, CTRs, and TPRs. |
| **ML/TF** | Money Laundering / Terrorism Financing. |
| **PEP** | Politically Exposed Person — an individual entrusted with a prominent public function, as defined in FICA S21H. |
| **PRECCA** | Prevention and Combating of Corrupt Activities Act 12 of 2004. |
| **STR** | Suspicious Transaction Report — a report filed with the FIC under FICA S29. |
| **TPR** | Terrorist Property Report — a report filed under FICA S28A. |

---

## 4. ML/TF Risk Assessment Methodology

### 4.1 Risk Appetite Statement

MyMoolah maintains a low risk appetite for ML/TF exposure. The platform will not knowingly facilitate, process, or tolerate any transaction or customer relationship that presents an unacceptable ML/TF risk. Where residual risk cannot be mitigated to acceptable levels, the customer relationship or transaction shall be declined or terminated.

### 4.2 Enterprise Risk Assessment

MyMoolah conducts a comprehensive ML/TF risk assessment annually, or upon material changes to products, services, geographies, or the regulatory environment. The assessment evaluates risk across four dimensions:

**4.2.1 Customer Risk**

| Risk Rating | Criteria |
|---|---|
| **Low** | KYC Tier Gold/Platinum, South African resident, no adverse media, transaction patterns consistent with profile. |
| **Medium** | KYC Tier Silver, new customer (<6 months), minor profile inconsistencies, moderate transaction volumes. |
| **High** | Cross-border USDC activity, high transaction velocity, PEP associations, adverse media flags, sanctions-adjacent jurisdictions. |
| **PEP** | Any individual meeting the FICA S21H definition of a Politically Exposed Person, their family members, or known close associates. Automatically classified as high-risk. |

**4.2.2 Geographic Risk**

- **Low Risk**: South African domestic transactions, PayShap within South African banking system.
- **Medium Risk**: Cross-border USDC transfers to FATF-compliant jurisdictions.
- **High Risk**: Transactions involving FATF grey-list countries, high-risk jurisdictions identified in the MyMoolah sanctions policy, or countries with known deficiencies in AML/CFT frameworks.
- **Prohibited**: Transactions involving sanctioned jurisdictions (Cuba, Iran, North Korea, Syria, Russia, and Russian-occupied Ukrainian territories).

**4.2.3 Product/Service Risk**

| Product | Risk Level | Rationale |
|---|---|---|
| Digital Wallet (domestic) | Low–Medium | KYC-gated, tiered limits, domestic ZAR transactions. |
| VAS (airtime, data, electricity, bills) | Low | Low-value, prepaid, minimal ML/TF utility. |
| PayShap (RTP) | Medium | Real-time settlement, potential for rapid layering. |
| USDC Cross-Border (via VALR) | High | Crypto-asset exposure, cross-border flows, pseudonymity risks. |
| NFC Deposits | Low–Medium | Physical presence required, linked to verified accounts. |

**4.2.4 Channel Risk**

- **Mobile Application**: Primary channel. Risk mitigated through device binding, session management, and behavioural analytics.
- **API Integrations**: B2B channel. Risk mitigated through API key management, IP whitelisting, and transaction monitoring.

---

## 5. Policy Statements

### 5.1 Prohibition of ML/TF Facilitation

MyMoolah shall not knowingly establish or maintain a business relationship, or process a transaction, where there are reasonable grounds to suspect that the funds are the proceeds of unlawful activities or intended for the financing of terrorism.

### 5.2 Risk-Based Approach

All AML/CFT controls are calibrated proportionally to the assessed risk. Higher-risk customers, products, and geographies attract enhanced scrutiny, monitoring, and due diligence measures in accordance with FICA and FATF Recommendations 1 and 10.

### 5.3 Suspicious Activity Indicators

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

### 5.4 Transaction Monitoring

MyMoolah implements automated transaction monitoring across all products. The monitoring system, integrated within the Node.js backend (api-mm.mymoolah.africa), applies rule-based and threshold-based detection logic to identify anomalous patterns. Alerts are escalated to the Compliance team for investigation and, where warranted, filing of reports with the FIC.

---

## 6. Reporting Obligations

### 6.1 Suspicious Transaction Reports (STRs) — FICA S29

MyMoolah shall file an STR with the FIC via the goAML platform within the prescribed timeframe upon forming a suspicion or knowledge that a transaction:

- Involves the proceeds of unlawful activity;
- Is intended to facilitate ML or TF;
- Has no apparent business or lawful purpose; or
- Deviates materially from the customer's known transaction pattern.

There is no monetary threshold for STRs. The obligation arises upon reasonable suspicion regardless of transaction value.

### 6.2 Cash Threshold Reports (CTRs) — FICA S28

Any single cash transaction or aggregated cash transactions by the same person within a 24-hour period reaching or exceeding R24,999.99 shall be reported to the FIC via goAML within the prescribed period. For MyMoolah, this applies primarily to NFC cash deposit transactions.

### 6.3 Terrorist Property Reports (TPRs) — FICA S28A

Where MyMoolah has knowledge or suspects that property in its possession or control is owned, held, or controlled by or on behalf of a person designated under the Protection of Constitutional Democracy against Terrorist and Related Activities Act 33 of 2004, a TPR shall be filed with the FIC immediately.

### 6.4 Tipping-Off Prohibition

In accordance with FICA S29(4), no employee or officer of MyMoolah shall disclose to any person (including the customer) that an STR, CTR, or TPR has been or is being considered, filed, or investigated. Violation of this prohibition constitutes a criminal offence.

---

## 7. Record Keeping

In accordance with FICA Sections 22–25:

- All CDD records shall be retained for a minimum of five (5) years from the date on which the business relationship is terminated.
- All transaction records shall be retained for a minimum of five (5) years from the date on which the transaction was conducted.
- Records relating to STRs, CTRs, and TPRs shall be retained for a minimum of five (5) years from the date of filing.
- Records are stored in encrypted form within MyMoolah's PostgreSQL database (Cloud SQL) and Google Cloud Storage, with access restricted by role-based access control (RBAC).
- All records must be retrievable in a format suitable for presentation to the FIC, SARB, or law enforcement within a reasonable timeframe.

---

## 8. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| **Board of Directors** | Approve AML/CFT policy; allocate adequate resources; set risk appetite; oversee compliance programme. |
| **Chief Compliance Officer (CCO)** | Day-to-day management of the AML/CFT programme; FIC liaison; STR/CTR/TPR filing authority; staff training. |
| **Money Laundering Reporting Officer (MLRO)** | Receive internal suspicious activity reports; assess and escalate to the FIC via goAML; maintain reporting register. |
| **Technology Team** | Implement and maintain automated transaction monitoring, sanctions screening, and KYC systems within the MyMoolah platform (Node.js backend, PostgreSQL, GCP infrastructure). |
| **All Staff** | Identify and report suspicious activity to the MLRO; complete mandatory AML/CFT training; comply with this policy. |

---

## 9. Staff Training & Awareness

- All employees shall receive AML/CFT training within 30 days of onboarding and annually thereafter.
- Training shall cover: ML/TF typologies relevant to digital wallets and crypto-assets, suspicious activity indicators, reporting obligations under FICA, tipping-off prohibitions, and sanctions compliance.
- Targeted training shall be provided to customer-facing, compliance, and technology staff based on their role-specific exposure.
- Training completion records shall be maintained and available for regulatory inspection.

---

## 10. Penalties for Non-Compliance

### 10.1 Regulatory Penalties

Non-compliance with FICA may result in:

- Administrative sanctions imposed by the FIC, including financial penalties of up to R50 million per contravention.
- Criminal prosecution under FICA S68, with penalties including imprisonment of up to 15 years.
- Directives from the SARB or sponsor bank (Standard Bank) to suspend operations.

### 10.2 Internal Disciplinary Action

Any employee who knowingly or negligently fails to comply with this policy shall be subject to disciplinary proceedings up to and including dismissal, in addition to any criminal liability.

---

## 11. Monitoring & Review

- This policy shall be reviewed at least annually or upon material changes to the regulatory environment, product suite, or risk profile.
- The CCO shall present an AML/CFT programme effectiveness report to the Board quarterly.
- Internal audit shall conduct an independent assessment of AML/CFT controls at least annually.
- External audit or regulatory examination findings shall be remediated within agreed timeframes.

---

## 12. Regulatory References

| Reference | Description |
|---|---|
| Financial Intelligence Centre Act 38 of 2001 (FICA) | Primary AML/CFT legislation — S21 (CDD), S22–25 (record keeping), S28 (CTRs), S28A (TPRs), S29 (STRs). |
| FICA Amendment Act 1 of 2017 | Risk-based approach, beneficial ownership, PEP requirements. |
| Prevention and Combating of Corrupt Activities Act 12 of 2004 (PRECCA) | Corruption and money laundering offences. |
| Prevention of Organised Crime Act 121 of 1998 (POCA) | ML offences — S4 (ML), S5 (assisting), S6 (acquisition/possession). |
| Protection of Constitutional Democracy against Terrorist and Related Activities Act 33 of 2004 (POCDATARA) | TF offences and designated persons. |
| National Payment System Act 78 of 1998 (NPS Act) | Payment system regulation. |
| FATF 40 Recommendations | International AML/CFT standards. |
| Basel Committee — Sound Management of Risks related to ML/TF | Banking-grade risk management. |
| FIC Guidance Note 7 | Guidance on suspicious transaction reporting. |
| FIC Guidance Note 4A | Registration and reporting via goAML. |

---

## 13. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Chief Compliance Officer | Initial policy creation. |

---

*This document is the property of MyMoolah (Pty) Ltd and is classified as Confidential. Unauthorised distribution is prohibited.*
