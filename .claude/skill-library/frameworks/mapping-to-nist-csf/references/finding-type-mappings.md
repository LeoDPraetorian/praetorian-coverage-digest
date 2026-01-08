# Finding Type to NIST CSF 2.0 Mappings

**Comprehensive vulnerability and misconfiguration mappings to NIST CSF 2.0 categories and subcategories.**

This reference provides detailed mapping tables for common security findings across cloud, network, web application, vulnerability management, identity/access management, and cryptography domains.

---

## Cloud Security (AWS/Azure/GCP)

| Vulnerability Pattern               | CSF Category | Subcategory (if specific)      | Notes                         |
| ----------------------------------- | ------------ | ------------------------------ | ----------------------------- |
| Public S3/Storage bucket            | PR.DS        | PR.DS-05 (Leak protection)     | Data exposure risk            |
| IMDSv1 enabled (metadata SSRF)      | PR.AC        | PR.AC-03 (Remote access)       | Credential theft vector       |
| Overly permissive IAM policy        | PR.AC        | PR.AC-04 (Least privilege)     | Excessive permissions         |
| Missing MFA on privileged account   | PR.AC        | PR.AC-07 (Auth/credentials)    | Weak authentication           |
| Exposed secrets in environment vars | PR.DS        | PR.DS-08 (Integrity checking)  | Secrets management failure    |
| Security group allows 0.0.0.0/0     | PR.AC        | PR.AC-05 (Network segregation) | Network exposure              |
| CloudTrail/logging disabled         | DE.CM        | DE.CM-01 (Network monitoring)  | Blind spot for detection      |
| Snapshot shared publicly            | PR.DS        | PR.DS-05 (Leak protection)     | Data exposure                 |
| Unencrypted storage                 | PR.DS        | PR.DS-01 (Data at rest)        | Encryption missing            |
| Lambda with admin privileges        | PR.AC        | PR.AC-04 (Least privilege)     | Overprivileged function       |
| ECS/EKS secrets in plaintext        | PR.DS        | PR.DS-02 (Data in transit)     | Container secrets exposure    |
| Public RDS snapshot                 | PR.DS        | PR.DS-05 (Leak protection)     | Database exposure             |
| AWS Config disabled                 | GV.PO        | GV.PO-01 (Org policy)          | Compliance validation missing |
| GuardDuty disabled                  | DE.AE        | DE.AE-01 (Baseline)            | Threat detection disabled     |

---

## Network Security

| Vulnerability Pattern          | CSF Category | Subcategory (if specific)     | Notes                    |
| ------------------------------ | ------------ | ----------------------------- | ------------------------ |
| SSH with password auth enabled | PR.AC        | PR.AC-07 (Auth/credentials)   | Weak authentication      |
| Telnet enabled                 | PR.DS        | PR.DS-02 (Data in transit)    | Cleartext protocol       |
| Weak TLS version (< 1.2)       | PR.DS        | PR.DS-02 (Data in transit)    | Outdated encryption      |
| Open DNS resolver              | PR.IP        | PR.IP-01 (Baseline config)    | DoS amplification vector |
| Exposed RDP to internet        | PR.AC        | PR.AC-03 (Remote access)      | Attack surface exposure  |
| Default SNMP community string  | PR.AC        | PR.AC-07 (Auth/credentials)   | Default credentials      |
| Missing HSTS                   | PR.DS        | PR.DS-02 (Data in transit)    | HTTP downgrade risk      |
| Self-signed certificate        | PR.DS        | PR.DS-08 (Integrity checking) | Trust validation failure |
| Open NTP server                | PR.IP        | PR.IP-01 (Baseline config)    | DDoS amplification       |
| SMBv1 enabled                  | PR.IP        | PR.IP-12 (Vuln remediation)   | Known vulnerabilities    |

---

## Web Application Security

| Vulnerability Pattern        | CSF Category | Subcategory (if specific)    | Notes                      |
| ---------------------------- | ------------ | ---------------------------- | -------------------------- |
| SQL Injection                | PR.DS        | PR.DS-08 (Integrity check)   | Input validation failure   |
| Cross-Site Scripting (XSS)   | PR.DS        | PR.DS-08 (Integrity check)   | Output encoding failure    |
| Command Injection            | PR.AC        | PR.AC-04 (Least privilege)   | Execution control failure  |
| Path Traversal               | PR.AC        | PR.AC-04 (Least privilege)   | File system access control |
| SSRF                         | PR.AC        | PR.AC-05 (Network segregate) | Internal network access    |
| Insecure Deserialization     | PR.DS        | PR.DS-08 (Integrity check)   | Object validation failure  |
| Missing Authentication       | PR.AC        | PR.AC-01 (Identities/creds)  | Authentication bypass      |
| Missing Authorization (IDOR) | PR.AC        | PR.AC-04 (Least privilege)   | Authorization bypass       |
| Open Redirect                | PR.DS        | PR.DS-08 (Integrity check)   | URL validation failure     |
| XXE                          | PR.DS        | PR.DS-08 (Integrity check)   | XML parsing vulnerability  |
| CSRF                         | PR.AC        | PR.AC-07 (Auth/credentials)  | Session token validation   |
| Insecure direct object ref   | PR.AC        | PR.AC-04 (Least privilege)   | Object-level authorization |

---

## Vulnerability Management

| Vulnerability Pattern         | CSF Category | Subcategory (if specific)     | Notes                       |
| ----------------------------- | ------------ | ----------------------------- | --------------------------- |
| Unpatched CVE (Critical)      | PR.IP        | PR.IP-12 (Vuln remediation)   | Patch management failure    |
| End-of-life software          | PR.IP        | PR.IP-12 (Vuln remediation)   | Unsupported software risk   |
| Known exploited vulnerability | RS.MI        | RS.MI-01 (Vuln contained)     | Active exploitation risk    |
| Missing security updates      | PR.IP        | PR.IP-12 (Vuln remediation)   | Patch lag                   |
| Vulnerable dependency         | GV.SC        | GV.SC-03 (3rd party delivery) | Supply chain risk           |
| Outdated container image      | PR.IP        | PR.IP-12 (Vuln remediation)   | Container security          |
| CVE with CVSS >= 9.0          | ID.RA        | ID.RA-01 (Vuln ID)            | High-severity vulnerability |
| Zero-day vulnerability        | RS.AN        | RS.AN-05 (Incident processes) | Emerging threat response    |

---

## Identity & Access Management

| Vulnerability Pattern         | CSF Category | Subcategory (if specific)     | Notes                    |
| ----------------------------- | ------------ | ----------------------------- | ------------------------ |
| No MFA enabled                | PR.AC        | PR.AC-07 (Auth/credentials)   | Weak authentication      |
| Shared credentials            | PR.AC        | PR.AC-01 (Identities/creds)   | Accountability failure   |
| Overprivileged service acct   | PR.AC        | PR.AC-04 (Least privilege)    | Excessive permissions    |
| Stale user accounts           | PR.AC        | PR.AC-02 (Physical access)    | Access lifecycle failure |
| Weak password policy          | PR.AC        | PR.AC-07 (Auth/credentials)   | Credential strength      |
| No session timeout            | PR.AC        | PR.AC-07 (Auth/credentials)   | Session management       |
| Privileged account no logging | DE.CM        | DE.CM-03 (Personnel activity) | Audit trail gap          |
| API keys in code              | PR.DS        | PR.DS-08 (Integrity check)    | Secrets management       |

---

## Cryptography & Data Protection

| Vulnerability Pattern       | CSF Category | Subcategory (if specific)  | Notes                      |
| --------------------------- | ------------ | -------------------------- | -------------------------- |
| Unencrypted database        | PR.DS        | PR.DS-01 (Data at rest)    | Data-at-rest encryption    |
| Unencrypted network traffic | PR.DS        | PR.DS-02 (Data in transit) | Data-in-transit encryption |
| Weak cipher suite           | PR.DS        | PR.DS-02 (Data in transit) | Cryptographic weakness     |
| No key rotation             | PR.DS        | PR.DS-08 (Integrity check) | Key management failure     |
| Hard-coded encryption key   | PR.DS        | PR.DS-08 (Integrity check) | Key storage failure        |
| MD5/SHA-1 hashing           | PR.DS        | PR.DS-08 (Integrity check) | Weak hashing algorithm     |
| Plaintext PII storage       | PR.DS        | PR.DS-01 (Data at rest)    | Data protection failure    |
| Backup not encrypted        | PR.DS        | PR.DS-01 (Data at rest)    | Backup security            |

---

## Usage Guidelines

### Mapping Process

1. **Identify the finding type** from your security tool (scanner, SIEM, assessment)
2. **Look up the primary CSF category** in the tables above
3. **Use the specific subcategory** if your tool provides detailed context
4. **Tag the finding** in your compliance dashboard or ticketing system
5. **Cross-reference with other frameworks** (MITRE ATT&CK, CWE) using paired skills

### Primary vs. Supporting Categories

- **Primary Category**: Where the finding is discovered/detected (usually ID.RA for scanners)
- **Supporting Category**: Where the control should be implemented to remediate (PR.*, DE.*)

**Example:**
- Finding: "Unpatched CVE-2024-1234"
- Primary: ID.RA-01 (Vulnerability identification via scanner)
- Supporting: PR.IP-12 (Patch management to remediate)

### Chariot Platform Integration

When tagging findings in Chariot capabilities:

```go
finding := &Finding{
    Title: "Public S3 Bucket Detected",
    CSFFunction: "PR",
    CSFCategory: "PR.DS",
    CSFSubcategory: "PR.DS-05",
    Description: "S3 bucket allows public read access",
}
```

---

## Official Sources

- **NIST CSF 2.0**: https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf
- **Subcategory definitions**: See [subcategory-reference.md](subcategory-reference.md)
- **Research synthesis**: `.claude/.output/research/2026-01-07-193928-nist-csf-2-0/SYNTHESIS.md`
