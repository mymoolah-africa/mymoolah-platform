# Data Retention & Records Management Policy

| Field | Detail |
|---|---|
| **Policy Title** | Data Retention & Records Management Policy |
| **Version** | 1.0 |
| **Effective Date** | March 2026 |
| **Next Review** | March 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Compliance Officer / Information Officer |
| **Approved By** | Board of Directors, MyMoolah (Pty) Ltd |

---

## 1. Purpose

This policy defines the retention periods, storage requirements, and disposal procedures for all categories of data and records held by MyMoolah (Pty) Ltd ("MyMoolah"). It ensures that records are retained for the minimum periods required by South African legislation and international standards, and that data is disposed of securely when retention obligations expire.

Proper records management is essential for regulatory compliance, legal defensibility, audit readiness, and the protection of data subject rights under the Protection of Personal Information Act 4 of 2013 ("POPIA").

## 2. Scope

This policy applies to:

- All data and records created, received, maintained, or transmitted by MyMoolah, whether in electronic or physical form.
- All storage systems: PostgreSQL databases (Google Cloud SQL), Google Cloud Storage (GCS) buckets, Redis caches, application logs, backup archives, and any physical records.
- All business functions: financial operations, KYC/compliance, customer support, technology, marketing, human resources, and corporate governance.
- All employees, contractors, and third-party operators who process or store data on behalf of MyMoolah.

## 3. Definitions

| Term | Definition |
|---|---|
| **Active Data** | Data that is regularly accessed and required for current business operations. Stored in primary production systems. |
| **Archived Data** | Data that is no longer required for active operations but must be retained for regulatory or legal purposes. Moved to cost-effective, access-controlled archive storage. |
| **Retention Period** | The minimum period for which a record must be maintained before it may be considered for disposal. |
| **Legal Hold** | A directive to preserve all forms of relevant data when litigation, regulatory investigation, or audit is reasonably anticipated or pending. |
| **Secure Destruction** | The irreversible removal of data such that it cannot be reconstructed or recovered by any means. |
| **Data Custodian** | The individual or team responsible for the operational management of a data system. |
| **Record** | Any information, regardless of form, that is created, received, or maintained as evidence of a business activity or transaction. |

## 4. Retention Schedule

The following retention periods are mandatory minimums. Data shall not be destroyed before the applicable period has elapsed unless required by a data subject deletion request that does not conflict with a regulatory obligation.

### 4.1 Financial Records

| Data Category | Examples | Retention Period | Legal Basis | Storage System |
|---|---|---|---|---|
| Transaction records | Wallet credits, debits, VAS purchases, PayShap transfers, USDC transactions | 5 years from date of transaction | FICA S22–25; Tax Administration Act S29 | PostgreSQL (Cloud SQL) |
| Journal entries (double-entry ledger) | Debit/credit entries, batch references | 5 years from date of entry | FICA S22–25; Companies Act S28 | PostgreSQL (Cloud SQL) |
| Reconciliation records | SBSA MT940/MT942 statements, internal reconciliation reports, float reconciliation | 5 years from date of reconciliation | FICA S22–25 | PostgreSQL + GCS |
| Settlement records | Inter-participant settlement, Mojaloop transfers | 5 years from settlement date | FICA S22–25 | PostgreSQL (Cloud SQL) |
| Suspicious transaction reports | STR/SAR submissions to FIC | 5 years from date of report | FICA S29 | Secure archive (GCS, encrypted) |

### 4.2 KYC and Identity Records

| Data Category | Examples | Retention Period | Legal Basis | Storage System |
|---|---|---|---|---|
| KYC documents | ID document images, selfie images, proof of address | 5 years after business relationship ends | FICA S22(2) | GCS (encrypted bucket) |
| Identity verification results | OCR outputs, liveness check results, verification status | 5 years after business relationship ends | FICA S22(2) | PostgreSQL (Cloud SQL) |
| Biometric data | Facial images used for liveness | 5 years after business relationship ends | FICA S22(2); POPIA S27 | GCS (encrypted bucket) |
| PEP/sanctions screening results | Screening logs and match outcomes | 5 years after business relationship ends | FICA S21C | PostgreSQL (Cloud SQL) |

### 4.3 Customer and Communication Records

| Data Category | Examples | Retention Period | Legal Basis | Storage System |
|---|---|---|---|---|
| Customer profile data | Name, contact details, preferences | Duration of relationship + 5 years | POPIA S14; FICA S22 | PostgreSQL (Cloud SQL) |
| Support conversations | Chat transcripts, email correspondence, support tickets | 3 years from date of last interaction | POPIA S14; ECT Act S16 | PostgreSQL (Cloud SQL) |
| Complaints and disputes | Formal complaints, dispute records, resolution outcomes | 5 years from resolution date | FICA; Consumer Protection Act S69 | PostgreSQL + GCS |
| Marketing consent records | Opt-in/opt-out timestamps, consent versions | Indefinite (while any related processing record exists) | POPIA S11(1)(a); ECT Act S45 | PostgreSQL (Cloud SQL) |
| OTP and authentication logs | OTP delivery timestamps, authentication attempts | 12 months | Operational security | PostgreSQL (Cloud SQL) |

### 4.4 Audit and Security Records

| Data Category | Examples | Retention Period | Legal Basis | Storage System |
|---|---|---|---|---|
| Application audit logs | User actions, API access, administrative operations | 7 years | ISO 27001 A.8.15; Companies Act S28 | PostgreSQL + GCS archive |
| Security event logs | Failed logins, rate limit triggers, fraud alerts | 7 years | ISO 27001 A.8.15 | PostgreSQL + GCS archive |
| Data breach records | Breach register entries, investigation reports, notifications | 7 years from date of breach | POPIA S22; ISO 27001 | Secure archive (GCS, encrypted) |
| Access control records | RBAC assignments, permission changes | 7 years | ISO 27001 A.5.18 | PostgreSQL (Cloud SQL) |
| Privacy impact assessments | PIA reports and remediation records | Lifetime of processing activity + 5 years | POPIA; ISO 27701 | GCS (encrypted) |

### 4.5 Corporate and Legal Records

| Data Category | Examples | Retention Period | Legal Basis | Storage System |
|---|---|---|---|---|
| Board minutes and resolutions | Meeting records, governance decisions | Indefinite | Companies Act S24 | GCS (encrypted) |
| Contracts and agreements | Third-party DPAs, operator agreements, banking agreements | Duration of agreement + 5 years | Prescription Act S11 | GCS (encrypted) |
| Employment records | Employee contracts, performance records | Duration of employment + 5 years | Basic Conditions of Employment Act | GCS (encrypted) |
| Tax records | VAT returns, income tax submissions, PAYE | 5 years from end of relevant tax year | Tax Administration Act S29 | GCS (encrypted) |

## 5. Storage Tiers and Lifecycle

### 5.1 Active Storage (Production)
- **PostgreSQL (Cloud SQL)**: Primary storage for transactional, customer, and audit data. Automated daily backups with 30-day backup retention. Point-in-time recovery enabled.
- **Redis Cache**: Ephemeral storage for session data, rate limiting counters, and temporary processing state. Maximum TTL of 24 hours for PII-adjacent data. No personal information cached beyond the active session, in compliance with POPIA.
- **Google Cloud Storage (Standard)**: KYC document images, reconciliation files (MT940/MT942), and active attachments.

### 5.2 Archive Storage
- **Google Cloud Storage (Nearline/Coldline)**: Data that has exceeded its active use period but remains within retention obligations. Lifecycle policies automatically transition objects from Standard to Nearline at 90 days and Coldline at 365 days where applicable.
- Archive data retains all encryption, access controls, and audit logging of active data.
- Retrieval from archive requires approval from the Data Custodian and is logged.

### 5.3 Backup Retention
- **Database Backups**: Automated daily backups retained for 30 days. Weekly backups retained for 90 days. Monthly backups retained for 1 year.
- **GCS Object Versioning**: Enabled on compliance-critical buckets. Versioned objects follow the same retention schedule as the primary object.
- Backups are encrypted at rest using Google-managed encryption keys or Customer-Managed Encryption Keys (CMEK) for regulated data.

## 6. Secure Destruction

### 6.1 Electronic Data
- **Database Records**: Irreversible deletion using SQL DELETE with confirmation and cascade verification. For sensitive records, cryptographic erasure (destruction of encryption keys rendering ciphertext irrecoverable) is the preferred method.
- **Cloud Storage Objects**: Deletion via GCS API with object versioning cleanup. Deletion is confirmed through audit log verification.
- **Redis Cache**: Automatic expiry via TTL. Manual FLUSHDB is prohibited without change management approval.
- **Backups**: Expired backups are automatically purged by Cloud SQL and GCS lifecycle policies. Manual backup destruction requires documented approval.
- **Logs**: Log entries beyond retention are purged by automated rotation and lifecycle policies.

### 6.2 Physical Media
- Physical documents containing personal information are destroyed by cross-cut shredding (DIN 66399 Security Level P-4 or higher).
- Certificates of destruction are obtained and retained for audit purposes.
- Electronic storage media (hard drives, USB devices) are destroyed in accordance with NIST SP 800-88 guidelines.

### 6.3 Destruction Register
All destruction events are recorded in a Destruction Register maintained by the Records Manager, including: data category, destruction method, date, authorising officer, and confirmation of completion.

## 7. Legal Hold Procedures

### 7.1 Initiation
A legal hold is initiated when litigation, regulatory investigation, or formal audit is reasonably anticipated, threatened, or pending. The General Counsel or Information Officer issues a Legal Hold Notice specifying the categories of data to be preserved, the relevant time period, and the data custodians responsible.

### 7.2 Scope
A legal hold suspends all scheduled destruction for data falling within its scope. This includes active data, archived data, backup data, and data held by third-party operators.

### 7.3 Duration
The legal hold remains in effect until formally released by the General Counsel or Information Officer. Release is communicated in writing to all data custodians.

### 7.4 Compliance
Failure to comply with a legal hold may result in disciplinary action and may expose MyMoolah to adverse legal consequences, including spoliation inferences.

### 7.5 Operator Notification
Where data subject to legal hold is held by a third-party operator, the operator is notified in writing and required to suspend destruction under the terms of the applicable Data Processing Agreement.

## 8. Automated Purging Procedures

### 8.1 Scheduled Jobs
MyMoolah operates automated purging jobs to enforce retention schedules:

- **Daily**: Redis cache entries exceeding TTL are automatically evicted. OTP logs older than 12 months are purged.
- **Monthly**: Support conversation records older than 3 years with no active legal hold are flagged for review and purging.
- **Quarterly**: Archived KYC documents for accounts closed more than 5 years prior are flagged for cryptographic erasure.
- **Annually**: Full retention schedule audit is conducted to identify data eligible for destruction.

### 8.2 Pre-Purge Validation
Before automated purging executes, the system verifies:
- No active legal hold applies to the data category.
- The retention period has fully elapsed.
- No pending data subject request references the data.
- The destruction is logged in the Destruction Register.

### 8.3 Manual Override
Automated purging may be suspended or overridden by the Information Officer or General Counsel. All overrides are documented with justification.

## 9. Cross-Border Retention Obligations

Where data is transferred to or processed in foreign jurisdictions (see Data Protection & Privacy Policy, Section 9), retention obligations are determined by the more stringent requirement — South African law or the foreign jurisdiction's law — unless a specific regulatory exemption applies.

Data stored in GCP regions outside South Africa is subject to the same retention and destruction schedules as domestically stored data. GCP data residency controls ensure that retention policies are applied consistently across regions.

## 10. Exceptions and Extensions

### 10.1 Regulatory Extension
Where a regulatory authority directs MyMoolah to retain data beyond the scheduled period, the retention is extended accordingly and documented.

### 10.2 Business Justification
Extension of retention beyond the scheduled period for business reasons requires written approval from the Information Officer, including a privacy impact assessment where the data includes personal information.

### 10.3 Data Subject Deletion Requests
Where a data subject exercises the right to deletion under POPIA S24, the request is honoured unless a regulatory retention obligation applies. In such cases, the data is retained for the regulatory minimum only, access is restricted, and the data subject is informed of the legal basis for continued retention.

## 11. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| **Board of Directors** | Approval of this policy; oversight of records management compliance. |
| **Information Officer** | Policy enforcement; legal hold management; destruction authorisation; exception approvals. |
| **Records Manager** | Maintenance of the Retention Schedule and Destruction Register; coordination of purging activities. |
| **Data Custodians** | Operational management of data systems; execution of retention and destruction procedures within their systems. |
| **Chief Technology Officer** | Implementation of automated retention controls, lifecycle policies, and backup management. |
| **All Employees** | Compliance with retention and destruction procedures; adherence to legal holds. |

## 12. Monitoring and Review

- This policy is reviewed annually or upon material changes to legislation, business operations, or technology architecture.
- The Records Manager conducts quarterly audits of retention compliance, sampling data across all storage systems.
- Internal audit reviews the Destruction Register and Legal Hold Register biannually.
- Non-compliance is reported to the Information Officer and escalated to the Board where material risk is identified.

## 13. Regulatory References

| Regulation | Relevance |
|---|---|
| Financial Intelligence Centre Act 38 of 2001 (FICA), Sections 22–25, 29 | Record-keeping obligations for accountable institutions. |
| Protection of Personal Information Act 4 of 2013 (POPIA), Section 14 | Retention limitation condition. |
| Electronic Communications and Transactions Act 25 of 2002 (ECT Act), Section 16 | Retention of data messages and electronic records. |
| Companies Act 71 of 2008, Sections 24, 28 | Corporate record-keeping obligations. |
| Tax Administration Act 28 of 2011, Section 29 | Tax record retention. |
| Prescription Act 68 of 1969, Section 11 | Prescription periods relevant to contractual claims. |
| Basic Conditions of Employment Act 75 of 1997 | Employment record retention. |
| ISO/IEC 27001:2022, Annex A.8.10 | Information deletion controls. |
| NIST SP 800-88 Rev. 1 | Guidelines for media sanitization. |

## 14. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Chief Compliance Officer | Initial policy creation. |

---

*This policy is classified as Confidential and is the property of MyMoolah (Pty) Ltd. Unauthorised reproduction or distribution is prohibited.*
