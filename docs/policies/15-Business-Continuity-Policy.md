# Business Continuity and Disaster Recovery Policy

| Field | Detail |
|---|---|
| **Policy Title** | Business Continuity and Disaster Recovery Policy |
| **Version** | 1.0 |
| **Effective Date** | March 2026 |
| **Next Review** | March 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Information Security Officer / Chief Technology Officer |
| **Approval Authority** | Board of Directors |
| **Document Reference** | POL-015 |

---

## 1. Purpose

This policy establishes the framework for ensuring the continuity of critical MyMoolah Treasury Platform services during disruptive events and the recovery of systems and data following a disaster. It defines recovery objectives, disaster scenarios, response procedures, and testing requirements aligned with ISO 22301:2019 (Business Continuity Management Systems) and the NIST Cybersecurity Framework Recover function.

MyMoolah operates a banking-grade digital wallet processing real financial transactions for South African consumers. Service interruptions directly impact customers' ability to access funds, make payments, and purchase value-added services. This policy ensures that MyMoolah can maintain or rapidly restore critical operations under adverse conditions.

## 2. Scope

This policy applies to:

- All production systems supporting the MyMoolah platform: api-mm.mymoolah.africa (backend API on Cloud Run), wallet.mymoolah.africa (frontend on Cloud Run/CDN), Cloud SQL databases, GCS storage, and supporting services.
- All environments: Production, Staging, and UAT hosted on Google Cloud Platform.
- All personnel responsible for system operations, incident management, and service delivery.
- All third-party dependencies: payment processors, VAS suppliers, banking integrations, and cloud services.
- All data: customer accounts, transaction ledgers, KYC records, reconciliation data, and operational configuration.

## 3. Definitions

| Term | Definition |
|---|---|
| **BCP** | Business Continuity Plan — documented procedures to maintain operations during disruption. |
| **DRP** | Disaster Recovery Plan — technical procedures to restore IT systems after a disaster. |
| **BIA** | Business Impact Analysis — assessment of the criticality of business functions and the impact of their disruption. |
| **RTO** | Recovery Time Objective — maximum acceptable duration of system downtime. |
| **RPO** | Recovery Point Objective — maximum acceptable data loss measured in time. |
| **MTPD** | Maximum Tolerable Period of Disruption — absolute limit beyond which business viability is threatened. |
| **Failover** | The process of switching operations from a failed system to a redundant or standby system. |
| **Warm Standby** | A DR configuration where systems are provisioned and data is replicated but services are not actively serving traffic. |

## 4. Business Impact Analysis

### 4.1 Critical Business Functions

| Function | Criticality | Impact of Disruption | MTPD |
|---|---|---|---|
| **Wallet Services** (balance enquiry, transfers, account management) | Critical | Customers unable to access funds or transact. Direct financial and reputational harm. | 4 hours |
| **Payment Processing** (top-up, withdrawal, peer-to-peer) | Critical | Revenue cessation. Customer funds inaccessible. Regulatory implications. | 4 hours |
| **VAS Delivery** (airtime, data, electricity, bills) | High | Service unavailability. Customer dissatisfaction. Revenue loss. | 8 hours |
| **KYC and Onboarding** | High | New customer acquisition halted. Regulatory non-compliance if verification cannot be completed. | 12 hours |
| **Reconciliation and Settlement** | High | Financial discrepancies undetected. Settlement delays with partners. | 24 hours |
| **Customer Support (AI RAG)** | Medium | Degraded customer experience. Manual support fallback required. | 24 hours |
| **Administrative Portal** | Medium | Operational management impaired. Monitoring gaps. | 24 hours |
| **Reporting and Analytics** | Low | Business intelligence delayed. No immediate operational impact. | 72 hours |

### 4.2 Data Criticality

| Data Category | Classification | RPO | Backup Frequency |
|---|---|---|---|
| Transaction ledger (journal entries, balances) | Restricted | 1 hour | Continuous replication + hourly snapshots |
| Customer accounts and profiles | Restricted | 1 hour | Continuous replication + hourly snapshots |
| KYC documents and verification records | Restricted | 4 hours | Daily full backup + change-triggered |
| Reconciliation and settlement data | Confidential | 4 hours | Daily full backup |
| Application configuration and secrets | Confidential | 24 hours | Version-controlled in Secret Manager |
| Frontend assets and static content | Internal | 24 hours | Source control (Git) + CDN cache |

## 5. Recovery Objectives

### 5.1 Primary Targets

| Objective | Target | Justification |
|---|---|---|
| **RTO** (Recovery Time Objective) | **4 hours** | Maximum acceptable downtime for critical wallet and payment services before customer and regulatory impact becomes severe. |
| **RPO** (Recovery Point Objective) | **1 hour** | Maximum acceptable data loss. Cloud SQL continuous replication and hourly backups ensure transaction data loss is limited to at most 60 minutes of operations. |
| **MTPD** (Maximum Tolerable Period of Disruption) | **8 hours** | Beyond this threshold, cumulative financial, reputational, and regulatory impact threatens business viability. |

### 5.2 Recovery Priority Order

Restoration shall follow this sequence:

1. **Database Services** — Cloud SQL instances (transaction ledger, customer data).
2. **Authentication and Security** — JWT signing, Secret Manager access, rate limiting (Redis).
3. **Core API Services** — api-mm.mymoolah.africa (Cloud Run backend).
4. **Payment Gateway Integrations** — Standard Bank H2H, VALR, payment processors.
5. **Frontend Application** — wallet.mymoolah.africa (Cloud Run/CDN).
6. **VAS Supplier Connections** — MobileMart, Flash API integrations.
7. **Support Services** — AI RAG, admin portal, reporting.

## 6. Disaster Scenarios and Response

### 6.1 GCP Region Failure

**Scenario**: Primary GCP region (e.g., europe-west1) experiences a complete outage affecting Cloud Run, Cloud SQL, and GCS.

**Response**:
- Activate cross-region Cloud SQL read replica promotion to primary in the designated DR region.
- Deploy Cloud Run services to the DR region using container images stored in Artifact Registry (multi-region).
- Update Cloud DNS records to point to DR region endpoints.
- Redirect Cloud CDN origin to DR region frontend service.
- Verify data consistency between promoted replica and last known good state.
- Estimated recovery: 2-4 hours.

### 6.2 Database Corruption

**Scenario**: Cloud SQL database suffers data corruption due to software defect, malicious action, or infrastructure failure.

**Response**:
- Immediately halt write operations to prevent corruption propagation.
- Identify corruption scope through integrity checks (ledger balance verification: debits equal credits).
- Restore from the most recent verified backup using Cloud SQL point-in-time recovery (granularity: per-transaction log).
- Replay any recoverable transactions from application logs between the restore point and the corruption event.
- Conduct full reconciliation before resuming normal operations.
- Estimated recovery: 1-4 hours depending on corruption scope.

### 6.3 Security Breach

**Scenario**: Confirmed compromise of production systems (covered in detail by the Incident Response Policy, POL-014).

**Response**:
- Execute containment per POL-014.
- If data integrity is uncertain, initiate clean environment build from verified infrastructure-as-code and restore data from pre-compromise backups.
- Rotate all secrets in GCP Secret Manager.
- Rebuild all Cloud Run container images from verified source.
- Conduct security verification before restoring customer-facing services.
- Coordinate with Incident Response Team on communication and regulatory notification.

### 6.4 Distributed Denial of Service (DDoS)

**Scenario**: Sustained volumetric or application-layer DDoS attack overwhelming platform capacity.

**Response**:
- Cloud Armor WAF absorbs and filters volumetric attacks at the edge.
- Application-layer defences activate: distributedRateLimiter.js tightens thresholds, botScoring.js elevates challenge requirements, powChallenge.js increases Proof-of-Work difficulty.
- Cloud Run auto-scaling handles legitimate traffic bursts.
- If attack exceeds Cloud Armor capacity, engage GCP DDoS Response Team.
- Implement emergency geo-restriction if attack originates from identifiable regions outside South Africa.
- Estimated mitigation: 30 minutes to 2 hours.

### 6.5 Supplier API Failure

**Scenario**: Critical third-party supplier becomes unavailable (MobileMart, Flash, VALR, Standard Bank H2H).

**Response**:

| Supplier | Service Affected | Contingency |
|---|---|---|
| **MobileMart** | Airtime, data, electricity | Queue purchases for retry. Activate secondary supplier if available. Display service temporarily unavailable to customers for affected products only. |
| **Flash** | Bill payments, vouchers | Queue transactions. Activate alternative provider. Inform affected customers of delay. |
| **VALR** | USDC/stablecoin operations | Suspend crypto operations. Customer ZAR wallet unaffected. Resume upon VALR restoration. |
| **Standard Bank** | H2H payments, SFTP statements | Queue outbound payments. Process statement files upon SFTP restoration. Manual reconciliation for the gap period. |

All supplier failures shall be logged with timestamps. SLA compliance by suppliers shall be tracked and reviewed quarterly.

### 6.6 Redis Failure

**Scenario**: Redis instance becomes unavailable, affecting rate limiting, session caching, and distributed locks.

**Response**:
- Application falls back to in-memory rate limiting (reduced effectiveness but operational).
- Deploy replacement Redis instance from configuration.
- Rate limiting state rebuilds automatically from incoming traffic.
- No customer data loss (Redis contains only ephemeral operational data).
- Estimated recovery: 15-30 minutes.

## 7. GCP Disaster Recovery Capabilities

### 7.1 Cloud SQL

- **Automated Backups**: Daily automated backups retained for 30 days. Point-in-time recovery enabled with transaction log retention.
- **High Availability**: Cloud SQL HA configuration with automatic failover to standby instance in a different zone within the same region.
- **Cross-Region Replication**: Read replicas in a secondary region for disaster recovery promotion.
- **Connection Security**: Cloud SQL Auth Proxy ensures encrypted, IAM-authenticated connections. Ports: UAT (6543), Staging (6544), Production (6545).

### 7.2 Cloud Run

- **Multi-Region Deployment**: Container images stored in multi-region Artifact Registry. Services deployable to any supported region within minutes.
- **Auto-Scaling**: Automatic scale-up during recovery to handle accumulated request queues. Scale-to-zero when idle to minimise cost.
- **Revision Management**: Instant rollback to previous service revisions. Traffic splitting for canary recovery verification.

### 7.3 Google Cloud Storage

- **Object Versioning**: Enabled on critical buckets (SBSA statement files, KYC documents, payment files). Accidental deletion recoverable from version history.
- **Multi-Region Buckets**: Critical data stored in multi-region buckets for geographic redundancy.
- **Lifecycle Policies**: Automated transition of older versions to lower-cost storage tiers. Retention policies prevent premature deletion.

### 7.4 Secret Manager

- **Version History**: All secrets maintain version history. Previous versions accessible for rollback.
- **Replication**: Secrets replicated across regions per GCP replication policy.
- **Access Audit**: All secret access logged through Cloud Audit Logs.

## 8. Data Backup Strategy

### 8.1 Backup Schedule

| Data Store | Method | Frequency | Retention | Storage Location |
|---|---|---|---|---|
| Cloud SQL (Production) | Automated backup + PITR | Daily full + continuous transaction logs | 30 days automated, 90 days manual snapshots | GCP-managed, same region + cross-region |
| Cloud SQL (Staging/UAT) | Automated backup | Daily | 7 days | GCP-managed, same region |
| GCS Critical Buckets | Object versioning | Continuous (every write) | 90 days version retention | Multi-region |
| GCP Secret Manager | Version history | Every update | All versions retained | GCP-managed, replicated |
| Application Source Code | Git (GitHub) | Every commit | Indefinite | GitHub (geo-distributed) |
| Infrastructure Configuration | Infrastructure-as-Code (Git) | Every change | Indefinite | GitHub |

### 8.2 Backup Verification

- Monthly: Automated backup integrity verification (restore test to isolated environment).
- Quarterly: Full restore drill — production backup restored to UAT, application smoke tests executed.
- Annually: Complete DR failover test (see Section 9).

## 9. Testing Schedule

### 9.1 Test Types and Frequency

| Test Type | Frequency | Scope | Participants |
|---|---|---|---|
| **Backup Restore Verification** | Monthly | Restore Cloud SQL backup to isolated instance. Verify data integrity. | Operations Team |
| **Tabletop Exercise** | Quarterly | Walk through a disaster scenario on paper. Validate decision-making and communication. | Crisis Management Team |
| **DR Failover Test** | Quarterly | Simulate component failure (single service, database, supplier). Execute recovery procedures. | Technical Team |
| **Full Failover Simulation** | Annually | Simulate complete region failure. Execute full DR plan. Measure RTO and RPO achievement. | All Teams |
| **Communication Plan Test** | Semi-annually | Test notification chains, contact roster accuracy, and communication channel availability. | All Teams |

### 9.2 Test Outcomes

Each test shall produce a report documenting: test scenario, expected vs actual recovery times, issues encountered, data integrity verification results, and improvement recommendations. Test results shall be reviewed by the CISO and CTO within 5 business days.

## 10. Communication Plan During Outage

### 10.1 Internal Communication

| Phase | Action | Channel | Responsible |
|---|---|---|---|
| Detection | Notify Crisis Management Team | Dedicated incident channel | On-call engineer |
| Assessment | Confirm severity and estimated recovery | Crisis communication channel | Incident Commander |
| Active Recovery | Hourly status updates | Crisis communication channel | Technical Lead |
| Resolution | All-clear notification with post-mortem timeline | Organisation-wide | Communications Lead |

### 10.2 External Communication

| Audience | When | Content | Channel |
|---|---|---|---|
| Customers | Within 30 minutes of confirmed outage | Service status, estimated recovery, alternative actions | In-app notification, status page, email |
| Banking Partners | Within 1 hour for payment-affecting outages | Technical impact, settlement implications, estimated restoration | Direct communication |
| Regulators | As required by regulatory obligations | Outage details, customer impact, recovery measures | Formal written notification |
| Suppliers | When supplier coordination is required for recovery | Technical requirements for restoration, timeline | Direct communication |

### 10.3 Status Page

A customer-facing status page shall provide real-time service status for: Wallet Services, Payment Processing, VAS Delivery, and Account Management. The status page shall be hosted on infrastructure independent of the primary MyMoolah platform.

## 11. Crisis Management Team

| Role | Primary Responsibility |
|---|---|
| **Crisis Director (CEO/COO)** | Strategic decisions, business impact assessment, regulatory engagement. |
| **Incident Commander (CISO)** | Operational command, security assessment, evidence preservation direction. |
| **Technical Recovery Lead (CTO)** | System recovery execution, infrastructure decisions, data integrity verification. |
| **Communications Lead** | Customer notifications, media management, status page updates. |
| **Legal Counsel** | Regulatory compliance, contractual obligations, liability assessment. |
| **Operations Manager** | Business process continuity, manual workarounds, staff coordination. |

## 12. Return-to-Normal Procedures

### 12.1 Recovery Verification Checklist

Before declaring return to normal operations:

- [ ] Database integrity verified: ledger balances reconciled (debits equal credits).
- [ ] All Cloud Run services healthy and responding within SLA (API < 200ms).
- [ ] Authentication and authorisation systems operational (JWT issuance and validation).
- [ ] Rate limiting and security controls active (Redis, distributedRateLimiter.js, botScoring.js).
- [ ] All supplier integrations functional (MobileMart, Flash, VALR, Standard Bank H2H).
- [ ] Cloud SQL Auth Proxy connections stable on all ports (6543, 6544, 6545).
- [ ] GCS bucket access verified for statements and payment files.
- [ ] Monitoring and alerting systems operational with no false positives.
- [ ] Pending transactions from outage period processed or reconciled.
- [ ] Customer-facing services verified through end-to-end transaction testing.

### 12.2 Post-Recovery Monitoring

- Heightened monitoring for 72 hours following recovery.
- Reduced alerting thresholds to detect early signs of recurring issues.
- Daily recovery status reports to Executive Leadership for 5 business days.
- Customer feedback monitoring for reports of residual issues.

### 12.3 Post-Recovery Review

Within 10 business days of return to normal:

- Formal post-recovery report documenting: incident timeline, recovery actions, RTO/RPO achievement, data loss assessment, and cost impact.
- Lessons learned session with all involved teams.
- Policy and procedure updates based on findings.
- Update disaster scenario playbooks with new information.

## 13. Roles and Responsibilities

| Role | Responsibilities |
|---|---|
| **CISO** | Policy ownership, BIA oversight, DR test programme, regulatory compliance for continuity obligations. |
| **CTO** | DR architecture, recovery procedure design, infrastructure resilience, technical test execution. |
| **Operations Team** | Backup management, monitoring, initial incident detection, recovery execution. |
| **Development Team** | Application recovery support, data integrity verification, hotfix deployment. |
| **All Personnel** | Familiarity with business continuity procedures relevant to their role. Participation in exercises. |

## 14. Supplier Contingency Management

### 14.1 Supplier Risk Assessment

All critical suppliers shall be assessed annually for:

- Financial stability and going-concern risk.
- SLA compliance history (uptime, response times, resolution times).
- Security posture and compliance certifications.
- Geographic and infrastructure concentration risk.
- Contractual exit and transition provisions.

### 14.2 Supplier Continuity Requirements

Contracts with critical suppliers shall include: defined SLAs with financial penalties, incident notification obligations, business continuity plan evidence, right-to-audit provisions, and data portability guarantees.

## 15. Monitoring and Review

This policy shall be reviewed annually, after any significant incident requiring DR activation, or following material changes to infrastructure or business operations. The CISO shall report business continuity readiness metrics to the Board semi-annually, including DR test results and RTO/RPO compliance.

## 16. Regulatory References

| Standard / Regulation | Relevance |
|---|---|
| **ISO 22301:2019** | Business Continuity Management Systems. Primary alignment standard. |
| **ISO 27001:2022 (A.5.29-A.5.30)** | ICT readiness for business continuity. Information security during disruption. |
| **NIST Cybersecurity Framework** | Recover function: Recovery Planning, Improvements, Communications. |
| **POPIA (Act 4 of 2013)** | Data availability and integrity obligations. Processing limitation during recovery. |
| **National Payment System Act** | Payment system availability and resilience requirements. |
| **PCI DSS v4.0** | Business continuity awareness for payment data environments. |
| **SOC 2 Type II** | Availability trust service criterion. |
| **Mojaloop FSPIOP** | Interoperability service availability requirements. |

## 17. Compliance and Enforcement

All personnel are responsible for understanding and executing their assigned roles within this policy. Failure to participate in scheduled exercises, maintain required documentation, or follow recovery procedures is a policy violation subject to disciplinary action. The Crisis Management Team has authority to invoke this policy and direct all recovery activities.

## 18. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | CISO / CTO | Initial policy creation. |

---

*This document is the property of MyMoolah (Pty) Ltd. Unauthorised reproduction or distribution is prohibited.*
