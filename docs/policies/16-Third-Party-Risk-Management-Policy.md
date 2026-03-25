# Third-Party & Vendor Risk Management Policy

| Field | Detail |
|---|---|
| **Policy Title** | Third-Party & Vendor Risk Management Policy |
| **Version** | 1.0 |
| **Effective Date** | March 2026 |
| **Next Review Date** | March 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Risk Officer / Chief Compliance Officer |
| **Approved By** | Board of Directors, MyMoolah (Pty) Ltd |

---

## 1. Purpose

This policy establishes the framework through which MyMoolah (Pty) Ltd ("MyMoolah") identifies, assesses, manages, and monitors risks arising from its engagement with third-party service providers, vendors, and outsourcing partners. It ensures that vendor relationships do not compromise the operational resilience, regulatory compliance, data security, or financial stability of the MyMoolah platform.

MyMoolah's business model relies on strategic partnerships with sponsor banks, crypto exchanges, value-added services (VAS) suppliers, payment facilitators, and technology providers. Each engagement introduces inherent risk that must be governed with the same rigour applied to internal operations, in accordance with the South African Reserve Bank (SARB) Directive D3/2018 on Outsourcing, the Banks Act 94 of 1990, and the Financial Sector Regulation Act 9 of 2017.

---

## 2. Scope

This policy applies to:

- All third-party service providers, vendors, contractors, and outsourcing partners engaged by MyMoolah.
- All departments and personnel responsible for procuring, managing, or overseeing vendor relationships.
- All products, services, and channels that depend on or integrate with third-party systems, including the Standard Bank sponsor bank relationship, VALR USDC exchange integration, Flash airtime/voucher supply, MobileMart electricity/data/bill payments, EasyPay cash-in network, Zapper QR payment processing, Yellow Card international remittance corridors, and Halo Dot NFC deposit terminals.
- Fourth-party relationships (vendors engaged by MyMoolah's direct vendors) where those relationships materially affect MyMoolah's operations or data.
- Cloud infrastructure providers, including Google Cloud Platform (GCP) services (Cloud Run, Cloud SQL, GCS, Secret Manager).

---

## 3. Definitions

| Term | Definition |
|---|---|
| **Third Party** | Any external entity that provides goods, services, or functions to MyMoolah under contractual arrangement. |
| **Vendor** | A third party supplying technology, operational services, or business process capabilities. |
| **Outsourcing** | The use of a third party to perform activities that would normally be undertaken by MyMoolah internally, on a continuing basis. |
| **Significant Outsourcing** | Outsourcing of a function which, if disrupted, would materially impact MyMoolah's business operations, reputation, or regulatory compliance, as defined under SARB Directive D3/2018. |
| **Fourth Party** | A subcontractor or service provider engaged by a direct third party of MyMoolah. |
| **Inherent Risk** | The level of risk present in a vendor relationship before the application of controls or mitigating measures. |
| **Residual Risk** | The level of risk remaining after the application of controls and mitigating measures. |
| **Concentration Risk** | The risk arising from excessive reliance on a single vendor or a small number of vendors for critical functions. |
| **SLA** | Service Level Agreement — contractually defined performance metrics and obligations. |
| **DPA** | Data Processing Agreement — contractual terms governing the processing of personal data by a vendor. |
| **BCP** | Business Continuity Plan — documented procedures for maintaining operations during disruption. |
| **CRO** | Chief Risk Officer. |

---

## 4. Vendor Risk Categories

### 4.1 Classification Framework

All vendors shall be classified into one of four risk categories based on the criticality of the function they perform, the sensitivity of data they access, and the regulatory implications of the relationship:

| Category | Criteria | MyMoolah Vendors |
|---|---|---|
| **Critical** | Vendor performs a core banking or payment function; disruption would render MyMoolah unable to operate; vendor processes or stores sensitive financial data; regulatory notification required for change of vendor. | Standard Bank of South Africa (sponsor bank, PayShap, settlement), VALR (USDC crypto exchange, cross-border corridors). |
| **High** | Vendor provides a material revenue-generating service; disruption would significantly impact customer experience or revenue; vendor handles transaction data or customer funds. | Flash (airtime/voucher supply), MobileMart (electricity/data/bill payments), EasyPay (cash-in network). |
| **Medium** | Vendor provides a supplementary service; disruption would cause inconvenience but not material operational failure; vendor has limited access to sensitive data. | Zapper (QR payments), Halo Dot (NFC deposit terminals), Yellow Card (international remittance). |
| **Low** | Vendor provides non-core support services; disruption would have negligible operational impact; vendor has no access to customer data or financial systems. | Utility providers, office supplies, non-critical SaaS tools. |

### 4.2 Classification Review

Vendor risk classifications shall be reviewed annually, or upon any material change in the vendor relationship, scope of services, regulatory environment, or vendor's financial condition.

---

## 5. Due Diligence Requirements

### 5.1 Pre-Engagement Due Diligence

Before engaging any new vendor classified as Critical, High, or Medium risk, MyMoolah shall conduct comprehensive due diligence covering:

**(a) Financial Stability Assessment**
- Review of audited financial statements for the preceding three financial years.
- Assessment of credit ratings, where available.
- Evaluation of going-concern viability and solvency.
- For Critical vendors: independent financial analysis or credit assessment report.

**(b) Regulatory Standing**
- Verification of all required licences, registrations, and regulatory approvals.
- Confirmation that the vendor is not subject to current regulatory enforcement actions, sanctions, or debarment orders.
- For financial services vendors: confirmation of registration with the Financial Sector Conduct Authority (FSCA), SARB, or Financial Intelligence Centre (FIC), as applicable.
- Sanctions screening against OFAC, EU, UN, and South African domestic sanctions lists.

**(c) Information Security Assessment**
- Review of the vendor's information security policies, standards, and procedures.
- Confirmation of ISO 27001 certification, SOC 2 Type II report, or equivalent security assurance.
- Assessment of data encryption standards (AES-256-GCM minimum for data at rest; TLS 1.3 for data in transit).
- Evaluation of access control mechanisms, vulnerability management, and incident response capabilities.
- For vendors processing personal information: confirmation of compliance with the Protection of Personal Information Act 4 of 2013 (POPIA).

**(d) Business Continuity and Disaster Recovery**
- Review of the vendor's Business Continuity Plan and Disaster Recovery Plan.
- Confirmation of Recovery Time Objective (RTO) and Recovery Point Objective (RPO) aligned with MyMoolah's operational requirements.
- Evidence of BCP testing within the preceding twelve months.

**(e) AML/CFT Compliance**
- Confirmation that the vendor maintains an AML/CFT compliance programme commensurate with its regulatory obligations.
- For vendors in the financial services value chain: verification of FICA compliance, suspicious transaction reporting procedures, and sanctions screening capabilities.

### 5.2 Enhanced Due Diligence for Critical Vendors

For vendors classified as Critical, additional due diligence shall include:
- On-site assessment or detailed virtual assessment of operational and security controls.
- Review of the vendor's own third-party (fourth-party) risk management arrangements.
- Assessment of concentration risk to MyMoolah should the vendor fail or terminate the relationship.
- Legal opinion on contractual enforceability and cross-border jurisdictional risks, where applicable.
- Board-level approval of the vendor engagement.

---

## 6. Contractual Requirements

### 6.1 Mandatory Contractual Provisions

All vendor contracts for Critical, High, and Medium risk vendors shall include the following provisions:

**(a) Service Level Agreements (SLAs)**
- Defined uptime requirements (99.9% minimum for Critical vendors; 99.5% for High; 99.0% for Medium).
- Response time obligations for incidents (Critical: 15 minutes; High: 1 hour; Medium: 4 hours).
- Resolution time obligations (Critical: 4 hours; High: 8 hours; Medium: 24 hours).
- Performance measurement methodology and reporting frequency.
- Financial penalties or service credits for SLA breaches.

**(b) Data Processing Agreements**
- Clear delineation of data controller and data processor roles under POPIA.
- Specification of personal information categories processed and purposes of processing.
- Data localisation requirements where applicable.
- Prohibition on secondary use of MyMoolah customer data.
- Data breach notification obligations (within 24 hours of discovery).
- Data return and destruction obligations upon contract termination.

**(c) Audit Rights**
- MyMoolah's right to audit the vendor's operations, security controls, and compliance programme, with reasonable notice (30 calendar days).
- Right to commission independent third-party audits at MyMoolah's discretion.
- Obligation on the vendor to cooperate with audits by MyMoolah's regulators (SARB, FSCA, FIC).

**(d) Termination Clauses**
- Termination for cause (material breach, regulatory sanction, insolvency, change of control).
- Termination for convenience with defined notice period (minimum 90 days for Critical; 60 days for High; 30 days for Medium).
- Transition assistance obligations during exit period.
- Intellectual property and data ownership upon termination.

**(e) Liability and Indemnification**
- Appropriate limitations of liability commensurate with the risk category.
- Indemnification for losses arising from vendor's breach of contract, negligence, or regulatory non-compliance.
- Cyber insurance requirements for Critical and High risk vendors.

---

## 7. Ongoing Monitoring

### 7.1 Performance Monitoring

| Risk Category | Monitoring Frequency | Review Depth |
|---|---|---|
| Critical | Monthly performance review; quarterly strategic review | Full SLA dashboard, incident analysis, capacity planning |
| High | Quarterly performance review | SLA compliance, incident review, service quality |
| Medium | Semi-annual performance review | SLA summary, issue tracking |
| Low | Annual review | Contract compliance verification |

### 7.2 Compliance Monitoring

- Annual verification of regulatory licences, registrations, and certifications for Critical and High risk vendors.
- Semi-annual sanctions screening of all vendor entities and key personnel.
- Annual review of vendor's AML/CFT compliance programme for vendors in the financial services value chain.

### 7.3 Financial Health Monitoring

- Annual review of audited financial statements for Critical and High risk vendors.
- Monitoring of material adverse changes, credit rating downgrades, or significant litigation.
- Immediate escalation to CRO upon identification of financial distress indicators.

### 7.4 Security Monitoring

- Annual review or refresh of information security assessments for Critical and High risk vendors.
- Monitoring of vendor security incident disclosures and data breaches.
- Periodic vulnerability assessment of vendor-facing integrations and API connections.

---

## 8. Concentration Risk Management

### 8.1 Concentration Risk Assessment

MyMoolah shall assess and manage concentration risk arising from:
- Dependence on a single vendor for a critical function (e.g., Standard Bank for sponsor banking and settlement).
- Multiple services provided by a single vendor.
- Geographic concentration of vendor operations.
- Shared infrastructure or technology platforms across multiple vendors.

### 8.2 Mitigation Measures

- Identification of alternative vendors or contingency arrangements for all Critical functions.
- Development of documented contingency plans for the failure or unavailability of each Critical vendor.
- Diversification of vendor base where commercially and operationally feasible.
- Regular testing of contingency arrangements (minimum annually for Critical vendor scenarios).

---

## 9. Fourth-Party Risk

### 9.1 Fourth-Party Risk Assessment

MyMoolah shall require all Critical and High risk vendors to disclose material subcontracting arrangements (fourth-party relationships) that could affect the delivery of services to MyMoolah.

### 9.2 Requirements

- Vendors must obtain MyMoolah's prior written consent before subcontracting material functions.
- Vendors must ensure that fourth parties meet equivalent security, compliance, and data protection standards.
- MyMoolah reserves the right to assess and object to fourth-party engagements that introduce unacceptable risk.

---

## 10. Outsourcing — SARB Directive D3/2018 Compliance

### 10.1 Significant Outsourcing

Any function classified as significant outsourcing under SARB Directive D3/2018 shall be subject to:
- Prior notification to, or approval by, the SARB (via the sponsor bank relationship where applicable).
- Board-level approval and documented risk assessment.
- Enhanced contractual provisions including regulatory access rights.
- Ongoing reporting to the Board on the performance and risk profile of the outsourced function.

### 10.2 Outsourcing Register

MyMoolah shall maintain a comprehensive outsourcing register documenting all outsourced functions, vendor details, risk classifications, contract terms, and review dates. The register shall be available for inspection by regulators upon request.

---

## 11. Exit Strategy

### 11.1 Exit Planning for Critical Vendors

MyMoolah shall maintain documented exit strategies for all Critical and High risk vendors, including:
- Identification of alternative vendors or internal capability to absorb the function.
- Data migration plan and timeline.
- Customer communication plan.
- Regulatory notification requirements.
- Financial provisioning for transition costs.
- Minimum transition period requirements (6 months for Critical; 3 months for High).

### 11.2 Exit Triggers

Exit strategy activation shall be triggered by:
- Material and persistent SLA breaches.
- Vendor insolvency or material financial distress.
- Regulatory enforcement action against the vendor.
- Material security breach affecting MyMoolah data.
- Strategic decision to change vendor or insource the function.

---

## 12. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| **Board of Directors** | Approve the Third-Party Risk Management Policy; approve engagements with Critical vendors; receive quarterly vendor risk reports. |
| **Chief Risk Officer (CRO)** | Oversee vendor risk management framework; chair the Vendor Risk Committee; approve vendor risk classifications; escalate material vendor risks to the Board. |
| **Chief Compliance Officer** | Ensure vendor compliance with regulatory requirements; coordinate regulatory notifications for significant outsourcing; monitor vendor AML/CFT compliance. |
| **Chief Technology Officer** | Assess vendor technology and security controls; manage API integrations and data exchange security; coordinate vendor security assessments. |
| **Vendor Risk Committee** | Conduct vendor risk assessments; review due diligence findings; monitor ongoing vendor performance; maintain the outsourcing register. |
| **Business Unit Heads** | Identify vendor requirements; manage day-to-day vendor relationships; report performance issues and incidents; participate in vendor reviews. |
| **Procurement** | Coordinate vendor selection processes; negotiate contractual terms; maintain contract repository; track contract renewals and expirations. |

---

## 13. Monitoring & Review

- This policy shall be reviewed annually, or upon material changes to the vendor landscape, regulatory requirements, or MyMoolah's risk appetite.
- The Vendor Risk Committee shall meet quarterly to review the vendor risk register, monitor key risk indicators, and assess the effectiveness of vendor risk controls.
- An annual vendor risk report shall be presented to the Board, summarising the vendor risk profile, material incidents, due diligence outcomes, and recommended improvements.

---

## 14. Regulatory References

| Reference | Description |
|---|---|
| SARB Directive D3/2018 | Outsourcing of Functions within Banks |
| Banks Act 94 of 1990 | Regulation of banking institutions in South Africa |
| Financial Sector Regulation Act 9 of 2017 | Twin peaks regulatory framework |
| POPIA (Act 4 of 2013) | Protection of Personal Information Act |
| FICA (Act 38 of 2001) | Financial Intelligence Centre Act |
| ISO 27001:2022 | Information Security Management Systems |
| ISO 31000:2018 | Risk Management Guidelines |
| King IV Code (2016) | Principle 11: Risk Governance |
| FATF Recommendation 17 | Reliance on third parties for CDD |

---

## 15. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Chief Risk Officer | Initial policy creation |

---

*This policy is the property of MyMoolah (Pty) Ltd and is classified as Confidential. Unauthorised reproduction or distribution is prohibited.*
