# MyMoolah Treasury Platform - Terms and Conditions

**Last Updated**: 20 April 2026  
**Version**: 2.4.1 — Cash Withdrawal Ring-Fencing of Own Funds + Velocity Caps  
**Effective Date**: 20 April 2026

---

## 📋 **EXECUTIVE SUMMARY**

This Terms and Conditions document governs the use of the MyMoolah Treasury Platform by all user types:
- **Wallet Users**: Individuals using personal financial services
- **Suppliers**: VAS providers with pre-funded float accounts
- **Merchants**: MMVoucher vendors with pre-funded float accounts
- **Clients**: B2B companies integrating with the platform

---

## 1. **INTRODUCTION AND ACCEPTANCE**

### 1.1 **Agreement to Terms**
By accessing, registering, or using the MyMoolah Treasury Platform ("Platform"), you agree to be bound by these Terms and Conditions ("Terms"). These Terms constitute a legally binding agreement between you and MyMoolah Treasury Platform ("MyMoolah", "we", "us", or "our").

### 1.2 **Acceptance of Terms**
- **Explicit Acceptance**: You must explicitly accept these Terms during registration
- **User Type Specific**: You accept only the sections relevant to your user type
- **Version Tracking**: We track the version of Terms you have accepted
- **Ongoing Acceptance**: Continued use constitutes ongoing acceptance

### 1.3 **Changes to Terms**
- **Notification**: We will notify you of material changes to these Terms
- **Acceptance Required**: You must accept updated Terms to continue using the Platform
- **Effective Date**: Changes become effective 30 days after notification

---

## 2. **DEFINITIONS**

### 2.1 **User Types**
- **Wallet Users**: Individuals who use the Platform for personal financial services
- **Suppliers**: Entities that supply VAS products and services to the Platform
- **Merchants**: Entities that create, sell, and redeem MMVouchers
- **Clients**: B2B companies that integrate with the Platform to offer services to their customers

### 2.2 **Platform Terms**
- **Platform**: The MyMoolah Treasury Platform and all associated services
- **VAS**: Value Added Services including airtime, data, utilities, and other digital services
- **MMVouchers**: Digital vouchers created and managed through the Platform
- **Float Account**: Pre-funded account for suppliers and merchants
- **KYC**: Know Your Customer verification process

---

## 3. **GENERAL PROVISIONS**

### 3.1 **Eligibility**
- **Age Requirement**: You must be at least 18 years old
- **Legal Capacity**: You must have legal capacity to enter into agreements
- **Residency**: Services are primarily available to South African residents
- **Compliance**: You must comply with all applicable laws and regulations

### 3.2 **Account Registration**
- **Accurate Information**: You must provide accurate and complete information
- **Verification**: You must complete required verification processes
- **Account Security**: You are responsible for maintaining account security
- **Account Updates**: You must keep account information current

### 3.3 **Platform Access**
- **Authorized Use**: You may only use the Platform for authorized purposes
- **Prohibited Activities**: You may not engage in prohibited activities
- **Service Availability**: Platform availability is subject to maintenance and updates
- **Access Termination**: We may terminate access for violations

---

## 4. **WALLET USERS TERMS**

### 4.1 **Wallet Account Creation**
- **Registration Requirements**: Valid identification, KYC verification, mobile number, email
- **Account Verification**: Identity verification, address verification, mobile verification
- **Security Requirements**: Strong passwords, device security, transaction authorization

### 4.2 **Wallet Services**
- **Wallet Functionality**: Balance management, transaction processing, transaction history
- **Transaction Limits**: Daily, monthly, and single transaction limits
- **VAS Services**: Airtime, data, utilities, international services (coming soon)

### 4.3 **Wallet User Obligations**
- **Security Responsibilities**: Password security, device security, fraud prevention
- **Compliance Requirements**: Legal compliance, tax obligations, regulatory compliance
- **Fees and Charges**: Account maintenance, transaction fees, service fees

### 4.4 **Cash Withdrawals and Ring-Fencing of Own Funds**

This clause governs cash withdrawals through any Cash-Withdrawal Partner integrated with the Platform. Current and contemplated Cash-Withdrawal Partners include eeziCash (Flash Group), EasyPay retail cash-withdrawal, Cliquefin / OTT cash-withdrawal references, USSD cash-withdrawal initiated through any such partner network, and any successor or replacement cash-withdrawal rail. This clause implements the MyMoolah Cash Withdrawal & Ring-Fencing of Own Funds Policy (POL-020), available on request.

- **4.4.1 Two categories of wallet funds.** Every amount credited to your wallet is classified at the moment of credit as either:
  - **Own Funds** — funds credited from a source where the remitting account holder is the same natural person as you, the FICA-verified wallet holder. This includes transfers from your own bank account, self-initiated PayShap credits into your wallet, NFC self-loads, and voucher-based cash-in (for example 1Voucher, FNB Voucher, Flash Pay); or
  - **Third-Party Funds** — funds credited from a distinct person or entity, for example a salary from your employer, a disbursement from a corporate client, a loan disbursement, or a peer-to-peer transfer from another wallet holder.
- **4.4.2 Ring-fence rule (no cash withdrawal of Own Funds).** Your **Own Funds are ring-fenced and may not be withdrawn as physical cash** through any rail, at any time. This restriction is absolute and cannot be overridden by support staff, management, or engineering.
- **4.4.3 Cash withdrawal of Third-Party Funds.** Your Third-Party Funds may be used to fund a cash withdrawal (subject to your KYC tier limits, FICA controls, and the fees applicable to the selected rail).
- **4.4.4 Permitted uses of Own Funds.** Your Own Funds remain fully usable for every non-cash purpose supported by the Platform, including wallet-to-wallet transfers, PayShap, EFT, bill payments, prepaid airtime, data, electricity, QR merchant payments, NFC spend, and digital vouchers that are not cash-equivalent.
- **4.4.5 Classification is automated.** Classification is performed automatically using a name-match between the remitter's name (as supplied by the sending bank or payment rail) and your FICA-verified wallet-holder name. Where the remitter's name is missing, malformed, or cannot be confidently matched, the deposit is treated, conservatively, as Own Funds.
- **4.4.6 No "Cash-Available" figure displayed.** The Platform does not display a separate cash-available figure. If you attempt a cash withdrawal that cannot be funded from your Third-Party Funds balance, the Platform will display a standardised notification explaining the restriction and pointing you to the permitted uses of your Own Funds.
- **4.4.7 Classification disputes.** If you believe a deposit has been mis-classified, you may raise a dispute through the in-app support channel. MyMoolah Compliance will resolve the dispute using the immutable classification audit record. Any re-classification requires four-eyes approval and will not retroactively release a cash withdrawal that has already been declined; you must initiate a new cash-withdrawal request after the dispute is resolved.
- **4.4.8 Maximum cash-withdrawal frequency (velocity caps).** In addition to your tier value limits, the number of cash withdrawals you may make in any given period is capped, to help protect you against fraud and to meet anti-money-laundering obligations. The caps apply across **all Cash-Withdrawal Partners combined**:
  - **Tier 1 (ID Verified):** up to **2** cash withdrawals per rolling 60 minutes, up to **3** per rolling 24 hours, and up to **15** per calendar month.
  - **Tier 2 (Fully Verified):** up to **3** cash withdrawals per rolling 60 minutes, up to **5** per rolling 24 hours, and up to **30** per calendar month.
  Attempts above these caps are declined with a standardised notification. Attempts that approach the daily cap may require one-time-password ("OTP") step-up authentication. Attempts that reach the daily cap may be held in a short pending-review state (up to two hours) while MyMoolah Compliance assesses the activity. These caps may be revised from time to time and are published in the MyMoolah Cash Withdrawal & Ring-Fencing of Own Funds Policy (POL-020).
- **4.4.9 Aggregate cash-withdrawal monitoring.** Cumulative cash-withdrawal activity across all Cash-Withdrawal Partners is monitored in accordance with the Financial Intelligence Centre Act 38 of 2001. Where cumulative cash-withdrawal amounts reach statutory thresholds, MyMoolah will file the reports required by law (including Cash Threshold Reports and, where applicable, Suspicious Transaction Reports) and may temporarily restrict further cash withdrawals for the remainder of the applicable day while the matter is assessed.
- **4.4.10 Legal basis.** This clause exists to ensure MyMoolah does not, in form or in substance, conduct the "business of a bank" under section 1 read with section 11 of the Banks Act 94 of 1990, and to keep the Platform aligned with the SARB Position Paper on Electronic Money (NPS 01/2020), the National Payment System Act 78 of 1998, and the FICA compliance framework.

By using the Platform you acknowledge and accept the Own Funds / Third-Party Funds distinction and the automated classification mechanism described above. The full policy is set out in `docs/policies/20-Cash-Withdrawal-Policy.md`.

---

## 5. **SUPPLIERS TERMS**

### 5.1 **Supplier Registration and Onboarding**
- **Qualification Requirements**: Business registration, financial stability, service capability
- **Onboarding Process**: Application review, due diligence, contract negotiation, integration

### 5.2 **Pre-funded Float Accounts**
- **Float Account Requirements**: Minimum balance, funding procedures, balance monitoring
- **Float Management**: Balance alerts, auto-replenishment, manual funding, reporting

### 5.3 **Product and Service Supply**
- **Service Commitments**: Service availability, response times, quality standards
- **Product Management**: Product catalog, pricing updates, inventory management

### 5.4 **Settlement and Reconciliation**
- **Settlement Procedures**: Settlement schedule, methods, timing, reporting
- **Reconciliation Requirements**: Daily reconciliation, dispute resolution, audit support

### 5.5 **Supplier Obligations**
- **Service Level Commitments**: Uptime requirements, response times, quality standards
- **Compliance Requirements**: Regulatory compliance, reporting obligations, audit cooperation

---

## 6. **MERCHANTS TERMS**

### 6.1 **Merchant Registration and Onboarding**
- **Qualification Requirements**: Business registration, financial stability, service capability
- **Onboarding Process**: Application review, due diligence, contract negotiation, integration

### 6.2 **Pre-funded Float Accounts**
- **Float Account Requirements**: Minimum balance, funding procedures, balance monitoring
- **Float Management**: Balance alerts, auto-replenishment, manual funding, reporting

### 6.3 **MMVoucher Services**
- **Voucher Creation**: Voucher types, creation limits, validation rules, security features
- **Voucher Management**: Inventory management, expiration management, redemption tracking

### 6.4 **Settlement and Reconciliation**
- **Settlement Procedures**: Settlement schedule, methods, timing, reporting
- **Reconciliation Requirements**: Daily reconciliation, dispute resolution, audit support

### 6.5 **Merchant Obligations**
- **Service Commitments**: Service availability, response times, quality standards
- **Compliance Requirements**: Regulatory compliance, reporting obligations, audit cooperation

---

## 7. **CLIENTS TERMS**

### 7.1 **Client Registration and Integration**
- **Qualification Requirements**: Business registration, technical capability, financial stability
- **Integration Process**: Technical assessment, integration planning, development support

### 7.2 **B2B Integration Services**
- **API Services**: Secure API access, documentation, technical support, updates
- **Integration Support**: Development support, testing support, deployment support

### 7.3 **Customer Management**
- **Customer Onboarding**: Customer registration, KYC integration, account management
- **Customer Support**: Support responsibilities, escalation procedures, issue resolution

### 7.4 **Revenue Sharing and Settlement**
- **Revenue Sharing Models**: Commission structure, performance bonuses, volume discounts
- **Settlement Procedures**: Settlement schedule, methods, timing, reporting

### 7.5 **Client Obligations**
- **Integration Commitments**: Service integration, performance standards, quality assurance
- **Compliance Requirements**: Regulatory compliance, reporting obligations, audit cooperation

---

## 8. **CROSS-PLATFORM RELATIONSHIPS**

### 8.1 **User Type Interactions**
- **Transaction Flows**: Direct transactions between user types
- **Service Dependencies**: Service integration, data sharing, quality dependencies

### 8.2 **Platform Governance**
- **Platform Rules**: Service standards, quality requirements, performance metrics
- **Dispute Resolution**: Dispute procedures, escalation process, mediation services

### 8.3 **Service Integration**
- **Technical Integration**: API integration, data exchange, service coordination
- **Business Integration**: Revenue sharing, service provision, customer management

---

## 9. **FINANCIAL AND REGULATORY PROVISIONS**

### 9.1 **Financial Terms**
- **Transaction Processing**: Processing times, settlement timing, currency handling
- **Financial Reporting**: Transaction reporting, financial statements, audit support

### 9.2 **Regulatory Compliance**
- **South African Regulations**: Financial services, consumer protection, data protection
- **International Compliance**: Cross-border services, international standards, foreign exchange

### 9.3 **Risk Management**
- **Risk Disclosures**: Service risks, financial risks, security risks, regulatory risks
- **Risk Mitigation**: Security measures, insurance coverage, fraud prevention

---

## 10. **SECURITY AND PRIVACY**

### 10.1 **Security Measures**
- **Platform Security**: TLS 1.3 encryption, data protection, access control
- **User Security**: Account security, password policies, device security

### 10.2 **Privacy Protection**
- **Data Collection**: Personal data, business data, transaction data, analytics data
- **Data Protection**: Data security, retention policies, sharing policies, user rights

### 10.3 **Breach Procedures**
- **Breach Notification**: Notification requirements, timing, methods, regulatory reporting
- **Breach Response**: Response procedures, investigation process, remediation actions

---

## 11. **LIMITATIONS AND DISCLAIMERS**

### 11.1 **Service Limitations**
- **Availability Limitations**: Service availability, maintenance windows, force majeure
- **Functionality Limitations**: Feature availability, service scope, geographic limitations

### 11.2 **Liability Limitations**
- **Platform Liability**: Liability limits, excluded damages, indirect damages
- **User Liability**: User responsibilities, indemnification, breach consequences

### 11.3 **Disclaimers**
- **Service Disclaimers**: Service quality, third-party services, external factors
- **Legal Disclaimers**: Legal advice, regulatory changes, market conditions

---

## 12. **DISPUTE RESOLUTION**

### 12.1 **Dispute Procedures**
- **Initial Resolution**: Direct communication, escalation process, documentation
- **Formal Resolution**: Mediation, arbitration, expert determination, court proceedings

### 12.2 **Dispute Categories**
- **Service Disputes**: Service quality, availability, performance, delivery
- **Financial Disputes**: Transaction disputes, settlement disputes, fee disputes

### 12.3 **Resolution Timeline**
- **Initial Response**: Response time, investigation period, resolution timeline
- **Final Resolution**: Resolution methods, appeal process, final decision

---

## 13. **GOVERNING LAW AND JURISDICTION**

### 13.1 **Applicable Law**
- **Primary Jurisdiction**: South African law, South African courts, venue, enforcement
- **International Considerations**: Cross-border services, international law, foreign courts

### 13.2 **Legal Proceedings**
- **Court Proceedings**: Court selection, procedural requirements, evidence requirements
- **Enforcement**: Decision enforcement, compliance requirements, penalty enforcement

---

## 14. **CONTACT INFORMATION**

### 14.1 **General Contact**
- **Platform Support**: support@mymoolah.com, tech@mymoolah.com
- **Business Contact**: business@mymoolah.com, partnerships@mymoolah.com

### 14.2 **Specialized Support**
- **Legal and Compliance**: legal@mymoolah.com, compliance@mymoolah.com
- **Security and Technical**: security@mymoolah.com, technical@mymoolah.com

### 14.3 **Emergency Contact**
- **Security Incidents**: incidents@mymoolah.com, fraud@mymoolah.com
- **Regulatory Contact**: regulatory@mymoolah.com, audit@mymoolah.com

---

## 📋 **ACCEPTANCE AND VERSION TRACKING**

### **Version History**
- **Version 2.4.0**: 20 April 2026 — Cash Withdrawal Ring-Fencing of Own Funds (new §4.4; operationalises POL-020)
- **Version 2.4.1**: 20 April 2026 — Added §4.4.8 velocity caps (count per 60 min / 24 h / month by tier), §4.4.9 aggregate monitoring / FICA reporting language; renumbered prior §4.4.8 (legal basis) to §4.4.10
- **Version 2.3.0**: August 30, 2025 - TLS 1.3 & Banking-Grade Security
- **Version 2.2.0**: August 30, 2025 - International Services UI
- **Version 2.1.0**: August 29, 2025 - Product Catalog Enhancements
- **Version 2.0.0**: August 28, 2025 - Flash Commercial Terms
- **Version 1.0.0**: August 18, 2025 - Initial Release

### **User Type-Specific Acceptance**
```javascript
const userTypeAcceptance = {
  walletUser: {
    accepted: false,
    version: '2.4.0',
    dateAccepted: null,
    sections: ['general', 'wallet', 'cash-withdrawal-ringfence', 'vas', 'security', 'privacy']
  },
  supplier: {
    accepted: false,
    version: '2.4.0',
    dateAccepted: null,
    sections: ['general', 'supplier', 'financial', 'regulatory', 'security']
  },
  merchant: {
    accepted: false,
    version: '2.4.0',
    dateAccepted: null,
    sections: ['general', 'merchant', 'financial', 'regulatory', 'security']
  },
  client: {
    accepted: false,
    version: '2.4.0',
    dateAccepted: null,
    sections: ['general', 'client', 'integration', 'financial', 'regulatory']
  }
};
```

### **Acceptance Confirmation**
By accepting these Terms and Conditions, you confirm that:
- You have read and understood all relevant sections
- You agree to be bound by these Terms
- You accept the version and date of acceptance
- You understand your rights and obligations
- You agree to comply with all applicable laws and regulations

---

**🎯 Status: COMPREHENSIVE TERMS AND CONDITIONS - READY FOR LEGAL REVIEW** 🎯

**Next Step: Legal team review and approval**
