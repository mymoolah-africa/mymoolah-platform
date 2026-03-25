# Enterprise Risk Management Framework

| Field | Detail |
|---|---|
| **Policy Title** | Enterprise Risk Management Framework |
| **Version** | 1.0 |
| **Effective Date** | March 2026 |
| **Next Review Date** | March 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Risk Officer |
| **Approved By** | Board of Directors, MyMoolah (Pty) Ltd |

---

## 1. Purpose

This framework establishes the principles, structures, processes, and responsibilities through which MyMoolah (Pty) Ltd ("MyMoolah") identifies, assesses, manages, monitors, and reports risks across the organisation. It provides a systematic and consistent approach to risk management that supports informed decision-making, protects stakeholder value, ensures regulatory compliance, and promotes a risk-aware culture at all levels of the organisation.

As a Mojaloop-compliant digital wallet and payment platform operating under the sponsorship of Standard Bank of South Africa, MyMoolah is exposed to a broad spectrum of financial, operational, regulatory, and technology risks. This framework ensures that these risks are governed in accordance with King IV Principle 11 (risk governance), ISO 31000:2018 (risk management guidelines), and Basel Committee principles for operational risk management, adapted for the South African fintech operating environment.

---

## 2. Scope

This framework applies to:

- All business activities, operations, products, services, and channels of MyMoolah (Pty) Ltd.
- All employees, contractors, directors, and officers at every level of the organisation.
- All risk categories, including but not limited to credit risk, market risk, operational risk, compliance and regulatory risk, technology and cyber risk, strategic risk, reputational risk, and liquidity risk.
- All third-party relationships and outsourced functions that materially affect MyMoolah's risk profile.
- All geographic jurisdictions in which MyMoolah operates, with particular focus on South African domestic operations and cross-border USDC/stablecoin corridors.

---

## 3. Definitions

| Term | Definition |
|---|---|
| **Risk** | The effect of uncertainty on the achievement of MyMoolah's objectives, measured in terms of likelihood and impact. |
| **Risk Appetite** | The aggregate level and types of risk that MyMoolah is willing to accept in pursuit of its strategic objectives. |
| **Risk Tolerance** | The specific boundaries within which risk must be managed for each risk category, expressed as quantitative thresholds or qualitative parameters. |
| **Inherent Risk** | The level of risk present before the application of controls or mitigating measures. |
| **Residual Risk** | The level of risk remaining after the application of controls and mitigating measures. |
| **Key Risk Indicator (KRI)** | A quantitative measure that provides an early warning of increasing risk exposure in a particular area. |
| **Risk Register** | A comprehensive record of identified risks, their assessments, controls, owners, and monitoring status. |
| **Risk Event** | An occurrence or situation that has materialised and has, or could have, an adverse impact on MyMoolah. |
| **Three Lines of Defence** | A governance model separating risk management responsibilities across business operations (first line), risk and compliance functions (second line), and internal audit (third line). |
| **CRO** | Chief Risk Officer. |
| **ERM** | Enterprise Risk Management. |

---

## 4. Risk Governance Structure

### 4.1 Governance Hierarchy

```
Board of Directors
        │
        ├── Audit Committee
        │
        └── Risk Committee
                │
                └── Chief Risk Officer (CRO)
                        │
                        ├── Risk Management Function
                        │
                        ├── Compliance Function (CCO)
                        │
                        └── Business Unit Risk Owners
```

### 4.2 Roles and Responsibilities

| Governance Body / Role | Responsibility |
|---|---|
| **Board of Directors** | Approve the Enterprise Risk Management Framework and risk appetite statement; exercise ultimate oversight of risk management; receive and consider quarterly risk reports; ensure adequate resources for risk management. |
| **Risk Committee** | Oversee the implementation of the risk management framework; review and recommend the risk appetite statement for Board approval; monitor the enterprise risk register; review key risk indicators and emerging risks; evaluate the effectiveness of risk mitigation strategies; meet at least quarterly. |
| **Audit Committee** | Oversee the three lines of defence model; evaluate the independence and effectiveness of internal audit; receive combined assurance reports; monitor remediation of risk-related audit findings. |
| **Chief Risk Officer (CRO)** | Lead the risk management function; develop and maintain the risk management framework and policies; maintain the enterprise risk register; report to the Risk Committee and Board; coordinate risk assessments; monitor key risk indicators; escalate material risks and emerging threats. |
| **Chief Compliance Officer (CCO)** | Manage regulatory and compliance risk as a component of the ERM framework; ensure compliance with FICA, POPIA, SARB requirements, and other applicable regulations; coordinate with the CRO on compliance-related risk matters. |
| **Business Unit Heads** | Own and manage risks within their areas of responsibility (first line); implement risk mitigation controls; report risk events and emerging risks; participate in risk assessments; maintain operational risk registers. |
| **All Personnel** | Identify and report risks and risk events; comply with risk management policies and procedures; participate in risk awareness training; escalate concerns through appropriate channels. |

---

## 5. Risk Appetite Statement

### 5.1 Risk Appetite Principles

MyMoolah's risk appetite is defined by the following principles:

- **Capital Protection**: MyMoolah has zero appetite for risks that could threaten its capital adequacy or going-concern status.
- **Regulatory Compliance**: MyMoolah has zero appetite for material regulatory non-compliance. No business objective justifies a deliberate breach of law or regulation.
- **Customer Trust**: MyMoolah has very low appetite for risks that could compromise customer funds, data, or trust. Customer protection is paramount.
- **Operational Resilience**: MyMoolah has low appetite for risks that could cause prolonged service disruption. Platform availability targets shall be maintained at 99.9% or above.
- **Strategic Growth**: MyMoolah accepts moderate, controlled risk in pursuit of strategic objectives, new product development, and market expansion, provided such risk is within defined tolerances and subject to appropriate governance.
- **Innovation**: MyMoolah accepts moderate risk in adopting new technologies and business models (e.g., USDC/stablecoin, NFC deposits), provided that regulatory, security, and operational risks are assessed and mitigated before launch.

### 5.2 Quantitative Risk Tolerances

| Risk Category | Tolerance Threshold | Escalation Trigger |
|---|---|---|
| Operational losses (single event) | < R500,000 | Any single event > R250,000 |
| Cumulative operational losses (annual) | < R2,000,000 | Cumulative losses > R1,000,000 |
| System downtime (monthly) | < 0.1% (43 minutes) | Any outage > 30 minutes |
| Regulatory findings (critical) | Zero | Any critical finding |
| Customer complaints (monthly) | < 0.5% of active users | Rate exceeding 0.3% |
| Fraud loss ratio | < 0.05% of transaction value | Ratio exceeding 0.03% |
| AML/CFT STR filing timeliness | 100% within prescribed period | Any late filing |

---

## 6. Risk Categories

### 6.1 Risk Taxonomy

MyMoolah's enterprise risk taxonomy comprises the following categories:

**(a) Credit Risk**
Risk of financial loss arising from a counterparty's failure to meet its contractual obligations. In MyMoolah's context: vendor payment defaults, settlement failures with Standard Bank, VALR counterparty exposure, customer overdraft or negative balance risk.

**(b) Market Risk**
Risk of financial loss arising from adverse movements in market prices. In MyMoolah's context: USDC/ZAR exchange rate fluctuations, stablecoin de-pegging risk (USDC), interest rate risk on float holdings.

**(c) Operational Risk**
Risk of loss resulting from inadequate or failed internal processes, people, systems, or external events. In MyMoolah's context: system outages, processing errors, human error, vendor service failures, GCP infrastructure incidents, payment processing failures.

**(d) Compliance & Regulatory Risk**
Risk of legal or regulatory sanctions, financial loss, or reputational damage arising from failure to comply with applicable laws, regulations, codes, and standards. In MyMoolah's context: FICA non-compliance, POPIA breaches, SARB directive violations, FSCA conduct failures, sanctions screening failures.

**(e) Technology & Cyber Risk**
Risk of financial loss, operational disruption, or reputational damage arising from failures in information technology systems or cyber attacks. In MyMoolah's context: data breaches, API vulnerabilities, DDoS attacks, cloud infrastructure compromise (GCP), ransomware, insider threats, third-party integration vulnerabilities.

**(f) Strategic Risk**
Risk arising from adverse business decisions, improper implementation of strategic plans, or failure to respond to changes in the competitive or regulatory environment. In MyMoolah's context: market disruption by competitors, regulatory changes affecting the fintech business model, failure to scale, sponsor bank relationship risk.

**(g) Reputational Risk**
Risk of damage to MyMoolah's reputation arising from negative public perception, adverse media coverage, customer complaints, regulatory censure, or association with unethical or unlawful activities. This risk is a secondary consequence of other risk categories materialising.

**(h) Liquidity Risk**
Risk that MyMoolah is unable to meet its financial obligations as they fall due without incurring unacceptable losses. In MyMoolah's context: float management, settlement timing mismatches, customer withdrawal surges, vendor payment timing.

---

## 7. Risk Assessment Methodology

### 7.1 Likelihood and Impact Matrix (5×5)

All identified risks shall be assessed using a standardised 5×5 likelihood and impact matrix:

**Likelihood Scale:**

| Rating | Descriptor | Probability |
|---|---|---|
| 1 | Rare | < 5% probability of occurrence within 12 months |
| 2 | Unlikely | 5–20% probability |
| 3 | Possible | 20–50% probability |
| 4 | Likely | 50–80% probability |
| 5 | Almost Certain | > 80% probability |

**Impact Scale:**

| Rating | Descriptor | Financial Impact | Operational Impact | Regulatory Impact |
|---|---|---|---|---|
| 1 | Insignificant | < R50,000 | Minor inconvenience; no service disruption | No regulatory interest |
| 2 | Minor | R50,000–R250,000 | Short-term disruption (< 4 hours); limited customer impact | Regulatory inquiry |
| 3 | Moderate | R250,000–R1,000,000 | Service disruption (4–24 hours); noticeable customer impact | Regulatory finding (Minor) |
| 4 | Major | R1,000,000–R5,000,000 | Extended disruption (> 24 hours); significant customer impact; media attention | Regulatory finding (Major); potential sanction |
| 5 | Catastrophic | > R5,000,000 | Complete service failure; existential threat; widespread customer harm | Regulatory enforcement; licence revocation risk |

### 7.2 Risk Rating Matrix

| | Impact 1 | Impact 2 | Impact 3 | Impact 4 | Impact 5 |
|---|---|---|---|---|---|
| **Likelihood 5** | Medium (5) | High (10) | High (15) | Critical (20) | Critical (25) |
| **Likelihood 4** | Low (4) | Medium (8) | High (12) | High (16) | Critical (20) |
| **Likelihood 3** | Low (3) | Medium (6) | Medium (9) | High (12) | High (15) |
| **Likelihood 2** | Low (2) | Low (4) | Medium (6) | Medium (8) | High (10) |
| **Likelihood 1** | Low (1) | Low (2) | Low (3) | Low (4) | Medium (5) |

**Risk Response by Rating:**

| Rating | Range | Response | Governance |
|---|---|---|---|
| Critical | 20–25 | Immediate action required; Board notification; may require business activity cessation | Board and Risk Committee |
| High | 10–16 | Urgent mitigation required; CRO oversight; enhanced monitoring | Risk Committee |
| Medium | 5–9 | Active management and monitoring; defined mitigation plan | CRO and Business Unit Head |
| Low | 1–4 | Accept and monitor; review at regular intervals | Business Unit Head |

---

## 8. Risk Register

### 8.1 Register Structure

The enterprise risk register shall capture the following information for each identified risk:

- Unique risk identifier.
- Risk category (per taxonomy in Section 6).
- Risk description (cause, event, consequence).
- Risk owner (accountable individual).
- Inherent risk rating (likelihood × impact before controls).
- Key controls and mitigation measures in place.
- Control effectiveness assessment (Effective, Partially Effective, Ineffective).
- Residual risk rating (likelihood × impact after controls).
- Risk response strategy (Avoid, Mitigate, Transfer, Accept).
- Key risk indicators and thresholds.
- Action items and target dates for risk reduction.
- Date of last assessment and next review date.

### 8.2 Register Maintenance

- The enterprise risk register shall be maintained by the CRO and updated quarterly at minimum.
- Business units shall maintain operational risk registers aligned with the enterprise register.
- Risk register reviews shall be conducted in conjunction with quarterly Risk Committee meetings.
- New risks shall be added to the register within 14 calendar days of identification.
- Materialised risks shall be reviewed and root cause analysed within 30 calendar days of the risk event.

---

## 9. Key Risk Indicators (KRIs)

### 9.1 KRI Framework

Key risk indicators shall be established for each material risk to provide early warning of deteriorating risk conditions. Each KRI shall have defined thresholds:

| KRI | Green (Normal) | Amber (Warning) | Red (Breach) | Reporting |
|---|---|---|---|---|
| Platform availability | ≥ 99.9% | 99.5%–99.9% | < 99.5% | Weekly |
| API response time (P95) | < 200ms | 200–500ms | > 500ms | Daily |
| Transaction error rate | < 0.1% | 0.1%–0.5% | > 0.5% | Daily |
| STR filing timeliness | 100% on time | 1 late filing | > 1 late filing | Monthly |
| Sanctions screening false negative rate | 0% | N/A | Any confirmed miss | Monthly |
| Customer complaint rate | < 0.3% | 0.3%–0.5% | > 0.5% | Monthly |
| Fraud loss ratio | < 0.03% | 0.03%–0.05% | > 0.05% | Monthly |
| Vendor SLA compliance (Critical) | ≥ 99.9% | 99.5%–99.9% | < 99.5% | Monthly |
| Open audit findings (Critical/Major) | 0 overdue | 1–2 overdue | > 2 overdue | Monthly |
| Employee training completion | ≥ 95% | 85%–95% | < 85% | Quarterly |
| Security vulnerability (Critical) | 0 unpatched > 7 days | 1 unpatched > 7 days | > 1 unpatched > 7 days | Weekly |
| Data breach incidents | 0 | N/A | Any confirmed breach | Immediate |

### 9.2 KRI Escalation

- Amber KRIs shall be reported to the CRO and relevant business unit head for investigation and corrective action.
- Red KRIs shall be immediately escalated to the CRO and reported to the Risk Committee at its next meeting (or immediately for Critical-rated risks).
- KRI trends shall be analysed quarterly to identify systemic risk patterns.

---

## 10. Risk Reporting

### 10.1 Reporting Cadence

| Report | Recipient | Frequency | Content |
|---|---|---|---|
| Operational risk dashboard | CRO, Business Unit Heads | Weekly | KRI status, incidents, emerging issues |
| Monthly risk report | Executive Management | Monthly | Risk register updates, KRI trends, incident analysis, remediation progress |
| Quarterly risk report | Risk Committee, Board | Quarterly | Enterprise risk profile, risk appetite utilisation, emerging risks, risk mitigation effectiveness, KRI dashboard |
| Annual risk assessment | Board of Directors | Annual | Comprehensive enterprise risk assessment, risk appetite review, strategic risk outlook, framework effectiveness evaluation |
| Ad-hoc risk alerts | CRO, Board (as appropriate) | As required | Material risk events, Critical KRI breaches, emerging threats |

### 10.2 Report Content Standards

All risk reports shall:
- Present an objective and balanced view of the risk landscape.
- Include forward-looking risk assessments, not solely historical incident reporting.
- Highlight changes in risk profile since the previous reporting period.
- Include management commentary on risk mitigation actions and their effectiveness.
- Be clear, concise, and accessible to non-specialist Board members.

---

## 11. Three Lines of Defence Model

### 11.1 First Line — Business Operations

| Responsibility | Owner |
|---|---|
| Own and manage risks within their business areas | Business Unit Heads |
| Implement and operate risk controls | Operational management |
| Identify and escalate risk events and emerging risks | All personnel |
| Maintain operational risk registers | Business Unit Heads |
| Comply with risk management policies and procedures | All personnel |

### 11.2 Second Line — Risk and Compliance Functions

| Responsibility | Owner |
|---|---|
| Develop and maintain the risk management framework | CRO |
| Provide independent risk oversight and challenge | Risk Management Function |
| Monitor compliance with regulatory requirements | CCO / Compliance Function |
| Monitor key risk indicators and risk appetite utilisation | CRO |
| Advise business units on risk management practices | Risk Management Function |
| Develop risk policies, standards, and methodologies | CRO |

### 11.3 Third Line — Internal Audit

| Responsibility | Owner |
|---|---|
| Provide independent and objective assurance on the effectiveness of risk management and internal controls | Internal Audit |
| Assess the design and operating effectiveness of the first and second lines | Internal Audit |
| Report findings to the Audit Committee | Head of Internal Audit |
| Verify remediation of risk-related findings | Internal Audit |

---

## 12. Emerging Risk Identification

### 12.1 Emerging Risk Categories

MyMoolah shall proactively monitor and assess emerging risks, including but not limited to:

**(a) Crypto-Asset Regulation**
- Evolving FSCA regulatory framework for crypto assets under the Financial Advisory and Intermediary Services Act (FAIS) declaration.
- Potential SARB requirements for stablecoin issuers and intermediaries.
- International regulatory developments (MiCA in EU, SEC/CFTC in US) that may influence South African approaches.
- Impact on VALR partnership and USDC corridor operations.

**(b) Artificial Intelligence Regulation**
- Emerging AI governance requirements affecting automated decision-making (KYC, transaction monitoring, credit scoring).
- Bias and fairness requirements in algorithmic systems.
- Explainability obligations for AI-driven compliance decisions.

**(c) Fintech Regulatory Changes**
- National Payment System Act amendments affecting digital wallet operators.
- SARB position on fintech licensing and prudential requirements.
- Open banking and data-sharing regulatory developments.
- Conduct of Financial Institutions (COFI) Bill implications.

**(d) Geopolitical and Macroeconomic Risk**
- South African grey-listing impact on cross-border transaction monitoring requirements.
- Currency volatility affecting ZAR/USDC corridors.
- Load-shedding impact on infrastructure and operations.

### 12.2 Emerging Risk Process

- The CRO shall conduct a quarterly emerging risk scan, drawing on regulatory publications, industry intelligence, peer analysis, and global risk reports.
- Identified emerging risks shall be documented in the risk register with a preliminary assessment and monitoring plan.
- Material emerging risks shall be reported to the Risk Committee with recommended preparedness actions.

---

## 13. Stress Testing

### 13.1 Stress Testing Programme

MyMoolah shall conduct periodic stress testing to assess the organisation's resilience under adverse conditions:

| Scenario | Frequency | Scope |
|---|---|---|
| Critical vendor failure (Standard Bank, VALR) | Annual | Operational continuity, customer impact, financial impact |
| Cyber attack / data breach | Annual | Incident response, recovery time, customer communication, regulatory notification |
| Significant fraud event | Annual | Financial loss, control effectiveness, customer remediation |
| Regulatory enforcement action | Annual | Business continuity, reputational impact, remediation capacity |
| Liquidity stress (customer withdrawal surge) | Semi-annual | Float adequacy, settlement timing, funding sources |
| Technology infrastructure failure (GCP) | Annual | Disaster recovery, failover capability, data integrity |
| Combined scenario (multiple risks materialising simultaneously) | Annual | Organisational resilience, crisis management capability |

### 13.2 Stress Testing Governance

- Stress test scenarios shall be approved by the Risk Committee.
- Results shall be reported to the Risk Committee and Board, with recommended actions to address identified vulnerabilities.
- Stress testing assumptions and methodologies shall be reviewed annually for continued relevance.

---

## 14. Risk Culture

### 14.1 Risk Culture Objectives

MyMoolah is committed to fostering a risk-aware culture characterised by:

- Open and transparent communication about risks at all levels.
- Empowerment of all personnel to identify, escalate, and manage risks.
- Accountability for risk management outcomes at every level.
- Integration of risk considerations into all business decisions and strategic planning.
- Avoidance of a blame culture that discourages risk reporting.
- Continuous learning from risk events, near-misses, and industry incidents.

### 14.2 Risk Culture Initiatives

- Mandatory risk awareness training for all personnel (integrated with the Compliance Training Programme).
- Risk management objectives embedded in performance evaluations for all management-level personnel.
- Regular risk culture assessments (annual employee survey) to measure awareness, attitudes, and behaviours.
- Recognition of proactive risk identification and escalation.

---

## 15. Integration with Business Planning

- Risk assessments shall be conducted as part of all strategic planning, new product development, and material business change initiatives.
- New product and service proposals shall include a formal risk assessment approved by the CRO before Board approval.
- Annual business planning shall incorporate the enterprise risk profile and risk appetite statement.
- Capital and resource allocation decisions shall consider risk-adjusted returns and risk concentrations.

---

## 16. Roles & Responsibilities Summary

| Role | Primary ERM Responsibility |
|---|---|
| **Board of Directors** | Approve the ERM Framework and risk appetite; exercise ultimate risk oversight; ensure adequate risk management resources. |
| **Risk Committee** | Oversee ERM implementation; monitor the risk register and KRIs; review stress testing; evaluate emerging risks; report to the Board. |
| **Audit Committee** | Oversee the three lines of defence; evaluate internal audit effectiveness; monitor risk-related remediation. |
| **Chief Risk Officer** | Lead the ERM function; maintain the risk register; coordinate risk assessments; monitor KRIs; report to the Risk Committee and Board. |
| **Chief Compliance Officer** | Manage compliance and regulatory risk; ensure regulatory compliance; coordinate with the CRO on compliance risk matters. |
| **Business Unit Heads** | Own and manage first-line risks; implement controls; escalate risk events; maintain operational risk registers. |
| **All Personnel** | Identify and report risks; comply with risk policies; participate in risk training; escalate concerns. |

---

## 17. Monitoring & Review

- This framework shall be reviewed annually, or upon material changes to MyMoolah's risk profile, business model, regulatory environment, or governance structure.
- The Risk Committee shall evaluate the effectiveness of the ERM framework annually and recommend improvements to the Board.
- Material amendments to the framework shall require Board approval.
- The framework shall be aligned with updates to ISO 31000, King IV guidance, and Basel Committee publications.

---

## 18. Regulatory References

| Reference | Description |
|---|---|
| King IV Code (2016) | Principle 11: Risk Governance |
| King IV Code (2016) | Principle 15: Combined Assurance |
| ISO 31000:2018 | Risk Management — Guidelines |
| Basel Committee (2011) | Principles for the Sound Management of Operational Risk |
| Basel Committee (2005) | Compliance and the Compliance Function in Banks |
| Banks Act 94 of 1990 | Regulation of banking institutions in South Africa |
| Financial Sector Regulation Act 9 of 2017 | Twin peaks regulatory framework |
| FICA (Act 38 of 2001) | AML/CFT risk management obligations |
| POPIA (Act 4 of 2013) | Data protection risk management |
| SARB Directive D3/2018 | Outsourcing risk management |
| NPS Act 78 of 1998 | National Payment System risk management |
| COSO ERM Framework (2017) | Enterprise Risk Management — Integrating with Strategy and Performance |

---

## 19. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Chief Risk Officer | Initial framework creation |

---

*This policy is the property of MyMoolah (Pty) Ltd and is classified as Confidential. Unauthorised reproduction or distribution is prohibited.*
