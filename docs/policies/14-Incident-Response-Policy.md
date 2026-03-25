# Security Incident Response Policy

| Field | Detail |
|---|---|
| **Policy Title** | Security Incident Response Policy |
| **Version** | 1.0 |
| **Effective Date** | March 2026 |
| **Next Review** | March 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Information Security Officer / Chief Technology Officer |
| **Approval Authority** | Board of Directors |
| **Document Reference** | POL-014 |

---

## 1. Purpose

This policy establishes a structured, repeatable process for identifying, responding to, containing, and recovering from security incidents affecting the MyMoolah Treasury Platform. It ensures that incidents are managed in a manner that minimises financial loss, protects customer data, maintains regulatory compliance, and preserves forensic evidence.

MyMoolah processes real financial transactions for South African consumers. A security incident — whether a data breach, service compromise, or unauthorised access — can have immediate monetary impact and regulatory consequences under POPIA, the National Payment System Act, and applicable financial sector regulations.

## 2. Scope

This policy applies to:

- All security events and incidents affecting MyMoolah production systems (api-mm.mymoolah.africa, wallet.mymoolah.africa), staging environments, and supporting infrastructure on Google Cloud Platform.
- All personnel, contractors, and third-party providers with access to MyMoolah systems or data.
- All categories of security incidents including but not limited to: unauthorised access, data breaches, malware, denial of service, insider threats, and supply chain compromises.
- Incidents originating from or affecting integrated third-party services (MobileMart, Flash, VALR, Standard Bank H2H).

## 3. Definitions

| Term | Definition |
|---|---|
| **Security Event** | An observed occurrence that may indicate a potential security issue. Not all events are incidents. |
| **Security Incident** | A confirmed violation or imminent threat of violation of security policies, acceptable use policies, or standard security practices. |
| **Data Breach** | An incident resulting in unauthorised access to, disclosure of, or loss of personal information as defined by POPIA. |
| **Incident Commander** | The designated individual with authority to direct all incident response activities. |
| **Chain of Custody** | The documented, unbroken trail showing the seizure, custody, control, transfer, and disposition of evidence. |
| **MTTD** | Mean Time to Detect — average elapsed time from incident occurrence to detection. |
| **MTTR** | Mean Time to Resolve — average elapsed time from detection to full resolution. |

## 4. Incident Classification

### 4.1 Severity Matrix

| Priority | Severity | Description | Examples | SLA: Acknowledge | SLA: Contain | SLA: Resolve |
|---|---|---|---|---|---|---|
| **P1** | Critical | Active compromise of production systems, confirmed data breach, or complete service outage affecting financial transactions. | Production database breach, payment processing compromise, ransomware, complete wallet service outage. | 15 minutes | 1 hour | 4 hours |
| **P2** | High | Partial service degradation, attempted breach with partial success, or exposure of Confidential data. | Successful credential stuffing (limited accounts), WAF bypass detected, Cloud SQL Auth Proxy failure, partial API outage. | 1 hour | 4 hours | 24 hours |
| **P3** | Medium | Security control failure without confirmed exploitation, or non-critical system compromise. | Rate limiter failure, bot scoring bypass, failed intrusion attempt, npm vulnerability with no known exploit. | 4 hours | 24 hours | 72 hours |
| **P4** | Low | Policy violation, minor misconfiguration, or informational security event requiring investigation. | Phishing email reported, minor CORS misconfiguration in staging, expired certificate in non-production. | 24 hours | 72 hours | 5 business days |

### 4.2 Escalation Criteria

An incident shall be escalated to a higher priority level when:

- The blast radius expands beyond initial assessment.
- Customer financial data is confirmed compromised.
- Regulatory notification obligations are triggered.
- Containment efforts fail within the SLA window.
- Media attention or public awareness materialises.

## 5. Incident Response Team

### 5.1 Team Composition

| Role | Primary Responsibility | Authority |
|---|---|---|
| **Incident Commander (CISO)** | Overall incident direction, decision authority, regulatory liaison. | Full authority to isolate systems, engage external resources, and authorise communications. |
| **Technical Lead (CTO)** | Technical investigation, containment execution, system recovery. | Authority to modify production systems, revoke access, deploy emergency patches. |
| **Legal Counsel** | Regulatory compliance assessment, POPIA notification obligations, evidence preservation guidance. | Authority to direct evidence handling and approve external disclosures. |
| **Communications Lead** | Internal and external communications, customer notifications, media management. | Authority to issue approved communications per the Communication Plan. |
| **Operations Lead** | Service restoration, backup management, business continuity coordination. | Authority to execute failover and recovery procedures. |
| **Forensic Analyst** | Evidence collection, log analysis, root cause investigation, timeline reconstruction. | Authority to access all system logs and audit trails during an active incident. |

### 5.2 Contact Protocol

The Incident Response Team shall maintain a current contact roster with primary and secondary contacts for each role. The roster shall be stored in a secure, offline-accessible format and tested quarterly. After-hours contact shall be via a dedicated incident response communication channel with escalation to phone within 15 minutes for P1 incidents.

## 6. Incident Response Phases

The incident response process follows the NIST SP 800-61 framework with six phases.

### 6.1 Phase 1: Preparation

Preparation activities ensure the organisation is ready to respond effectively:

- **Tooling**: GCP Cloud Logging configured with real-time alerting. Structured application logs with correlation IDs. Cloud Monitoring dashboards for anomaly detection.
- **Access**: Incident response team members have pre-provisioned, break-glass access to production logging and monitoring systems.
- **Documentation**: Runbooks maintained for common incident scenarios (DDoS, data breach, API compromise, database corruption). Runbooks reviewed quarterly.
- **Training**: All technical staff trained on incident identification and initial reporting. Tabletop exercises conducted quarterly (see Section 11).
- **Communication Channels**: Dedicated incident response channels established and tested monthly.

### 6.2 Phase 2: Identification

Detection and identification activities:

- **Automated Detection**: Cloud Armor WAF alerts, rate limiter threshold breaches (distributedRateLimiter.js), bot scoring anomalies (botScoring.js), authentication failure patterns, database query anomalies.
- **Manual Detection**: Security team monitoring, employee reporting, customer complaints, third-party notification, threat intelligence feeds.
- **Triage Process**: Upon detection, the on-call engineer shall: (1) confirm the event is a genuine incident, (2) assign initial severity using the matrix in Section 4, (3) notify the Incident Commander, (4) create an incident record with unique identifier, and (5) begin evidence preservation immediately.

### 6.3 Phase 3: Containment

Containment prevents further damage while preserving evidence:

**Short-term Containment** (immediate actions):
- Isolate affected systems from the network (GCP firewall rule updates, Cloud Run service revision rollback).
- Revoke compromised credentials (rotate API keys in Secret Manager, invalidate JWT signing keys).
- Block malicious IP addresses or ranges via Cloud Armor WAF rules.
- Enable enhanced logging on affected systems.

**Long-term Containment** (sustained actions):
- Deploy patched or hardened system versions alongside compromised systems.
- Implement additional monitoring on related systems.
- Restrict access to affected data stores pending investigation.
- Engage GCP support for infrastructure-level assistance if required.

### 6.4 Phase 4: Eradication

Eradication removes the root cause:

- Identify and eliminate all attack vectors, backdoors, and persistence mechanisms.
- Patch exploited vulnerabilities across all environments (UAT, Staging, Production).
- Rotate all potentially compromised secrets in GCP Secret Manager.
- Rebuild affected container images from verified clean sources.
- Verify eradication through comprehensive scanning of affected systems.

### 6.5 Phase 5: Recovery

Recovery restores normal operations:

- Restore services from verified clean backups (Cloud SQL point-in-time recovery, GCS versioned objects).
- Implement incremental service restoration: database first, then API services, then frontend.
- Conduct verification testing before restoring full traffic.
- Monitor recovered systems with heightened alerting thresholds for a minimum of 72 hours.
- Confirm data integrity through reconciliation checks (debits equal credits, no orphaned journal entries).

### 6.6 Phase 6: Lessons Learned

Post-incident review shall be completed within 5 business days of incident closure:

- **Post-Incident Report**: Root cause analysis, timeline of events, actions taken, impact assessment, and recommendations.
- **Blameless Review Meeting**: All incident response participants. Focus on process improvement, not individual fault.
- **Action Items**: Documented with owners, deadlines, and tracking in the incident management system.
- **Policy Updates**: This policy and related procedures updated to incorporate lessons learned.
- **Metrics Update**: MTTD and MTTR recorded. Trend analysis performed quarterly.

## 7. Communication Plan

### 7.1 Internal Communication

| Audience | When | Channel | Content |
|---|---|---|---|
| Incident Response Team | Immediately upon identification | Dedicated incident channel | Full technical details, severity, initial assessment. |
| Executive Leadership | Within 30 minutes for P1, 2 hours for P2 | Direct communication | Business impact summary, customer exposure estimate, containment status. |
| All Staff | When relevant to their function | Internal communication platform | General awareness, required actions, communication restrictions. |

### 7.2 External Communication

| Audience | When | Authority | Content |
|---|---|---|---|
| Affected Customers | As soon as reasonably possible after confirmation of data compromise | Communications Lead (approved by Legal) | Nature of incident, data affected, protective measures, contact information. |
| Information Regulator (POPIA) | As soon as reasonably practicable after confirmation of personal data breach | CISO (coordinated with Legal) | POPIA Section 22 notification: nature of breach, estimated affected data subjects, measures taken. |
| Payment System Regulator | As required by notification obligations | CISO | Incident details relevant to payment system integrity. |
| Law Enforcement | When criminal activity is suspected | Legal Counsel | Evidence and information as required, preserving chain of custody. |
| Banking Partners | When partner systems or data are affected | CTO / CISO | Technical details relevant to partner exposure, remediation timeline. |

### 7.3 POPIA Section 22 Breach Notification

When personal information has been accessed or acquired by an unauthorised person, MyMoolah shall:

1. Notify the Information Regulator as soon as reasonably practicable after discovery.
2. Notify affected data subjects as soon as reasonably practicable, unless law enforcement requests a delay.
3. Notification shall include: description of the compromise, category of data subjects affected, measures taken to address the breach, and recommendations for data subjects to mitigate potential harm.
4. Maintain a Breach Register recording all notifiable breaches, decisions, and notifications.

## 8. Evidence Preservation

### 8.1 Chain of Custody

All evidence shall be handled in accordance with chain-of-custody requirements:

- Evidence shall be collected by authorised personnel only.
- Each evidence item shall be documented: date/time of collection, collector identity, description, storage location, and hash verification (SHA-256).
- Evidence transfers shall be logged with sender, receiver, date/time, and purpose.
- Digital evidence shall be write-protected and stored in a secure, access-controlled repository.

### 8.2 Log Preservation

Upon incident declaration:

- Cloud Logging export shall be triggered to a dedicated, immutable GCS bucket.
- Application logs, WAF logs, database audit logs, and IAM audit logs for the relevant timeframe shall be preserved.
- Log retention during an active investigation overrides standard retention policies.
- No log data related to an active incident shall be deleted, overwritten, or modified.

### 8.3 System State Capture

For P1 and P2 incidents, the following shall be captured before containment actions alter system state:

- Database snapshots (Cloud SQL on-demand backup).
- Container image hashes and runtime configuration.
- Network flow logs and firewall rule state.
- Active session and connection data.

## 9. Incident Logging and Tracking

Every incident shall be recorded with:

- Unique incident identifier.
- Detection timestamp and method.
- Severity classification and any reclassifications.
- Timeline of response actions with timestamps.
- Personnel involved and roles performed.
- Impact assessment (systems affected, data exposed, financial impact).
- Root cause (when determined).
- Remediation actions and verification.
- Closure approval and date.

Incident records shall be retained for a minimum of five years. Quarterly incident trend reports shall be presented to Executive Leadership.

## 10. Service Level Agreement Targets

| Metric | P1 | P2 | P3 | P4 |
|---|---|---|---|---|
| **Acknowledge** | 15 minutes | 1 hour | 4 hours | 24 hours |
| **Initial Assessment** | 30 minutes | 2 hours | 8 hours | 48 hours |
| **Containment** | 1 hour | 4 hours | 24 hours | 72 hours |
| **Eradication** | 4 hours | 24 hours | 72 hours | 5 business days |
| **Full Resolution** | 4 hours | 24 hours | 72 hours | 5 business days |
| **Post-Incident Report** | 48 hours | 5 business days | 10 business days | 15 business days |

## 11. Tabletop Exercises

### 11.1 Schedule

- **Quarterly**: Scenario-based tabletop exercises involving the Incident Response Team.
- **Annually**: Full-scale simulation exercise with cross-functional participation.

### 11.2 Scenarios

Exercises shall rotate through the following scenario categories:

- Data breach involving customer PII (POPIA notification exercise).
- DDoS attack against production services.
- Insider threat — privileged account misuse.
- Supply chain compromise — third-party API key exposure.
- Ransomware affecting database infrastructure.
- Cloud infrastructure misconfiguration leading to data exposure.

### 11.3 Exercise Outcomes

Each exercise shall produce: a performance assessment against SLA targets, identified gaps in procedures or tooling, and an improvement action plan with assigned owners and deadlines.

## 12. Roles and Responsibilities

| Role | Responsibilities |
|---|---|
| **CISO** | Policy ownership, incident oversight, regulatory liaison, quarterly reporting, exercise programme. |
| **CTO** | Technical response leadership, infrastructure decisions, recovery execution. |
| **Legal Counsel** | Regulatory compliance, POPIA notification, evidence preservation, law enforcement coordination. |
| **Communications Lead** | Customer notification, media management, internal communications. |
| **All Personnel** | Report suspected security events immediately. Preserve evidence. Follow communication restrictions during incidents. |

## 13. Integration with GCP Monitoring

MyMoolah's incident detection leverages:

- **Cloud Logging**: Centralised log aggregation with structured JSON format. Real-time log-based alerting for security-relevant events.
- **Cloud Monitoring**: Custom dashboards tracking API error rates, authentication failures, rate limiter activations, and database anomalies.
- **Cloud Armor**: WAF event logging and automated blocking with alert notifications.
- **Cloud Audit Logs**: IAM activity, data access, and system event logging for all GCP services.
- **Application-Layer Detection**: Bot scoring thresholds, rate limiter breaches, Proof-of-Work challenge failures, and anomalous transaction patterns trigger automated alerts.

## 14. Monitoring and Review

This policy shall be reviewed annually or following any P1 or P2 incident. The CISO shall report incident response metrics (MTTD, MTTR, incident volume by severity) to the Board quarterly. Tabletop exercise results shall inform policy amendments.

## 15. Regulatory References

| Standard / Regulation | Relevance |
|---|---|
| **NIST SP 800-61 Rev. 2** | Computer Security Incident Handling Guide. Framework for this policy's phase structure. |
| **ISO 27001:2022 (A.5.24-A.5.28)** | Information security incident management controls. |
| **ISO 27035** | Information security incident management detailed guidance. |
| **POPIA (Act 4 of 2013), Section 22** | Security compromise notification obligations. |
| **National Payment System Act** | Payment system integrity and incident reporting. |
| **NIST Cybersecurity Framework** | Detect and Respond functions. |
| **SOC 2 Type II** | Incident response criteria readiness. |
| **Mojaloop FSPIOP** | Interoperability incident management requirements. |

## 16. Compliance and Enforcement

All personnel are required to report suspected security incidents immediately. Failure to report a known or suspected incident is a policy violation subject to disciplinary action. Deliberate destruction or concealment of evidence is grounds for immediate termination and potential legal action.

## 17. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | CISO / CTO | Initial policy creation. |

---

*This document is the property of MyMoolah (Pty) Ltd. Unauthorised reproduction or distribution is prohibited.*
