# Fraud Prevention & Detection Policy

| Field              | Value                                         |
|--------------------|-----------------------------------------------|
| **Policy Title**   | Fraud Prevention & Detection Policy           |
| **Version**        | 1.0                                           |
| **Effective Date** | March 2026                                    |
| **Next Review**    | March 2027                                    |
| **Classification** | Confidential                                  |
| **Owner**          | Chief Compliance Officer                      |
| **Approved By**    | Board of Directors, MyMoolah (Pty) Ltd        |

---

## 1. Purpose

This policy establishes the framework for preventing, detecting, and responding to fraud across all products and channels operated by MyMoolah (Pty) Ltd. It defines the preventive controls, detection mechanisms, response procedures, and governance structures required to protect MyMoolah's customers, assets, and reputation in accordance with the Financial Intelligence Centre Act 38 of 2001 (FICA), the Prevention of Organised Crime Act 121 of 1998 (POCA), the Prevention and Combating of Corrupt Activities Act 12 of 2004 (PRECCA), and the Electronic Communications and Transactions Act 25 of 2002 (ECTA).

## 2. Scope

This policy applies to all fraud risks arising from the operation of the MyMoolah platform, including:

- Digital wallet account registration, verification, and management
- Peer-to-peer transfers and merchant payments
- Value-Added Services (VAS): airtime, data, electricity, and bill payments
- PayShap Real-Time Payments (RTP) via Standard Bank South Africa
- USDC stablecoin cross-border remittances
- NFC-initiated cash deposits
- Referral programme and promotional reward systems
- Internal operations, including employee and contractor access

This policy applies to all employees, contractors, third-party service providers, and automated systems of MyMoolah (Pty) Ltd.

## 3. Definitions

| Term | Definition |
|------|------------|
| **Account Takeover (ATO)** | Unauthorised access to a customer account through credential theft, SIM swap, or session hijacking |
| **Bot Scoring** | Automated assessment of whether a request originates from an automated script rather than a human user |
| **Device Fingerprinting** | Collection of device attributes (OS, browser, screen resolution, installed fonts) to uniquely identify a device |
| **Friendly Fraud** | A legitimate account holder disputes a genuine transaction to obtain a refund while retaining goods or services |
| **PoW CAPTCHA** | Proof-of-Work CAPTCHA — a computational challenge requiring the client to perform work before submission, deterring automated attacks |
| **SIM Swap** | A social engineering attack where a fraudster convinces a mobile network operator to transfer a victim's phone number to a new SIM card |
| **Velocity Check** | Automated control measuring the frequency or volume of an action within a defined time window |
| **Voucher Abuse** | Exploitation of promotional voucher or coupon systems through duplication, manipulation, or synthetic account creation |

## 4. Fraud Risk Assessment

### 4.1 Risk Assessment Framework

MyMoolah conducts a comprehensive fraud risk assessment at least annually, and upon the introduction of new products, channels, or material changes to existing services. The assessment follows a risk-based approach aligned with FATF guidance and evaluates:

- **Inherent risk**: The fraud exposure of each product and channel before controls
- **Control effectiveness**: The adequacy and reliability of preventive and detective controls
- **Residual risk**: The remaining fraud exposure after controls are applied
- **Emerging threats**: New fraud typologies identified through industry intelligence, law enforcement advisories, and incident analysis

### 4.2 Risk Rating

Each product and channel is assigned a fraud risk rating (Low, Medium, High, Critical) that determines the intensity of monitoring and the frequency of control review.

| Product/Channel | Inherent Risk | Key Threats |
|----------------|---------------|-------------|
| Digital wallet P2P transfers | High | Account takeover, social engineering, money mule networks |
| VAS purchases | Medium | Airtime as value transfer, voucher abuse, bulk automated purchases |
| PayShap RTP | High | Authorised push payment fraud, request fraud, impersonation |
| USDC cross-border | Critical | Sanctions evasion, layering, jurisdiction arbitrage |
| NFC deposits | Medium | Stolen card usage, counterfeit NFC devices |
| Referral programme | Medium | Synthetic accounts, referral farming, velocity abuse |
| Customer registration | High | Synthetic identity fraud, stolen identity documents |

## 5. Prevention Controls

### 5.1 Identity Verification and KYC

- **FICA-compliant KYC**: All customers undergo identity verification before accessing transaction services, tiered by risk and transaction limits in accordance with FICA and the FIC's Guidance Notes.
- **Document verification**: Identity documents are verified against the Department of Home Affairs database where available, supplemented by liveness detection.
- **Enhanced Due Diligence (EDD)**: Customers classified as high-risk (PEPs, high-value transactors, adverse media matches) undergo additional verification including source-of-funds documentation.

### 5.2 Authentication and Session Security

- **JWT HS512 authentication**: All API sessions are authenticated using JSON Web Tokens signed with HMAC-SHA512. Tokens carry short expiry periods and are validated on every request by the `config/security.js` middleware.
- **Two-Factor Authentication (2FA)**: OTP-based second factor is required for high-risk operations including fund transfers above configurable thresholds, password changes, and linked device management.
- **Session management**: Concurrent session limits are enforced. Session tokens are invalidated on password change, device change, or suspicious activity detection.
- **AES-256-GCM encryption**: All sensitive data at rest (personal information, financial credentials) is encrypted using AES-256 in Galois/Counter Mode as implemented in the `models/User.js` encryption layer.

### 5.3 Device and Network Controls

- **Device fingerprinting**: Device attributes are captured at registration and login. Transactions from unrecognised devices trigger step-up authentication.
- **Bot scoring**: The `middleware/botScoring.js` module evaluates incoming requests for indicators of automated or scripted behaviour, assigning a risk score that gates access to sensitive endpoints.
- **PoW CAPTCHA**: Registration, login, and high-risk transaction endpoints are protected by Proof-of-Work CAPTCHA challenges that impose computational cost on automated attacks, making large-scale bot operations economically unviable.
- **Distributed rate limiting**: Redis-backed per-user and per-IP rate limiting (`middleware/rateLimiter.js`) prevents brute-force, credential stuffing, and enumeration attacks. Rate limit configurations are tiered by endpoint sensitivity.
- **Geolocation validation**: Transaction requests are evaluated against the customer's known location profile. Transactions from jurisdictions inconsistent with the customer's profile trigger enhanced review.

### 5.4 Referral Fraud Prevention

MyMoolah operates a 5-tier referral reward system with the following anti-fraud controls:

- **Velocity checks**: Maximum number of referral claims per user per time period, enforced via Redis counters with TTL expiry.
- **Device linkage**: Referred accounts are checked for device fingerprint overlap with the referrer to detect self-referral.
- **Activation requirements**: Referral rewards are disbursed only after the referred user completes KYC verification and executes a qualifying transaction, preventing synthetic account farming.
- **Tier progression validation**: Tier advancement requires genuine transaction activity over defined time periods; rapid tier progression triggers review.
- **Clawback mechanism**: Referral rewards are subject to clawback if the referred account is subsequently identified as fraudulent or inactive within 90 days.

## 6. Detection Methods

### 6.1 Anomaly Detection

- **Behavioural baselines**: The system establishes per-user transaction baselines (typical amounts, frequencies, counterparties, times of day). Deviations exceeding configurable standard-deviation thresholds generate alerts.
- **Peer-group comparison**: Individual behaviour is compared against cohort norms segmented by KYC tier, account age, and geographic region.
- **Cross-channel correlation**: Activity across wallet, VAS, PayShap, and USDC channels is correlated to identify patterns invisible within a single channel.

### 6.2 Velocity and Threshold Checks

- **Transaction velocity**: Maximum number of transactions per user within rolling time windows (hourly, daily, weekly), enforced at the API layer via Redis.
- **Amount velocity**: Cumulative transaction value per user within rolling time windows.
- **Counterparty velocity**: Number of distinct counterparties per user within a time window; rapid counterparty diversification triggers review.
- **Failed transaction velocity**: High rates of failed or declined transactions may indicate credential testing or system probing.

### 6.3 Geolocation and Device Intelligence

- **IP geolocation**: Transaction origin is resolved to country and region. Transactions from sanctioned jurisdictions, or jurisdictions inconsistent with the user profile, are flagged.
- **Device change detection**: Login or transaction from a previously unseen device triggers step-up authentication and generates an alert if combined with other risk indicators.
- **Impossible travel**: Sequential transactions from geographically distant locations within an implausible timeframe are flagged as potential account compromise.

## 7. Fraud Typologies — Digital Wallet Specific

### 7.1 Account Takeover (ATO)

**Description**: Attacker gains control of a legitimate account through credential theft (phishing, data breach), SIM swap, or session hijacking.

**Detection indicators**: Login from new device or location, password reset followed by immediate fund transfer, SIM change preceding OTP-authenticated transaction, session anomalies.

**Controls**: 2FA, device fingerprinting, session management, SIM change cooling-off period, impossible travel detection.

### 7.2 SIM Swap Fraud

**Description**: Attacker social-engineers the mobile network operator to port the victim's number, intercepting OTP messages to authorise fraudulent transactions.

**Detection indicators**: SIM change event (where network integration permits detection), OTP-authenticated transaction from a new device within 24 hours of SIM change, customer complaint of service disruption.

**Controls**: SIM change cooling-off period (configurable; default 48 hours during which high-risk transactions are blocked or subject to enhanced authentication), alternative authentication channels, customer notification on SIM change detection.

### 7.3 Social Engineering

**Description**: Attacker manipulates the customer into authorising a payment or disclosing credentials, often impersonating MyMoolah support, law enforcement, or a known contact.

**Detection indicators**: Unusual transaction patterns following customer support contact, PayShap RTP to a new counterparty with urgency indicators, customer reports of unsolicited contact.

**Controls**: Customer education, support staff training, transaction confirmation for unusual patterns, payment delay for first-time high-value counterparties.

### 7.4 Friendly Fraud

**Description**: Legitimate account holder disputes a genuine transaction, claiming it was unauthorised, to obtain a refund while retaining the purchased service.

**Detection indicators**: Dispute history, transaction authenticated with customer's device and credentials, pattern of disputes across multiple transactions.

**Controls**: Transaction authentication evidence retention, dispute investigation procedures, progressive penalties for repeat offenders, device and session evidence correlation.

### 7.5 Voucher and Promotional Abuse

**Description**: Exploitation of promotional offers through duplicate claims, code manipulation, synthetic account creation, or collusion.

**Detection indicators**: Multiple redemptions from same device or IP, rapid account creation followed by immediate promotional claim, referral chains with no genuine activity.

**Controls**: Unique code enforcement, device-linked redemption limits, activation requirements before reward disbursement, referral fraud prevention controls (Section 5.4).

### 7.6 Referral Farming

**Description**: Creation of multiple synthetic accounts to claim referral rewards, often using stolen or fabricated identity documents.

**Detection indicators**: Multiple accounts sharing device fingerprints, IPs, or contact information; accounts that complete minimum KYC but never transact beyond the qualifying threshold; rapid referral chain growth from a single source.

**Controls**: 5-tier referral system with velocity checks, device linkage analysis, activation and transaction requirements, 90-day clawback window.

## 8. Response Procedures

### 8.1 Incident Classification

| Severity | Definition | Response SLA |
|----------|------------|--------------|
| **Critical** | Active ongoing fraud; large-value loss imminent; multiple accounts compromised | Immediate — within 30 minutes |
| **High** | Confirmed fraud with material loss; account takeover confirmed | Within 2 hours |
| **Medium** | Suspected fraud under investigation; single account; limited exposure | Within 24 hours |
| **Low** | Anomaly identified; no confirmed loss; monitoring escalation | Within 72 hours |

### 8.2 Immediate Response Actions

Upon identification of confirmed or suspected fraud:

1. **Account restriction**: The affected account is placed in a restricted state preventing outbound transfers while permitting the customer to view balances and transaction history. Restriction is applied via the account status field in the PostgreSQL `users` table.
2. **Transaction blocking**: Pending transactions associated with the suspected fraud are held or reversed where technically and legally permissible.
3. **Evidence preservation**: All relevant transaction records, session logs, device fingerprints, IP addresses, and communication records are preserved in their original form. Logs are immutable once written.
4. **Customer notification**: The affected customer is notified of the restriction and provided with instructions for identity re-verification, in compliance with POPIA notification requirements.

### 8.3 Investigation

1. Full transaction history and session audit trail retrieval from the PostgreSQL ledger and application logs.
2. Device and network forensic analysis.
3. Cross-referencing with known fraud indicators and industry databases.
4. Customer interview where applicable.
5. Determination: confirmed fraud, unconfirmed (insufficient evidence), or false alarm.
6. Documentation of all findings, evidence, and decisions.

### 8.4 Law Enforcement and Regulatory Reporting

- **SAPS reporting**: Confirmed fraud resulting in material loss is reported to the South African Police Service with a case number obtained.
- **FIC reporting**: Where fraud involves proceeds of crime, money laundering, or terrorist financing, an STR is filed with the FIC via goAML in accordance with the Transaction Monitoring Policy (Policy 04).
- **SABRIC notification**: Relevant fraud incidents are reported to the South African Banking Risk Information Centre for industry intelligence sharing.
- **POPIA breach notification**: Where fraud involves a data breach affecting personal information, the Information Regulator is notified within 72 hours as required by POPIA S22.

### 8.5 Recovery Procedures

- Tracing and recovery of funds through the banking system where feasible.
- Account restoration after successful identity re-verification.
- Customer remediation in accordance with the fair treatment of customers principles.
- Insurance claim initiation where applicable.

## 9. Fraud Awareness and Training

### 9.1 Employee Training

All employees and contractors receive fraud awareness training covering:

- Common fraud typologies and recognition indicators
- Escalation procedures and reporting obligations
- Social engineering resistance (phishing, vishing, impersonation)
- Data handling and evidence preservation
- Annual refresher training, with immediate training upon material policy changes

### 9.2 Customer Education

- In-app fraud awareness notifications and security tips
- Guidance on protecting credentials and recognising phishing attempts
- Clear communication that MyMoolah will never request passwords, PINs, or OTPs via phone, SMS, or email
- Reporting channels for suspected fraud

## 10. Fraud Metrics and Key Performance Indicators

| Metric | Target | Review Frequency |
|--------|--------|-----------------|
| Gross fraud loss rate (% of transaction value) | < 0.05% | Monthly |
| Net fraud loss rate (after recovery) | < 0.03% | Monthly |
| Fraud detection rate | > 85% of confirmed cases detected by automated systems | Monthly |
| Mean time to detect (MTD) | < 4 hours for High/Critical | Monthly |
| Mean time to respond (MTR) | Within SLA per severity | Monthly |
| False positive rate | < 60% for High alerts | Quarterly |
| Account takeover prevention rate | > 95% | Monthly |
| Referral fraud prevention rate | > 90% of synthetic accounts blocked at registration | Monthly |
| Customer fraud complaint resolution time | < 5 business days | Monthly |

## 11. Insurance and Loss Provisions

- MyMoolah maintains professional indemnity and crime insurance covering fraud losses.
- Loss provisions are reviewed quarterly based on historical loss data and projected fraud trends.
- The Board is informed of material fraud losses through the Risk Committee.

## 12. Roles and Responsibilities

| Role | Responsibility |
|------|---------------|
| **Chief Compliance Officer** | Policy ownership; fraud strategy; regulatory reporting oversight |
| **Head of Risk** | Fraud risk assessment; control design; loss analysis |
| **Fraud Operations Team** | Alert investigation; incident response; evidence collection |
| **Engineering Team** | Bot scoring, rate limiting, device fingerprinting, and encryption implementation; system integrity |
| **Customer Support** | First-line fraud reporting intake; customer communication; account restriction execution |
| **Internal Audit** | Independent review of fraud controls and incident handling |
| **Board Risk Committee** | Oversight of fraud programme; approval of risk appetite and loss thresholds |

## 13. Monitoring and Review

- This policy is reviewed annually, or upon the occurrence of a material fraud event, regulatory change, or introduction of new products.
- Fraud metrics are reported to the Board Risk Committee quarterly.
- The fraud risk assessment is refreshed annually.
- Control effectiveness is tested through periodic red-team exercises and penetration testing.

## 14. Regulatory References

| Reference | Description |
|-----------|-------------|
| FICA 38 of 2001 | Customer due diligence; reporting obligations |
| POCA 121 of 1998 | Prevention of Organised Crime; proceeds of crime |
| PRECCA 12 of 2004 | Duty to report corrupt activities |
| POPIA 4 of 2013 | Data breach notification (S22); lawful processing of personal information |
| ECTA 25 of 2002 | Electronic communications and transactions; cyber offences |
| NPS Act 78 of 1998 | National Payment System regulation |
| FATF Recommendations | Risk-based approach; customer due diligence; new technologies |
| Basel Committee | Operational risk management; fraud risk in banking |
| ISO 27001 | Information security management — access control, incident management |
| Mojaloop FSPIOP | Interoperability protocol security requirements |
| PCI DSS | Payment card data security (where applicable to NFC) |

## 15. Document Control

| Version | Date | Author | Change Description |
|---------|------|--------|--------------------|
| 1.0 | March 2026 | Chief Compliance Officer | Initial policy creation |

---

*This document is classified as Confidential and is the property of MyMoolah (Pty) Ltd. Unauthorised reproduction or distribution is prohibited.*
