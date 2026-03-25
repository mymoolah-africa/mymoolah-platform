# Law Enforcement & Regulatory Response Policy

| Field | Detail |
|---|---|
| **Policy Title** | Law Enforcement & Regulatory Response Policy |
| **Version** | 1.0 |
| **Effective Date** | March 2026 |
| **Next Review** | March 2027 |
| **Classification** | Confidential |
| **Owner** | Chief Compliance Officer / Information Officer |
| **Approved By** | Board of Directors, MyMoolah (Pty) Ltd |

---

## 1. Purpose

This policy establishes the procedures by which MyMoolah (Pty) Ltd ("MyMoolah") receives, evaluates, authorises, and responds to requests for information from law enforcement agencies, regulatory bodies, and judicial authorities. It ensures that responses are lawful, proportionate, and compliant with South African legislation, while protecting the rights of data subjects and preserving the integrity of MyMoolah's operations.

Failure to respond appropriately to lawful requests may expose MyMoolah to criminal liability, regulatory sanction, or reputational harm. Equally, improper or over-broad disclosure of customer data may violate the Protection of Personal Information Act 4 of 2013 ("POPIA") and breach fiduciary obligations.

## 2. Scope

This policy applies to:

- All requests for customer information, transaction data, or corporate records received from any law enforcement agency, regulatory body, court, or government authority, whether South African or foreign.
- All employees, contractors, and officers of MyMoolah who may receive, process, or respond to such requests.
- All data held across MyMoolah's systems: PostgreSQL databases, Google Cloud Storage, Redis caches, application logs, backups, and physical records.

This policy does not cover routine regulatory reporting (e.g., scheduled FICA returns to the Financial Intelligence Centre), which is addressed in the Anti-Money Laundering Policy.

## 3. Definitions

| Term | Definition |
|---|---|
| **Designated Officer** | An individual formally authorised by the Board to receive and respond to law enforcement and regulatory requests on behalf of MyMoolah. |
| **Legal Process** | A formal legal instrument compelling the production of information, including subpoenas, court orders, search warrants, and statutory directives. |
| **Voluntary Disclosure** | The provision of information to a law enforcement agency in the absence of compulsory legal process, permitted only under the emergency disclosure provisions of this policy. |
| **Section 205 Order** | A subpoena issued under Section 205 of the Criminal Procedure Act 51 of 1977 compelling a person to produce documents or give evidence. |
| **Section 29 Interview** | An interview conducted by the Financial Intelligence Centre under FICA S29 in connection with a suspected money laundering or terror financing offence. |
| **MLAT Request** | A request received through Mutual Legal Assistance Treaty channels from a foreign jurisdiction. |
| **Legal Hold** | A directive to preserve relevant data when legal proceedings or regulatory investigation are anticipated or pending (see Data Retention Policy, Section 7). |
| **Gag Order** | A judicial direction prohibiting the disclosure of the existence or contents of a request to the affected customer or any third party. |

## 4. Types of Requests

MyMoolah may receive the following categories of requests:

### 4.1 South African Law Enforcement
- **SAPS Subpoenas (Criminal Procedure Act S205)**: Requests from the South African Police Service for production of documents or records in connection with a criminal investigation.
- **Search Warrants (Criminal Procedure Act S21)**: Warrants authorising the search of premises and seizure of documents.
- **Section 252A Directions**: Trap and undercover operation authorisations.

### 4.2 Financial Intelligence Centre (FIC)
- **Section 27 Enquiries**: Requests for information in connection with money laundering or terrorist financing investigations.
- **Section 29 Interviews**: Compulsory interviews with designated employees.
- **Section 34 Freezing Orders**: Directives to freeze funds in customer accounts pending investigation.
- **Administrative Sanctions Proceedings**: Requests for records in connection with compliance enforcement.

### 4.3 South African Reserve Bank (SARB)
- **Regulatory Directives**: Instructions relating to payment system operations, Mojaloop participation, or prudential requirements.
- **Inspection Requests**: Requests for records during regulatory inspections.

### 4.4 Information Regulator
- **Assessment Notices**: Requests for information in connection with POPIA compliance assessments.
- **Investigation Requests**: Production orders in connection with complaints or own-initiative investigations.

### 4.5 Courts
- **Court Orders**: Orders issued by the High Court or Magistrate's Court compelling production of information.
- **Anton Piller Orders**: Ex parte orders for preservation and production of evidence.
- **Civil Subpoenas**: Subpoenas in civil proceedings requiring production of customer records.

### 4.6 Foreign Authorities
- **MLAT Requests**: Requests channelled through the Department of Justice and Constitutional Development under applicable Mutual Legal Assistance Treaties.
- **Foreign Regulatory Requests**: Requests from foreign financial regulators channelled through the SARB or FIC.

MyMoolah does not respond to direct requests from foreign law enforcement agencies. All foreign requests must be channelled through South African legal mechanisms or MLAT processes.

## 5. Designated Officers

### 5.1 Appointment
The Board of Directors appoints the following Designated Officers, who are the only persons authorised to receive, evaluate, and authorise responses to law enforcement and regulatory requests:

- **Primary**: Chief Compliance Officer
- **Alternate**: Information Officer
- **Escalation**: General Counsel (external, where engaged)

### 5.2 Restrictions
No employee, contractor, or officer other than a Designated Officer may:
- Acknowledge receipt of a law enforcement request to the requesting authority.
- Provide, promise, or disclose any customer information to any law enforcement or regulatory body.
- Confirm or deny the existence of a customer account or relationship.

Any employee who receives a request directly must immediately forward it to the Primary Designated Officer without responding to the requesting authority.

## 6. Request Handling Procedure

### 6.1 Procedure Flowchart

```
┌─────────────────────────────────────────────┐
│       REQUEST RECEIVED                      │
│  (Any channel: email, post, in-person,      │
│   phone, courier, fax)                      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  STEP 1: IMMEDIATE INTAKE                   │
│  • Log in Request Register (date, time,     │
│    source, reference number)                │
│  • Forward to Primary Designated Officer    │
│  • Do NOT respond substantively             │
│  • Do NOT disclose to customer              │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  STEP 2: VERIFY AUTHENTICITY                │
│  • Confirm identity of requesting officer   │
│  • Validate badge/service numbers           │
│  • Verify court stamp, case numbers         │
│  • Confirm jurisdiction and authority       │
│  • Contact issuing court/agency if doubtful │
└────────────────┬────────────────────────────┘
                 │
          ┌──────┴──────┐
          │             │
     Authentic    Not Authentic
          │             │
          ▼             ▼
┌──────────────┐  ┌──────────────────────────┐
│  Continue    │  │  DECLINE & LOG           │
│  to Step 3   │  │  • Notify requesting     │
│              │  │    party of concerns      │
│              │  │  • Escalate to legal      │
│              │  │    counsel if suspicious  │
│              │  │  • Report to SAPS if      │
│              │  │    fraudulent request     │
└──────┬───────┘  └──────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  STEP 3: LEGAL REVIEW                       │
│  • Identify legal basis for request         │
│  • Assess scope — is it proportionate?      │
│  • Determine if legal privilege applies     │
│  • Determine if gag order applies           │
│  • Consult external legal counsel if:       │
│    - Request is ambiguous                   │
│    - Scope appears overbroad               │
│    - Legal privilege may apply              │
│    - Request involves cross-border data     │
│  • Initiate legal hold if appropriate       │
└────────────────┬────────────────────────────┘
                 │
          ┌──────┴──────┐
          │             │
     Lawful &     Challenge/
     Proportionate  Narrow Scope
          │             │
          ▼             ▼
┌──────────────┐  ┌──────────────────────────┐
│  Continue    │  │  RESPOND TO AUTHORITY    │
│  to Step 4   │  │  • Request scope         │
│              │  │    narrowing in writing   │
│              │  │  • Object to overbroad   │
│              │  │    provisions             │
│              │  │  • Engage legal counsel   │
│              │  │  • Await revised order    │
└──────┬───────┘  └──────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  STEP 4: DATA EXTRACTION                    │
│  • Extract ONLY data within scope of order  │
│  • Two-person principle: one extracts,      │
│    one reviews before release               │
│  • Redact any data outside the order scope  │
│  • No additional data volunteered           │
│  • Preserve forensic integrity              │
│  • Document extraction methodology          │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  STEP 5: AUTHORISATION & DISCLOSURE         │
│  • Designated Officer reviews and approves  │
│  • Data provided in secure format           │
│  • Acknowledgement of receipt obtained      │
│  • Log in Request Register: data provided,  │
│    date, method, receiving officer          │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  STEP 6: CUSTOMER NOTIFICATION              │
│  (where legally permitted — see Section 9)  │
│  • Notify customer of disclosure unless     │
│    prohibited by gag order or law           │
│  • Provide general description of data      │
│    disclosed                                │
│  • Advise of right to legal counsel         │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  STEP 7: POST-DISCLOSURE                    │
│  • Update Request Register with outcome     │
│  • Retain copies of all correspondence      │
│  • Release legal hold when appropriate      │
│  • Quarterly summary report to Board        │
└─────────────────────────────────────────────┘
```

## 7. Verification of Request Authenticity

Before any information is disclosed, the Designated Officer shall verify:

- **Identity of the requesting officer**: Name, rank, badge number, unit, and contact details confirmed through independent channels (not contact details provided on the request itself).
- **Authority of the issuing body**: Confirmation that the court, magistrate, or authority has jurisdiction over the matter and over MyMoolah.
- **Validity of the instrument**: Court stamp, case number, magistrate's signature, date of issuance, and expiry date (where applicable) verified.
- **Scope of the request**: The information demanded is specified with reasonable particularity and is not overbroad.

Where doubt exists regarding the authenticity of a request, the Designated Officer shall contact the relevant court registry, police station commander, or regulatory authority directly to confirm the request before any data is produced.

Suspected fraudulent requests (e.g., forged court orders or impersonation of law enforcement) shall be reported to SAPS and logged as security incidents.

## 8. Scope Limitation

### 8.1 Principle of Minimality
MyMoolah shall provide only the information specifically described in the legal process. No additional, collateral, or volunteered information shall be disclosed.

### 8.2 Overbroad Requests
Where a request is assessed as overbroad (e.g., requesting "all records" for a customer without temporal or subject-matter limitation), the Designated Officer shall:
- Engage with the requesting authority in writing to request a narrower scope.
- Seek guidance from legal counsel on the obligation to comply with an overbroad order.
- If a court order cannot legally be narrowed, comply with the order as issued while noting the objection on the record.

### 8.3 Privileged Material
Material subject to legal professional privilege shall not be disclosed. Where privileged material is inadvertently included in a data extraction, it shall be immediately withdrawn, and the requesting authority shall be notified and directed to destroy any copies.

## 9. Customer Notification

### 9.1 General Obligation
Where MyMoolah discloses customer information pursuant to legal process, the affected customer shall be notified as soon as legally permissible. Notification shall include:
- A general description of the information disclosed (without compromising the investigation).
- The identity of the requesting authority and the legal basis for the request.
- The customer's right to seek legal advice.

### 9.2 Exceptions — No Notification
Customer notification shall not be provided where:
- A gag order or secrecy provision accompanies the request.
- Notification would constitute tipping off under FICA S29.
- Notification would obstruct the administration of justice.
- A court has specifically directed that notification be withheld.

### 9.3 Delayed Notification
Where notification is initially withheld due to a gag order or secrecy provision, the Designated Officer shall diarise a review date. When the restriction lapses or is lifted, the customer shall be notified at the earliest opportunity.

## 10. Emergency Disclosure

### 10.1 Conditions
MyMoolah may voluntarily disclose customer information to law enforcement without a formal legal instrument only where the Designated Officer has a reasonable and good-faith belief that:
- There is an imminent risk of death or serious physical injury to any person; or
- There is an imminent risk of significant financial loss to a customer due to ongoing criminal activity.

### 10.2 Safeguards
Emergency disclosures are subject to the following safeguards:
- Authorisation by the Primary Designated Officer (or the Alternate in the Primary's absence).
- Disclosure limited to the minimum information necessary to address the emergency.
- A formal legal instrument must be obtained from the requesting authority within 48 hours of the emergency disclosure.
- The disclosure is logged in the Request Register with full justification.
- The Board is notified within 24 hours.

## 11. Response Timelines

| Request Type | Statutory/Required Timeline | MyMoolah Internal Target |
|---|---|---|
| S205 Subpoena (SAPS) | As specified in the subpoena (typically 7–21 days) | Within 5 business days of verification |
| FIC S27 Enquiry | As specified by FIC (typically 5–10 business days) | Within 3 business days of verification |
| FIC S34 Freezing Order | Immediately upon receipt | Within 4 hours of receipt and verification |
| Court Order | As specified in the order | Within the timeframe specified, or 5 business days |
| SARB Directive | As specified | Within the timeframe specified |
| Information Regulator | As specified (typically 30 days) | Within 20 business days |
| MLAT Request | As channelled by DOJ&CD | Within the timeframe specified by DOJ&CD |
| Emergency Disclosure | Immediately | Within 4 hours of decision |

Where compliance within the specified timeframe is not feasible (e.g., due to the volume or complexity of data), the Designated Officer shall communicate with the requesting authority in writing, providing a revised timeline and reasons for the delay.

## 12. Record Keeping

### 12.1 Request Register
The Designated Officer maintains a Request Register recording every request received, regardless of whether it resulted in disclosure. The register includes:

- Unique reference number assigned by MyMoolah.
- Date and time of receipt.
- Identity of the requesting authority and officer.
- Legal instrument type and reference number.
- Summary of information requested.
- Outcome: complied, partially complied, challenged, or declined.
- Data provided: description, volume, format, and date of disclosure.
- Customer notification status and date.
- Legal hold status.
- Notes and any related correspondence.

### 12.2 Retention
The Request Register and all associated correspondence, court orders, and internal memoranda are retained for a minimum of 7 years from the date of the request, in accordance with the Data Retention Policy.

### 12.3 Confidentiality
The Request Register is classified as Strictly Confidential. Access is restricted to Designated Officers, the General Counsel, and the Board of Directors. The register is stored in an encrypted GCS bucket with restrictive IAM policies.

## 13. Reporting to the Board

The Designated Officer provides the Board of Directors with:

- **Quarterly Report**: Summary of all requests received, categorised by type, requesting authority, and outcome. Trends, concerns, and resource implications are highlighted.
- **Immediate Notification**: Any request that is assessed as materially significant, reputationally sensitive, or involving potential legal risk to MyMoolah is reported to the Board immediately upon receipt.
- **Annual Summary**: A comprehensive annual report including statistics, policy compliance assessment, and recommendations for policy updates.

## 14. Escalation to Legal Counsel

External legal counsel shall be engaged where:

- The legal basis for a request is unclear or contested.
- The request is overbroad and the requesting authority declines to narrow it.
- Compliance with a request may conflict with POPIA or other legal obligations.
- The request involves cross-border data or foreign authorities.
- Legal professional privilege may apply.
- The request involves a Designated Officer or senior management of MyMoolah.
- Criminal liability may arise from compliance or non-compliance.

Legal counsel's advice is documented and retained as part of the request file. Advice subject to legal privilege is marked accordingly and excluded from any disclosure.

## 15. Cross-Border Requests

### 15.1 Principle
MyMoolah does not respond to direct requests from foreign law enforcement agencies or regulatory bodies. All foreign requests must be channelled through:
- The South African Department of Justice and Constitutional Development under applicable Mutual Legal Assistance Treaties; or
- The relevant South African regulatory counterpart (e.g., SARB for foreign central bank requests, FIC for foreign financial intelligence unit requests).

### 15.2 Conflict of Laws
Where compliance with a foreign request would require MyMoolah to breach South African law (including POPIA S72 cross-border transfer provisions), MyMoolah shall decline the request and refer the requesting authority to the appropriate South African channel.

## 16. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| **Board of Directors** | Appointment of Designated Officers; oversight of law enforcement response programme; receipt of quarterly and annual reports. |
| **Primary Designated Officer (CCO)** | Receipt, evaluation, authorisation, and supervision of all law enforcement and regulatory responses. Maintenance of the Request Register. |
| **Alternate Designated Officer (IO)** | Acts in the capacity of the Primary Designated Officer during absence or where the Primary has a conflict of interest. |
| **General Counsel** | Legal review and advisory; engagement on contested, complex, or cross-border requests. |
| **Chief Technology Officer** | Data extraction and forensic integrity; technical implementation of legal holds. |
| **All Employees** | Immediate forwarding of any law enforcement contact to the Primary Designated Officer; no independent disclosure. |

## 17. Training and Awareness

- All employees receive annual training on this policy, including the obligation to forward requests and the prohibition on independent disclosure.
- Designated Officers receive specialised training on legal process recognition, evidence handling, and regulatory response.
- Training records are maintained and are subject to audit.

## 18. Monitoring and Review

- This policy is reviewed annually or upon material change in legislation, regulatory guidance, or business operations.
- The Request Register is audited biannually by internal audit.
- Post-incident reviews are conducted after any contested, challenged, or emergency disclosure.
- Policy amendments are approved by the Board and communicated to all employees.

## 19. Regulatory References

| Regulation | Relevance |
|---|---|
| Criminal Procedure Act 51 of 1977, Sections 205, 21 | Subpoenas, search warrants. |
| Financial Intelligence Centre Act 38 of 2001, Sections 27, 29, 34 | FIC enquiries, interviews, freezing orders. |
| Protection of Personal Information Act 4 of 2013 | Data subject rights, cross-border transfer restrictions. |
| Regulation of Interception of Communications Act 70 of 2002 (RICA) | Interception and communication data directives. |
| Electronic Communications and Transactions Act 25 of 2002 (ECT Act) | Electronic record production. |
| Prevention and Combating of Corrupt Activities Act 12 of 2004 | Duty to report corrupt activities. |
| Prevention of Organised Crime Act 121 of 1998 | Restraint and confiscation orders. |
| International Co-operation in Criminal Matters Act 75 of 1996 | MLAT framework. |
| Companies Act 71 of 2008, Section 30 | Corporate record obligations. |
| ISO/IEC 27001:2022, Annex A.5.5 | Contact with authorities. |

## 20. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | March 2026 | Chief Compliance Officer | Initial policy creation. |

---

*This policy is classified as Confidential and is the property of MyMoolah (Pty) Ltd. Unauthorised reproduction or distribution is prohibited.*
