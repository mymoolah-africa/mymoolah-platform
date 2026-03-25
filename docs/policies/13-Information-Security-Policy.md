# Information Security Policy

| Field | Detail |
|---|---|
| **Policy Title** | Information Security Policy |
| **Version** | 1.0 |
| **Effective Date** | March 2026 |
| **Next Review** | March 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Information Security Officer / Chief Technology Officer |
| **Approval Authority** | Board of Directors |
| **Document Reference** | POL-013 |

---

## 1. Purpose

This policy establishes the framework for protecting MyMoolah Treasury Platform's information assets against unauthorised access, disclosure, alteration, destruction, and disruption. It defines security controls aligned with ISO 27001:2022, NIST Cybersecurity Framework, and South African regulatory requirements including POPIA and the National Payment System Act.

MyMoolah operates a banking-grade digital wallet and payment platform processing real financial transactions. The confidentiality, integrity, and availability of information assets are paramount to maintaining customer trust, regulatory compliance, and business continuity.

## 2. Scope

This policy applies to:

- All information assets owned, operated, or managed by MyMoolah, including production systems at api-mm.mymoolah.africa and wallet.mymoolah.africa.
- All personnel, contractors, and third-party service providers with access to MyMoolah systems or data.
- All computing environments: Google Cloud Platform (GCP) infrastructure, development workstations, and any future environments.
- All data in transit, at rest, and in processing across Cloud Run, Cloud SQL, Google Cloud Storage, and interconnected services.

## 3. Definitions

| Term | Definition |
|---|---|
| **Information Asset** | Any data, system, application, or infrastructure component that has value to MyMoolah. |
| **PII** | Personally Identifiable Information as defined by the Protection of Personal Information Act (POPIA). |
| **RBAC** | Role-Based Access Control — access permissions assigned by organisational role. |
| **MFA** | Multi-Factor Authentication — verification using two or more independent credentials. |
| **WAF** | Web Application Firewall — application-layer traffic filtering (Google Cloud Armor). |
| **FSPIOP** | Financial Services Provider Interoperability Protocol (Mojaloop standard). |
| **HSM** | Hardware Security Module — tamper-resistant cryptographic key storage. |

## 4. Information Classification

### 4.1 Classification Levels

| Level | Description | Examples | Handling Requirements |
|---|---|---|---|
| **Restricted** | Highest sensitivity. Compromise causes severe financial or legal harm. | Encryption keys, database credentials, KYC identity documents, payment card data, GCP Secret Manager entries. | AES-256-GCM encryption at rest. Access limited to named individuals. Full audit logging. No caching. |
| **Confidential** | Business-sensitive. Unauthorised disclosure causes material damage. | Customer account balances, transaction histories, internal API keys, reconciliation reports, supplier contracts. | Encrypted storage and transmission. Role-based access. PII redaction in logs. |
| **Internal** | For authorised personnel only. Limited business impact if disclosed. | Architecture documentation, internal procedures, non-sensitive configuration, staff directories. | Access restricted to authenticated employees. Not to be shared externally without approval. |
| **Public** | Approved for external distribution. No impact if disclosed. | Marketing materials, published API documentation, public-facing terms of service. | No access restrictions. Verify accuracy before publication. |

### 4.2 Classification Responsibilities

Data owners shall classify all information assets within their domain. The CISO shall maintain the Information Asset Register and conduct annual classification reviews. All new data stores, APIs, and services shall be classified before deployment to production.

## 5. Access Control

### 5.1 Role-Based Access Control (RBAC)

All system access shall follow the principle of least privilege. Access is granted based on organisational role and revoked immediately upon role change or termination.

MyMoolah enforces RBAC at the application layer with the following tiers:

- **Super Administrator**: Full platform access. Limited to CTO and CISO. Requires MFA.
- **Administrator**: Portal management, user administration, reconciliation oversight. Requires MFA.
- **Operator**: Transaction monitoring, customer support operations. Read-heavy access.
- **Customer**: Self-service wallet operations only. Scoped to own account data.

### 5.2 Authentication Standards

- **Customer Authentication**: JWT tokens signed with HS512 algorithm. Short-lived access tokens (configurable expiry). Refresh token rotation on each use.
- **Administrative Authentication**: MFA mandatory for all administrative access. Strong password policy enforced (minimum 12 characters, complexity requirements).
- **Service-to-Service Authentication**: GCP IAM service accounts with narrowly scoped permissions. Cloud SQL Auth Proxy for database connections — no direct database exposure.
- **Session Management**: Server-side session validation. Automatic session expiry after inactivity. Concurrent session controls.

### 5.3 Access Review

Quarterly access reviews shall be conducted by the CISO. All privileged access shall be reviewed monthly. Dormant accounts (no login for 90 days) shall be disabled automatically.

## 6. Encryption

### 6.1 Data in Transit

All data in transit shall be encrypted using TLS 1.3. Legacy TLS versions (1.0, 1.1, 1.2) are prohibited on all MyMoolah endpoints. HSTS headers are enforced with a minimum max-age of one year. Certificate management is handled through GCP-managed SSL certificates on Cloud Run and Cloud CDN.

### 6.2 Data at Rest

- **Database**: Cloud SQL instances use Google-managed encryption (AES-256) by default. Sensitive fields (KYC data, identity numbers) receive application-layer AES-256-GCM encryption before storage.
- **Object Storage**: GCS buckets (statements, payment files, KYC documents) use Google-managed encryption keys with bucket-level access controls.
- **Secrets**: All credentials, API keys, and encryption keys are stored in GCP Secret Manager. No secrets in environment variables, source code, or configuration files.

### 6.3 Key Management

Encryption keys shall be rotated annually at minimum. GCP Secret Manager versioning provides key rotation capability. Application-level encryption keys use a key hierarchy: master key in Secret Manager, derived data encryption keys per domain.

## 7. Network Security

### 7.1 Perimeter Defence

- **Cloud Armor WAF**: Deployed in front of all public-facing services. Custom rules for OWASP Top 10 protection, geo-restriction policies, and IP allowlisting for administrative endpoints.
- **Cloud CDN**: Static asset delivery with DDoS absorption. Edge caching for wallet.mymoolah.africa frontend assets.
- **Static IP**: Outbound traffic from 34.128.163.17 for SFTP Gateway and banking partner integrations (Standard Bank H2H).
- **Firewall Rules**: Default-deny ingress. Explicit allowlists per service. Internal service mesh communication restricted to GCP VPC.

### 7.2 Application-Layer Security

MyMoolah implements defence-in-depth at the application layer:

- **distributedRateLimiter.js**: Redis-backed distributed rate limiting with configurable windows per endpoint category. Prevents brute-force and volumetric abuse.
- **botScoring.js**: Behavioural analysis engine scoring requests on timing patterns, header anomalies, and interaction fingerprints. Elevated scores trigger progressive challenges.
- **requestGuard.js**: Request validation middleware enforcing size limits, content-type verification, and malformed payload rejection.
- **powChallenge.js**: Proof-of-Work CAPTCHA system requiring computational effort from clients. Mitigates automated credential-stuffing and bot traffic without third-party CAPTCHA dependencies.
- **aiGateway.js**: AI service request gating with per-user quotas, cost controls, and abuse detection.

### 7.3 API Security

- Parameterised queries exclusively — no string interpolation in SQL statements.
- Input validation and sanitisation at every API boundary using validation middleware.
- CORS restricted to approved origins (wallet.mymoolah.africa, portal domains).
- Content Security Policy (CSP) headers on all frontend responses.
- XSS prevention through output encoding and React's built-in escaping.
- CSRF protection via same-origin token validation.

## 8. Infrastructure Security

### 8.1 GCP Identity and Access Management

- IAM policies follow least-privilege principle. Service accounts are scoped per service (Cloud Run, Cloud SQL, GCS).
- No user accounts have direct database access. All queries route through Cloud SQL Auth Proxy.
- IAM audit logs enabled for all administrative actions.
- Organisation-level policies enforce MFA and restrict service account key creation.

### 8.2 Cloud SQL Security

- Private IP connectivity only — no public IP on database instances.
- Cloud SQL Auth Proxy enforces IAM-based authentication. Connection ports: UAT (6543), Staging (6544), Production (6545).
- Separation of database users: `mymoolah_app` (DML only: SELECT, INSERT, UPDATE, DELETE) and `postgres` admin (DDL: CREATE, ALTER, DROP — restricted to migration scripts).
- Automated backups with point-in-time recovery enabled.

### 8.3 Secret Management

GCP Secret Manager is the sole repository for all secrets. Secret access is audited through Cloud Audit Logs. Secret versions are immutable and versioned for rollback capability. Application retrieval of secrets occurs at startup — no runtime secret fetching per request.

## 9. Vulnerability Management

### 9.1 Dependency Scanning

- `npm audit` shall be executed as part of every CI/CD pipeline build.
- Critical and high-severity vulnerabilities must be remediated within 7 days of discovery.
- Medium-severity vulnerabilities must be remediated within 30 days.
- Dependency updates are tracked in the Tech Debt Register.

### 9.2 Application Security Testing

- Static Application Security Testing (SAST) integrated into the development pipeline.
- Manual penetration testing conducted annually by an independent assessor.
- OWASP Top 10 compliance verified quarterly.

### 9.3 Patch Management

- Operating system and runtime patches (Node.js, PostgreSQL) applied within 14 days of release for non-critical updates.
- Critical security patches applied within 48 hours.
- Cloud Run container images rebuilt with latest base images monthly.

## 10. Logging and Monitoring

### 10.1 Structured Logging

All application logs shall use structured JSON format. Logs must include: timestamp, correlation ID, severity level, service name, and event description. PII shall be redacted from all log output — no phone numbers, identity numbers, names, or account identifiers in plain text.

### 10.2 Audit Trail

All authentication events, authorisation decisions, data access, and administrative actions shall be logged with immutable timestamps. Audit logs shall be retained for a minimum of five years in compliance with financial record-keeping requirements.

### 10.3 Monitoring and Alerting

GCP Cloud Monitoring dashboards shall track: API response times, error rates, database performance, and security events. Automated alerts shall be configured for: authentication failures exceeding threshold, rate limit breaches, WAF rule triggers, and system availability degradation.

## 11. Endpoint Security

All development workstations accessing MyMoolah systems shall maintain: current operating system patches, endpoint protection software, disk encryption enabled, and screen lock after five minutes of inactivity. Remote access shall use secure channels only.

## 12. Physical Security

MyMoolah infrastructure is hosted exclusively on Google Cloud Platform. GCP data centres maintain ISO 27001, SOC 2 Type II, and PCI DSS certifications. Physical security controls — biometric access, 24/7 surveillance, environmental controls — are inherited from GCP's compliance posture. No MyMoolah data is stored on-premises or on local development machines in production.

## 13. Security Awareness Training

All personnel with system access shall complete security awareness training within 30 days of onboarding and annually thereafter. Training shall cover: information classification, phishing identification, incident reporting procedures, POPIA obligations, and secure coding practices. Completion records shall be maintained by the CISO.

## 14. Change Management

All changes to production systems, network configurations, access controls, and security policies shall follow a formal change management process:

- **Request**: All changes documented with business justification, risk assessment, and rollback plan.
- **Review**: Security-impacting changes reviewed by the CISO or delegate before approval.
- **Testing**: Changes validated in UAT and Staging environments before production deployment.
- **Deployment**: Production changes deployed through automated CI/CD pipelines (Cloud Build). No manual production modifications.
- **Verification**: Post-deployment verification within one hour. Automated health checks confirm service integrity.
- **Emergency Changes**: Permitted for P1 incidents with retrospective documentation within 24 hours.

## 15. Third-Party Security

### 15.1 Supplier Security Assessment

All third-party providers with access to MyMoolah systems or data shall undergo security assessment prior to engagement and annually thereafter. Assessment criteria include: data handling practices, encryption standards, access control maturity, incident response capability, and regulatory compliance.

### 15.2 Integration Security

Third-party API integrations (MobileMart, Flash, VALR, Standard Bank H2H) shall enforce:

- Mutual TLS or API key authentication with rotation schedules.
- Input validation on all data received from external sources.
- Timeout and circuit-breaker patterns to prevent cascading failures.
- Dedicated logging for third-party interactions with PII redaction.
- Contractual data processing agreements aligned with POPIA requirements.

## 16. Roles and Responsibilities

| Role | Responsibilities |
|---|---|
| **CISO** | Policy ownership, risk assessment, incident oversight, compliance monitoring, access reviews, third-party security assessments. |
| **CTO** | Technical implementation, architecture decisions, infrastructure security, development standards, change management oversight. |
| **Development Team** | Secure coding practices, vulnerability remediation, code review participation, security testing. |
| **Operations Team** | Monitoring, patch deployment, backup verification, access provisioning and deprovisioning. |
| **All Personnel** | Compliance with this policy, incident reporting, security awareness training completion. |

## 17. Monitoring and Review

This policy shall be reviewed annually or upon significant changes to: the threat landscape, regulatory requirements, technology infrastructure, or organisational structure. The CISO shall present policy compliance metrics to the Board quarterly. Key metrics include: access review completion rate, vulnerability remediation timelines, patch compliance percentage, and security incident trends.

## 18. Regulatory References

| Standard / Regulation | Relevance |
|---|---|
| **ISO 27001:2022** | Information security management system framework. Primary alignment standard. |
| **NIST Cybersecurity Framework** | Identify, Protect, Detect, Respond, Recover functions. |
| **POPIA (Act 4 of 2013)** | Protection of personal information. Data subject rights. Breach notification. |
| **National Payment System Act** | Payment system participation requirements. |
| **PCI DSS v4.0** | Payment card data security awareness (preparatory alignment). |
| **SOC 2 Type II** | Trust service criteria readiness for audit. |
| **Mojaloop FSPIOP** | Interoperability protocol security requirements. |

## 19. Compliance and Enforcement

Non-compliance with this policy may result in disciplinary action, including termination of employment or contract. Suspected violations shall be reported to the CISO immediately. Wilful circumvention of security controls shall be treated as a serious disciplinary matter.

## 20. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | CISO / CTO | Initial policy creation. |

---

*This document is the property of MyMoolah (Pty) Ltd. Unauthorised reproduction or distribution is prohibited.*
