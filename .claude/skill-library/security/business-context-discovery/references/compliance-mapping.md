# Compliance Requirements Mapping

**Comprehensive guide to regulatory requirements (SOC2, PCI-DSS, HIPAA, GDPR, CCPA) with security control mapping.**

## Overview of Key Regulations

| Regulation  | Jurisdiction           | Applicability         | Penalties                   | Audit Frequency    |
| ----------- | ---------------------- | --------------------- | --------------------------- | ------------------ |
| **SOC2**    | US (global acceptance) | Service organizations | N/A (customer trust)        | Annual             |
| **PCI-DSS** | Global                 | Card data handlers    | $5K-$100K/month + card loss | Annual             |
| **HIPAA**   | US                     | PHI handlers          | Up to $1.5M/year            | Ongoing HHS audits |
| **GDPR**    | EU                     | EU resident data      | Up to €20M or 4% revenue    | Ongoing DPA audits |
| **CCPA**    | California             | CA resident data      | Up to $7,500/violation      | AG enforcement     |

---

## SOC2 (Service Organization Control 2)

### Overview

**Purpose**: Demonstrate security controls for service organizations (SaaS, cloud providers, etc.)

**Governing Body**: AICPA (American Institute of CPAs)

**Types**:

- **Type I**: Controls designed appropriately at a point in time
- **Type II**: Controls operating effectively over time (6-12 months)

### Trust Service Criteria (TSC)

SOC2 is based on 5 trust service criteria:

#### 1. Security (CC - Common Criteria)

**CC6.1** - Logical and Physical Access Controls

- Identify and authenticate users
- Consider segregation of duties
- Restrict access to system resources

**CC6.2** - System Operations

- Manage system capacity
- Monitor system operation
- Manage system vulnerabilities

**CC6.3** - Change Management

- Authorize changes before implementation
- Test changes
- Track system changes

**CC6.6** - Logical and Physical Security Measures

- Restrict physical access
- Protect against environmental threats
- Configure infrastructure and software

**CC6.7** - Backup and Recovery

- Back up data and systems
- Test recovery procedures
- Manage encryption keys

**CC6.8** - Business Continuity

- Plan for business continuity and disaster recovery
- Test business continuity plan

#### 2. Availability (A)

- System uptime commitments
- Incident management
- Capacity planning
- Performance monitoring

#### 3. Processing Integrity (PI)

- Data accuracy and completeness
- Error detection and correction
- Processing controls

#### 4. Confidentiality (C)

- Data encryption at rest and in transit
- Access controls
- Data disposal

#### 5. Privacy (P)

- Notice and communication
- Choice and consent
- Collection and use of personal information

### Required Security Controls

| Control Area                 | Requirements                         | Evidence                                 |
| ---------------------------- | ------------------------------------ | ---------------------------------------- |
| **Access Control**           | MFA, least privilege, access reviews | Access logs, MFA config                  |
| **Change Management**        | Change approval, testing, rollback   | Change tickets, test results             |
| **Encryption**               | Data at rest and in transit          | Encryption configs, TLS certs            |
| **Logging**                  | Centralized logging, log retention   | Log aggregation config, retention policy |
| **Vulnerability Management** | Regular scanning, patch management   | Scan reports, patch schedules            |
| **Incident Response**        | IR plan, incident tracking           | IR runbooks, incident tickets            |
| **Vendor Management**        | Third-party risk assessment          | Vendor assessments, contracts            |
| **Employee Access**          | Background checks, security training | Training records, HR policies            |

### Audit Process

1. **Pre-audit preparation** (3-6 months)
2. **Readiness assessment** (optional)
3. **Audit fieldwork** (2-4 weeks)
4. **Report issuance** (2-4 weeks post-fieldwork)
5. **Annual re-audit** (Type II)

**Cost**: $20K-$100K+ depending on scope

---

## PCI-DSS (Payment Card Industry Data Security Standard)

### Overview

**Purpose**: Protect cardholder data

**Governing Body**: PCI Security Standards Council

**Merchant Levels** (based on annual transaction volume):

- Level 1: 6M+ transactions
- Level 2: 1M-6M transactions
- Level 3: 20K-1M e-commerce transactions
- Level 4: <20K transactions

### 12 Requirements (6 Control Objectives)

#### Build and Maintain a Secure Network

**1. Install and maintain firewall configuration**

- Document firewall rules
- Restrict inbound/outbound traffic
- Prohibit direct public access to cardholder data

**2. Do not use vendor-supplied defaults**

- Change default passwords
- Remove unnecessary accounts
- Disable unnecessary services

#### Protect Cardholder Data

**3. Protect stored cardholder data**

- Minimize data storage
- Render PAN (Primary Account Number) unreadable:
  - Encryption
  - Truncation
  - Tokenization
  - Hashing
- Never store sensitive authentication data (CVV, PIN)

**4. Encrypt transmission of cardholder data**

- Strong cryptography (TLS 1.2+)
- Never send PAN via unencrypted channels (email, SMS)
- Verify certificates

#### Maintain a Vulnerability Management Program

**5. Protect all systems from malware**

- Anti-virus on all systems
- Regular updates and scans
- Audit logs

**6. Develop and maintain secure systems and applications**

- Patch management process
- Secure development lifecycle
- Change control procedures
- Separate dev/test from production

#### Implement Strong Access Control Measures

**7. Restrict access by business need-to-know**

- Role-based access control (RBAC)
- Least privilege principle
- Default deny-all setting

**8. Identify and authenticate access**

- Unique ID for each user
- Two-factor authentication for remote access
- Two-factor for administrators

**9. Restrict physical access to cardholder data**

- Physical access controls
- Badge systems
- Video surveillance
- Visitor logs

#### Regularly Monitor and Test Networks

**10. Track and monitor all access to network resources and cardholder data**

- Audit trails for all access
- Log aggregation
- Daily log reviews
- Time synchronization

**11. Regularly test security systems and processes**

- Vulnerability scans (quarterly, after significant changes)
- Penetration testing (annually)
- IDS/IPS monitoring
- File integrity monitoring

#### Maintain an Information Security Policy

**12. Maintain policy addressing information security**

- Annual risk assessment
- Security awareness training
- Incident response plan
- Acceptable use policy

### Validation Methods

| Level       | Validation                                 | Frequency |
| ----------- | ------------------------------------------ | --------- |
| **Level 1** | On-site audit by QSA                       | Annual    |
| **Level 2** | Self-Assessment Questionnaire (SAQ) or QSA | Annual    |
| **Level 3** | SAQ                                        | Annual    |
| **Level 4** | SAQ                                        | Annual    |

**All Levels**: Quarterly network scans by ASV (Approved Scanning Vendor)

### Penalties

- **Monthly fines**: $5K-$100K until compliant
- **Card brand may revoke ability to process cards**
- **Reputational damage**
- **Increased transaction fees**

---

## HIPAA (Health Insurance Portability and Accountability Act)

### Overview

**Purpose**: Protect patient health information (PHI)

**Governing Body**: HHS Office for Civil Rights (OCR)

**Applicability**:

- **Covered Entities**: Healthcare providers, health plans, clearinghouses
- **Business Associates**: Vendors processing PHI on behalf of covered entities

### HIPAA Security Rule (45 CFR Part 164)

#### Administrative Safeguards

**§164.308(a)(1)** - Security Management Process

- Risk analysis (annual)
- Risk management
- Sanction policy
- Information system activity review

**§164.308(a)(3)** - Workforce Security

- Authorization and supervision
- Workforce clearance procedure
- Termination procedures

**§164.308(a)(4)** - Information Access Management

- Access authorization
- Access establishment and modification

**§164.308(a)(5)** - Security Awareness and Training

- Security reminders
- Protection from malicious software
- Log-in monitoring
- Password management

**§164.308(a)(6)** - Security Incident Procedures

- Incident response plan
- Incident documentation and reporting

**§164.308(a)(7)** - Contingency Plan

- Data backup plan
- Disaster recovery plan
- Emergency mode operation plan

**§164.308(a)(8)** - Business Associate Contracts

- Written BAA required
- BAA must require compliance

#### Physical Safeguards

**§164.310(a)(1)** - Facility Access Controls

- Contingency operations
- Facility security plan
- Access control and validation procedures

**§164.310(b)** - Workstation Use

- Proper use of workstations

**§164.310(c)** - Workstation Security

- Physical safeguards for workstations

**§164.310(d)** - Device and Media Controls

- Disposal procedures
- Media re-use procedures
- Data backup and storage

#### Technical Safeguards

**§164.312(a)(1)** - Access Control

- Unique user identification (R)
- Emergency access procedure (R)
- Automatic logoff (A)
- Encryption and decryption (A)

**§164.312(b)** - Audit Controls (R)

- Hardware, software, and procedural mechanisms to record and examine access

**§164.312(c)** - Integrity (A)

- Mechanism to authenticate PHI not altered or destroyed

**§164.312(d)** - Person or Entity Authentication (R)

- Verify identity before granting access

**§164.312(e)** - Transmission Security (A)

- Integrity controls
- Encryption

**(R) = Required, (A) = Addressable (required to assess, can document why not applicable)**

### Breach Notification Rule

**Breach Definition**: Unauthorized acquisition, access, use, or disclosure of PHI that compromises security or privacy

**Notification Requirements**:

1. **Individuals**: Within 60 days
2. **HHS (OCR)**: Within 60 days
3. **Media** (if ≥500 individuals in jurisdiction): Without unreasonable delay
4. **Annual report to HHS** (if <500 individuals)

### Penalties

| Violation Category              | Per Violation   | Annual Maximum |
| ------------------------------- | --------------- | -------------- |
| Unknowing                       | $100-$50,000    | $1.5M          |
| Reasonable cause                | $1,000-$50,000  | $1.5M          |
| Willful neglect (corrected)     | $10,000-$50,000 | $1.5M          |
| Willful neglect (not corrected) | $50,000         | $1.5M          |

**Criminal penalties** (rare): Up to 10 years imprisonment + fines

---

## GDPR (General Data Protection Regulation)

### Overview

**Purpose**: Protect personal data and privacy of EU residents

**Governing Body**: European Data Protection Board (EDPB) + national DPAs

**Applicability**: Organizations processing personal data of EU residents (regardless of organization location)

### Key Principles (Article 5)

1. **Lawfulness, fairness, transparency**
2. **Purpose limitation** - Specific, explicit purposes
3. **Data minimization** - Adequate, relevant, limited
4. **Accuracy** - Accurate and up-to-date
5. **Storage limitation** - No longer than necessary
6. **Integrity and confidentiality** - Appropriate security
7. **Accountability** - Demonstrate compliance

### Individual Rights

| Right                                           | Article    | Description                               |
| ----------------------------------------------- | ---------- | ----------------------------------------- |
| **Right to be informed**                        | Art. 13-14 | Transparency about data processing        |
| **Right of access**                             | Art. 15    | Confirm processing, access to data        |
| **Right to rectification**                      | Art. 16    | Correct inaccurate data                   |
| **Right to erasure**                            | Art. 17    | "Right to be forgotten"                   |
| **Right to restrict processing**                | Art. 18    | Limit how data is used                    |
| **Right to data portability**                   | Art. 20    | Receive data in machine-readable format   |
| **Right to object**                             | Art. 21    | Object to processing                      |
| **Rights related to automated decision-making** | Art. 22    | Not subject to solely automated decisions |

### Security Requirements (Article 32)

**Appropriate technical and organizational measures**:

- Pseudonymization and encryption
- Ability to ensure confidentiality, integrity, availability, resilience
- Ability to restore availability after incident
- Regular testing and evaluation of effectiveness

**Security measures should consider**:

- State of the art
- Costs of implementation
- Nature, scope, context, and purposes of processing
- Risk of varying likelihood and severity

### Data Breach Notification (Articles 33-34)

**Notification to DPA (Article 33)**:

- **Timeline**: Within 72 hours of becoming aware
- **Content**: Nature of breach, data subjects affected, consequences, measures taken

**Notification to individuals (Article 34)**:

- **When**: If breach likely to result in high risk to rights and freedoms
- **Timeline**: Without undue delay
- **Content**: Clear and plain language describing breach and measures

### Data Protection Impact Assessment (DPIA)

**Required when** (Article 35):

- Systematic and extensive profiling
- Large-scale processing of special category data
- Systematic monitoring of publicly accessible areas

**DPIA must include**:

- Description of processing operations and purposes
- Assessment of necessity and proportionality
- Assessment of risks
- Measures to address risks

### Data Protection Officer (DPO)

**Required when** (Article 37):

- Public authority
- Core activities involve large-scale systematic monitoring
- Core activities involve large-scale processing of special categories or criminal data

### Penalties (Article 83)

**Tier 1** (up to €10M or 2% annual global turnover):

- Processor obligations (Art. 28)
- Data protection by design/default (Art. 25)
- Security measures (Art. 32)

**Tier 2** (up to €20M or 4% annual global turnover):

- Basic principles (Art. 5)
- Legal basis (Art. 6)
- Individual rights (Art. 12-22)
- Cross-border data transfers (Art. 44-49)

---

## CCPA (California Consumer Privacy Act)

### Overview

**Purpose**: Protect personal information of California residents

**Governing Body**: California Attorney General

**Applicability** (any of):

- Gross annual revenue >$25M
- Buy, receive, sell, or share personal information of 50K+ consumers, households, or devices
- Derive 50%+ annual revenue from selling personal information

### Consumer Rights

| Right                           | Description                                | Response Time              |
| ------------------------------- | ------------------------------------------ | -------------------------- |
| **Right to know**               | What data is collected, used, shared, sold | 45 days (extendable to 90) |
| **Right to delete**             | Request deletion of personal information   | 45 days                    |
| **Right to opt-out**            | Opt-out of sale of personal information    | Immediate                  |
| **Right to non-discrimination** | No discrimination for exercising rights    | Immediate                  |

### Business Obligations

**Disclosure Requirements**:

- Privacy policy describing categories of data collected
- Notice at collection describing purposes
- "Do Not Sell My Personal Information" link (if selling data)

**Verification**:

- Verify identity of consumer making request
- Match information provided by consumer to existing data

**Service Providers**:

- Contracts required prohibiting retention, use, or disclosure except for specific business purpose

### Security Requirements

**Reasonable security procedures and practices** appropriate to nature of personal information

**Safe harbor**: If business implements and maintains reasonable security procedures and practices, not liable for breach if:

- Unauthorized third party breaches
- Information is encrypted

### Penalties

- **Civil penalties**: Up to $2,500 per violation ($7,500 for intentional violations)
- **Private right of action** (data breaches): $100-$750 per consumer per incident or actual damages (whichever is greater)

---

## Compliance Mapping to Security Controls

### Control Framework Mapping

| Compliance  | Access Control         | Encryption            | Logging                | Backups                | Incident Response      | Vendor Mgmt                   |
| ----------- | ---------------------- | --------------------- | ---------------------- | ---------------------- | ---------------------- | ----------------------------- |
| **SOC2**    | ✅ CC6.1               | ✅ CC6.7              | ✅ CC7.2               | ✅ CC6.7               | ✅ CC7.3               | ✅ CC9.2                      |
| **PCI-DSS** | ✅ Req 7-8             | ✅ Req 3-4            | ✅ Req 10              | ✅ Req 9               | ✅ Req 12.10           | ✅ Req 12.8                   |
| **HIPAA**   | ✅ §164.312(a)         | ✅ §164.312(a)(2)(iv) | ✅ §164.312(b)         | ✅ §164.308(a)(7)      | ✅ §164.308(a)(6)      | ✅ §164.308(b)(1)             |
| **GDPR**    | ✅ Art. 32             | ✅ Art. 32(1)(a)      | ✅ Art. 5(2)           | ✅ Art. 32(1)(c)       | ✅ Art. 33-34          | ✅ Art. 28                    |
| **CCPA**    | ✅ Reasonable security | ✅ Safe harbor        | ✅ Reasonable security | ✅ Reasonable security | ✅ Reasonable security | ✅ Service provider contracts |

---

## Output Format

Use this structure for `compliance-requirements.json`:

```json
{
  "assessment_date": "2025-12-18",
  "applicable_regulations": [
    {
      "name": "SOC2 Type II",
      "applicable": true,
      "current_status": "in_progress",
      "last_audit_date": "2024-06-01",
      "next_audit_date": "2025-06-01",
      "trust_service_criteria": ["security", "availability", "confidentiality"],
      "key_requirements": [
        "Multi-factor authentication",
        "Encryption at rest and in transit",
        "Annual penetration testing",
        "Vendor risk assessments",
        "Incident response plan"
      ],
      "gaps": ["Formal vendor management program", "Business continuity testing"]
    },
    {
      "name": "PCI-DSS",
      "applicable": true,
      "merchant_level": "Level 2",
      "current_status": "compliant",
      "last_validation": "2024-09-01",
      "next_validation": "2025-09-01",
      "validation_method": "SAQ D",
      "quarterly_scans": "ASV scans by TrustWave",
      "key_requirements": [
        "Cardholder data environment (CDE) segmentation",
        "PAN encryption/tokenization",
        "Quarterly vulnerability scans",
        "Annual penetration testing"
      ],
      "gaps": []
    }
  ],
  "contractual_requirements": [
    {
      "source": "Enterprise customer contracts",
      "requirements": [
        "Annual penetration testing with report",
        "SOC2 Type II report on request",
        "Data residency in US/EU",
        "30-day breach notification"
      ]
    }
  ],
  "compliance_roadmap": {
    "q1_2025": ["Complete SOC2 readiness assessment", "Implement vendor management program"],
    "q2_2025": ["SOC2 Type II audit", "HIPAA Security Risk Analysis"],
    "q3_2025": ["PCI-DSS validation", "Penetration testing"],
    "q4_2025": ["GDPR DPIA for new features"]
  }
}
```
