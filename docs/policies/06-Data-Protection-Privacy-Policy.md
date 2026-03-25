# Data Protection & Privacy Policy (POPIA Compliance)

| Field | Detail |
|---|---|
| **Policy Title** | Data Protection & Privacy Policy |
| **Version** | 1.0 |
| **Effective Date** | March 2026 |
| **Next Review** | March 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Compliance Officer / Information Officer |
| **Approved By** | Board of Directors, MyMoolah (Pty) Ltd |

---

## 1. Purpose

This policy establishes the framework by which MyMoolah (Pty) Ltd ("MyMoolah") collects, processes, stores, and disposes of personal information in compliance with the Protection of Personal Information Act 4 of 2013 ("POPIA"), the General Data Protection Regulation ("GDPR") where applicable, and international best-practice standards including ISO 27001 and ISO 27701.

The policy exists to protect the constitutional right to privacy of every data subject whose personal information is processed through the MyMoolah Treasury Platform, while enabling the lawful delivery of digital wallet, value-added services, cross-border payment, and Know Your Customer operations.

## 2. Scope

This policy applies to:

- All personal information processed by MyMoolah, whether in electronic or physical form.
- All employees, contractors, subcontractors, and third-party service providers who access, process, or store personal information on behalf of MyMoolah.
- All technology systems operated by MyMoolah, including but not limited to the Node.js/Express backend, PostgreSQL databases hosted on Google Cloud SQL, React frontend applications served via Cloud Run, Google Cloud Storage buckets, Redis caches, and Google Secret Manager.
- All services offered through the platform: digital wallet, VAS (airtime, data, electricity, bill payments), PayShap, USDC/MoolahMove cross-border transfers, NFC deposits, KYC verification, and automated reconciliation.
- The production domains api-mm.mymoolah.africa and wallet.mymoolah.africa.

## 3. Definitions

| Term | Definition |
|---|---|
| **Data Subject** | A natural or juristic person to whom personal information relates (POPIA S1). |
| **Information Officer** | The person designated under POPIA S55 responsible for encouraging compliance and handling data subject requests. |
| **Personal Information** | Information relating to an identifiable living natural or existing juristic person, as defined in POPIA S1. |
| **Special Personal Information** | Information concerning religious or philosophical beliefs, race, ethnic origin, trade union membership, political persuasion, health, sex life, biometric information, or criminal behaviour (POPIA S26). |
| **Processing** | Any operation concerning personal information, including collection, receipt, recording, storage, modification, retrieval, consultation, use, dissemination, merging, restriction, degradation, erasure, or destruction (POPIA S1). |
| **Operator** | A person who processes personal information for a responsible party in terms of a contract or mandate (POPIA S1). |
| **Responsible Party** | MyMoolah (Pty) Ltd, as the entity that determines the purpose and means of processing personal information. |
| **Cross-Border Transfer** | The transfer of personal information to a party in a foreign country (POPIA S72). |
| **PII** | Personally Identifiable Information — used interchangeably with Personal Information in technical contexts. |

## 4. Lawful Basis for Processing (POPIA Sections 9–12)

MyMoolah processes personal information only where one or more of the following conditions are satisfied:

### 4.1 Consent (POPIA S11(1)(a))
Data subjects provide explicit, informed, voluntary consent during account registration and KYC onboarding. Consent records are stored in PostgreSQL with timestamps, IP addresses, and consent version identifiers. Consent may be withdrawn at any time via the in-app profile settings or by written request to the Information Officer.

### 4.2 Contractual Necessity (POPIA S11(1)(b))
Processing is necessary for the performance of a contract to which the data subject is a party — specifically, the MyMoolah Terms of Service governing digital wallet, VAS, and payment services.

### 4.3 Legal Obligation (POPIA S11(1)(c))
Processing is required to comply with the Financial Intelligence Centre Act 38 of 2001 ("FICA"), the Regulation of Interception of Communications and Provision of Communication-Related Information Act 70 of 2002 ("RICA"), the Electronic Communications and Transactions Act 25 of 2002 ("ECT Act"), and the Tax Administration Act 28 of 2011.

### 4.4 Legitimate Interest (POPIA S11(1)(f))
Processing is necessary for the legitimate interests of MyMoolah or a third party to whom the information is supplied, provided such interests are not overridden by the data subject's rights. Legitimate interest assessments are documented and reviewed annually.

## 5. Data Subject Rights

MyMoolah recognises and facilitates the following rights, as provided under POPIA Chapter 3:

| Right | POPIA Reference | Implementation |
|---|---|---|
| Right of access | S23 | Data subjects may request a copy of all personal information held. Requests fulfilled within 30 days. |
| Right to correction | S24 | Inaccurate or incomplete information corrected upon request. |
| Right to deletion | S24 | Personal information deleted where retention is no longer justified, subject to regulatory retention obligations. |
| Right to object | S11(3)(b) | Data subjects may object to processing on reasonable grounds. |
| Right to restrict processing | S11(3)(a) | Processing restricted pending resolution of an objection or correction request. |
| Right to data portability | Best practice | Structured, machine-readable export of transaction history available on request. |

Requests shall be directed to the Information Officer at privacy@mymoolah.africa. Identity verification is required before any request is actioned.

## 6. Information Officer

### 6.1 Designation
MyMoolah has designated an Information Officer in accordance with POPIA S55, registered with the Information Regulator of South Africa. The Information Officer's details are published on the MyMoolah website and in the POPIA manual required under the Promotion of Access to Information Act 2 of 2000 ("PAIA").

### 6.2 Duties
The Information Officer is responsible for:
- Encouraging compliance with POPIA within MyMoolah.
- Handling requests from data subjects in accordance with POPIA Chapter 3.
- Working with the Information Regulator in relation to investigations.
- Conducting or overseeing privacy impact assessments.
- Maintaining the personal information inventory.
- Ensuring operator agreements comply with POPIA S19–21.
- Reporting data breaches in accordance with POPIA S22.

## 7. Personal Information Inventory

MyMoolah maintains a comprehensive personal information inventory, reviewed quarterly.

| Data Category | Data Elements | Storage Location | Purpose | Retention |
|---|---|---|---|---|
| Identity | Full name, ID number (AES-256-GCM encrypted), date of birth | PostgreSQL (Cloud SQL) | KYC, FICA compliance | 5 years after relationship ends |
| Contact | Mobile number, email address | PostgreSQL (Cloud SQL) | Service delivery, OTP verification | Duration of relationship |
| Financial | Transaction records, wallet balances, journal entries | PostgreSQL (Cloud SQL) | Ledger, reconciliation, regulatory reporting | 5 years (FICA S22–25) |
| Biometric | Selfie image, ID document image | Google Cloud Storage (GCS) | KYC liveness verification | 5 years after relationship ends |
| Device | Device ID, IP address, push notification tokens | PostgreSQL / Redis | Security, fraud prevention | Duration of relationship |
| Support | Chat transcripts, support tickets | PostgreSQL | Customer support, dispute resolution | 3 years |
| Consent | Consent records, marketing preferences | PostgreSQL | Lawful basis evidence | Indefinite |

## 8. Special Personal Information

### 8.1 Biometric Data
MyMoolah processes biometric data (facial images, identity document scans) solely for KYC verification under FICA obligation. This processing falls within the exemption in POPIA S27(1)(d) — processing is necessary for the establishment, exercise, or defence of a right or obligation in law.

### 8.2 Safeguards
- Biometric images are stored in dedicated GCS buckets with restrictive IAM policies.
- Access is limited to the KYC processing pipeline and authorised compliance personnel.
- Images are deleted in accordance with the Data Retention Policy (Policy 07).
- No biometric data is used for profiling, behavioural analysis, or marketing.

## 9. Cross-Border Data Transfers (POPIA S72)

### 9.1 Applicability
Cross-border transfers arise in the following contexts:
- **USDC/MoolahMove**: Stablecoin transactions involving VALR (South African exchange) and Coinbase (US entity).
- **Google Cloud Platform**: Data processed within GCP regions, with primary region configured as europe-west4 (Netherlands) with data residency controls.

### 9.2 Conditions for Transfer
Transfers to foreign jurisdictions are permitted only where:
- The recipient country provides an adequate level of protection (POPIA S72(1)(a)); or
- The data subject consents to the transfer after being informed of the risks (POPIA S72(1)(b)); or
- The transfer is necessary for the performance of a contract (POPIA S72(1)(c)); or
- A binding agreement ensures the recipient adheres to conditions substantially similar to POPIA (POPIA S72(1)(e)).

### 9.3 Controls
- Standard Contractual Clauses are incorporated into all cross-border service agreements.
- Data processing addenda compliant with POPIA S19–21 are executed with all foreign operators.
- GCP data residency is configured to restrict primary storage to GDPR-adequate jurisdictions.

## 10. Third-Party Data Processing Agreements

MyMoolah has executed POPIA-compliant operator agreements (POPIA S19–21) with all third-party processors:

| Operator | Service | Data Processed | Agreement Type |
|---|---|---|---|
| VALR | USDC on/off-ramp | Transaction data, wallet identifiers | Data Processing Agreement |
| Flash / Kazang | VAS distribution | Transaction references, amounts | Operator Agreement |
| MobileMart | Airtime/data provisioning | MSISDN, product codes | Operator Agreement |
| Standard Bank | H2H banking (MT940/MT942) | Account numbers, statement data | Banking Services Agreement + DPA |
| EasyPay | Bill payments | Account references, payment amounts | Operator Agreement |
| Google Cloud Platform | Infrastructure | All data (encrypted at rest and in transit) | Cloud Data Processing Addendum |

All agreements require the operator to: process data only on documented instructions, implement appropriate security measures, notify MyMoolah of data breaches without undue delay, delete or return data on termination, and submit to audits.

## 11. Privacy by Design

MyMoolah implements privacy by design and by default across its technology architecture:

- **Field-Level Encryption**: South African ID numbers are encrypted using AES-256-GCM before database storage. Encryption keys are managed via Google Secret Manager with automatic rotation.
- **PII Redaction in Logs**: Structured logging pipelines automatically redact personal information (phone numbers, names, ID numbers) from application logs before persistence.
- **HMAC Blind Indexes**: Searchable encrypted fields use HMAC-SHA256 blind indexes, enabling lookup without exposing plaintext values.
- **Minimal Data Collection**: Only data necessary for the stated purpose is collected. Form fields and API endpoints enforce minimality through validation schemas.
- **Data Segregation**: Production, staging, and UAT environments maintain strict data segregation. No production personal information is used in non-production environments.
- **Access Control**: Role-based access control (RBAC) restricts database and application access to authorised personnel. The PostgreSQL application user (mymoolah_app) has DML-only privileges; DDL operations require separate administrative credentials.

## 12. Data Breach Notification (POPIA S22)

### 12.1 Definition
A data breach is any unauthorised access to, or acquisition of, personal information that compromises the confidentiality, integrity, or availability of such information.

### 12.2 Internal Reporting
Any employee or contractor who becomes aware of a suspected breach must report it to the Information Officer within 4 hours of discovery.

### 12.3 Notification to the Information Regulator
Where there are reasonable grounds to believe that personal information has been accessed or acquired by an unauthorised person, the Information Officer shall notify the Information Regulator as soon as reasonably possible, and in any event within 72 hours. The notification shall include: the nature of the breach, categories and approximate number of data subjects affected, likely consequences, and measures taken or proposed.

### 12.4 Notification to Data Subjects
Affected data subjects shall be notified as soon as reasonably possible after the Information Regulator has been informed, unless a law enforcement agency requests a delay. Notification shall be by direct communication (email or in-app notification) and shall include: a description of the breach, steps taken, recommendations for the data subject to mitigate harm, and contact details for the Information Officer.

### 12.5 Breach Register
All breaches, whether notifiable or not, are recorded in a breach register maintained by the Information Officer. The register includes the date, nature, impact assessment, remedial actions, and notification status.

## 13. Privacy Impact Assessments

A Privacy Impact Assessment ("PIA") shall be conducted before:
- Launching any new product or service that processes personal information.
- Implementing a new technology system or significantly modifying an existing one.
- Entering into a new data sharing arrangement with a third party.
- Processing personal information for a new purpose not covered by existing consent or lawful basis.

PIAs are conducted by the Information Officer in consultation with the technology and legal teams. Results and mitigating actions are documented and presented to the executive team. PIAs are retained for the lifetime of the processing activity plus five years.

## 14. Cookie and Tracking Policy

### 14.1 wallet.mymoolah.africa
The MyMoolah web application uses only strictly necessary cookies required for session management, authentication (JWT), and security (CSRF tokens). No third-party advertising or analytics tracking cookies are deployed.

### 14.2 Consent
As only strictly necessary cookies are used, explicit cookie consent is not required under POPIA. Should analytics or marketing cookies be introduced in future, a consent banner complying with POPIA and GDPR best practice shall be implemented prior to deployment.

## 15. Children's Data

MyMoolah does not knowingly process the personal information of children under the age of 18 without the consent of a competent person (parent or guardian), as required by POPIA S34–35. The KYC onboarding process includes age verification through identity document validation. Where a data subject is identified as a minor, the account is flagged and parental/guardian consent is obtained before further processing.

## 16. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| **Board of Directors** | Oversight of data protection compliance; approval of this policy. |
| **Information Officer** | Day-to-day compliance management; data subject request handling; breach reporting; PIA oversight. |
| **Chief Technology Officer** | Technical implementation of privacy controls; encryption, access control, logging. |
| **Development Team** | Privacy by design in code; PII redaction; parameterised queries; field encryption. |
| **All Employees** | Compliance with this policy; reporting suspected breaches; completing privacy training. |

## 17. Monitoring and Review

- This policy is reviewed annually or upon material change in legislation, technology, or business operations.
- The Information Officer reports quarterly to the Board on data protection compliance, data subject requests received, and any breaches.
- Internal audits of data protection practices are conducted biannually.
- External audits aligned with ISO 27001/27701 certification cycles.

## 18. Regulatory References

| Regulation | Relevance |
|---|---|
| Protection of Personal Information Act 4 of 2013 (POPIA) | Primary data protection legislation. |
| Promotion of Access to Information Act 2 of 2000 (PAIA) | POPIA manual and access to information requests. |
| Financial Intelligence Centre Act 38 of 2001 (FICA) | KYC and record-keeping obligations. |
| Electronic Communications and Transactions Act 25 of 2002 (ECT Act) | Electronic transaction records and data messages. |
| Regulation of Interception of Communications Act 70 of 2002 (RICA) | SIM registration and communication data. |
| General Data Protection Regulation (EU) 2016/679 (GDPR) | Cross-border alignment and best practice. |
| ISO/IEC 27001:2022 | Information security management. |
| ISO/IEC 27701:2019 | Privacy information management. |

## 19. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Chief Compliance Officer | Initial policy creation. |

---

*This policy is classified as Confidential and is the property of MyMoolah (Pty) Ltd. Unauthorised reproduction or distribution is prohibited.*
