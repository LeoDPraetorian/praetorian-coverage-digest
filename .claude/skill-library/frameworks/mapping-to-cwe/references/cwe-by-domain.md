# CWE by Domain Reference

**Domain-organized CWE lookup tables for Chariot capability types.**

## Cloud Security (AWS/Azure/GCP)

### Storage & Data Exposure

| Vulnerability     | Primary CWE | Secondary | Description                           |
| ----------------- | ----------- | --------- | ------------------------------------- |
| Public S3 bucket  | CWE-732     | CWE-284   | Incorrect permission assignment       |
| Public Azure blob | CWE-732     | CWE-284   | Storage container publicly accessible |
| Public GCS bucket | CWE-732     | CWE-284   | Google Cloud Storage exposure         |
| Unencrypted S3    | CWE-311     | -         | Missing encryption at rest            |
| Unencrypted EBS   | CWE-311     | -         | Disk volume unencrypted               |
| Unencrypted RDS   | CWE-311     | -         | Database storage unencrypted          |
| S3 with HTTP      | CWE-319     | CWE-311   | Cleartext transmission allowed        |

### Identity & Access Management

| Vulnerability               | Primary CWE | Secondary | Description                       |
| --------------------------- | ----------- | --------- | --------------------------------- |
| Overly permissive IAM       | CWE-269     | CWE-284   | Improper privilege management     |
| Wildcard IAM policy         | CWE-269     | CWE-732   | `*` in resource/action            |
| IAM user without MFA        | CWE-308     | CWE-287   | Single-factor authentication      |
| Root account usage          | CWE-250     | CWE-269   | Unnecessary privilege             |
| Cross-account trust         | CWE-284     | CWE-668   | Resource exposed to wrong account |
| Service account key exposed | CWE-798     | CWE-522   | Hard-coded/leaked credentials     |

### Network & Infrastructure

| Vulnerability            | Primary CWE | Secondary | Description                    |
| ------------------------ | ----------- | --------- | ------------------------------ |
| Security group 0.0.0.0/0 | CWE-284     | CWE-668   | Open to internet               |
| Public RDS instance      | CWE-284     | CWE-668   | Database publicly accessible   |
| Public EC2 instance      | CWE-668     | CWE-284   | Compute resource exposed       |
| VPC flow logs disabled   | CWE-778     | CWE-223   | Insufficient logging           |
| CloudTrail disabled      | CWE-778     | CWE-223   | Audit logging missing          |
| Default VPC in use       | CWE-1188    | -         | Insecure default configuration |

### Secrets & Configuration

| Vulnerability             | Primary CWE | Secondary | Description                |
| ------------------------- | ----------- | --------- | -------------------------- |
| Secrets in environment    | CWE-798     | CWE-522   | Hard-coded credentials     |
| Secrets in user data      | CWE-798     | CWE-538   | Exposed in launch config   |
| Exposed .env file         | CWE-538     | CWE-200   | Configuration file exposed |
| SSM parameter unencrypted | CWE-311     | CWE-312   | Secrets stored cleartext   |
| KMS key overly permissive | CWE-732     | CWE-269   | Encryption key access      |

---

## Network Security

### Protocol Weaknesses

| Vulnerability      | Primary CWE | Secondary | Description              |
| ------------------ | ----------- | --------- | ------------------------ |
| Telnet enabled     | CWE-319     | -         | Cleartext protocol       |
| FTP enabled        | CWE-319     | CWE-522   | Cleartext credentials    |
| HTTP (no TLS)      | CWE-319     | -         | Unencrypted web traffic  |
| SNMP v1/v2         | CWE-319     | CWE-326   | Weak/no encryption       |
| rsh/rlogin enabled | CWE-319     | CWE-287   | Legacy insecure protocol |

### TLS/SSL Issues

| Vulnerability       | Primary CWE | Secondary | Description                  |
| ------------------- | ----------- | --------- | ---------------------------- |
| TLS 1.0/1.1 enabled | CWE-326     | CWE-327   | Weak TLS version             |
| SSL 3.0 enabled     | CWE-327     | CWE-326   | Broken protocol              |
| Weak cipher suites  | CWE-326     | CWE-327   | Inadequate encryption        |
| Self-signed cert    | CWE-295     | -         | Certificate validation issue |
| Expired certificate | CWE-298     | CWE-295   | Certificate validity         |
| Invalid cert chain  | CWE-296     | CWE-295   | Chain of trust issue         |
| Missing HSTS        | CWE-319     | CWE-693   | Protocol downgrade risk      |

### Service Exposure

| Vulnerability           | Primary CWE | Secondary | Description                 |
| ----------------------- | ----------- | --------- | --------------------------- |
| SSH with password auth  | CWE-287     | CWE-521   | Weak authentication         |
| SSH default port        | CWE-200     | -         | Information disclosure      |
| RDP exposed             | CWE-668     | CWE-284   | Remote desktop public       |
| Database port exposed   | CWE-668     | CWE-284   | DB accessible from internet |
| Admin interface exposed | CWE-668     | CWE-425   | Management plane public     |
| Open DNS resolver       | CWE-406     | CWE-400   | Amplification risk          |

### Authentication Issues

| Vulnerability            | Primary CWE | Secondary | Description                  |
| ------------------------ | ----------- | --------- | ---------------------------- |
| Default credentials      | CWE-798     | CWE-1188  | Factory defaults unchanged   |
| SNMP default community   | CWE-798     | CWE-287   | "public"/"private" community |
| Anonymous access allowed | CWE-306     | CWE-287   | No authentication required   |
| Weak SSH keys            | CWE-326     | CWE-321   | Key length insufficient      |

---

## Web Application Security

### Injection (OWASP A03:2021)

| Vulnerability              | Primary CWE | Secondary | OWASP | Top 25 Rank |
| -------------------------- | ----------- | --------- | ----- | ----------- |
| SQL Injection              | CWE-89      | CWE-20    | A03   | #3          |
| Cross-site Scripting (XSS) | CWE-79      | CWE-20    | A03   | #1          |
| OS Command Injection       | CWE-78      | CWE-77    | A03   | #7          |
| LDAP Injection             | CWE-90      | CWE-20    | A03   | -           |
| XPath Injection            | CWE-91      | CWE-20    | A03   | -           |
| NoSQL Injection            | CWE-943     | CWE-89    | A03   | -           |
| Template Injection (SSTI)  | CWE-94      | CWE-1336  | A03   | #11         |

### Broken Access Control (OWASP A01:2021)

| Vulnerability           | Primary CWE | Secondary | OWASP | Top 25 Rank |
| ----------------------- | ----------- | --------- | ----- | ----------- |
| Missing Authorization   | CWE-862     | CWE-285   | A01   | #9          |
| Incorrect Authorization | CWE-863     | CWE-285   | A01   | #18         |
| IDOR                    | CWE-639     | CWE-284   | A01   | -           |
| Path Traversal          | CWE-22      | CWE-23    | A01   | #5          |
| Forced Browsing         | CWE-425     | CWE-284   | A01   | -           |
| CSRF                    | CWE-352     | -         | A01   | #4          |

### Authentication Failures (OWASP A07:2021)

| Vulnerability                  | Primary CWE | Secondary | OWASP | Top 25 Rank |
| ------------------------------ | ----------- | --------- | ----- | ----------- |
| Broken Authentication          | CWE-287     | -         | A07   | #14         |
| Missing Authentication         | CWE-306     | CWE-287   | A07   | #25         |
| Session Fixation               | CWE-384     | CWE-287   | A07   | -           |
| Weak Password Policy           | CWE-521     | CWE-287   | A07   | -           |
| Credential Stuffing vulnerable | CWE-307     | CWE-287   | A07   | -           |

### Other Web Vulnerabilities

| Vulnerability            | Primary CWE | Secondary | OWASP | Top 25 Rank |
| ------------------------ | ----------- | --------- | ----- | ----------- |
| SSRF                     | CWE-918     | CWE-441   | A10   | #19         |
| XXE                      | CWE-611     | CWE-776   | A05   | -           |
| Insecure Deserialization | CWE-502     | CWE-94    | A08   | #16         |
| Open Redirect            | CWE-601     | -         | A01   | -           |
| File Upload              | CWE-434     | CWE-94    | A04   | #10         |
| Missing Security Headers | CWE-693     | CWE-16    | A05   | -           |
| Information Disclosure   | CWE-200     | CWE-209   | A01   | #17         |

---

## Secrets & Credentials

### Hard-coded Credentials

| Vulnerability            | Primary CWE | Secondary | Description                |
| ------------------------ | ----------- | --------- | -------------------------- |
| Hard-coded password      | CWE-798     | CWE-259   | Password in source code    |
| Hard-coded API key       | CWE-798     | CWE-321   | API key embedded           |
| Hard-coded private key   | CWE-798     | CWE-321   | Crypto key in code         |
| Hard-coded DB connection | CWE-798     | CWE-259   | DB credentials embedded    |
| Secrets in git history   | CWE-798     | CWE-538   | Historical credential leak |

### Credential Storage

| Vulnerability               | Primary CWE | Secondary | Description              |
| --------------------------- | ----------- | --------- | ------------------------ |
| Plaintext password storage  | CWE-256     | CWE-522   | Unencrypted storage      |
| Weak password hash          | CWE-916     | CWE-328   | MD5, SHA1 without salt   |
| Reversible encryption       | CWE-261     | CWE-327   | Recoverable password     |
| Insufficient hashing rounds | CWE-916     | CWE-326   | Low bcrypt cost          |
| Missing salt                | CWE-916     | CWE-328   | Rainbow table vulnerable |

### Credential Transmission

| Vulnerability          | Primary CWE | Secondary | Description             |
| ---------------------- | ----------- | --------- | ----------------------- |
| Credentials over HTTP  | CWE-319     | CWE-522   | Cleartext login         |
| Basic auth over HTTP   | CWE-319     | CWE-522   | Base64 isn't encryption |
| API key in URL         | CWE-598     | CWE-200   | Logged in server logs   |
| Token in GET parameter | CWE-598     | CWE-200   | Leaks in referer        |

---

## Quick Lookup by CWE ID

| CWE     | Name                                 | Primary Domain       |
| ------- | ------------------------------------ | -------------------- |
| CWE-20  | Improper Input Validation            | Web (Pillar - avoid) |
| CWE-22  | Path Traversal                       | Web                  |
| CWE-78  | OS Command Injection                 | Web                  |
| CWE-79  | Cross-site Scripting                 | Web                  |
| CWE-89  | SQL Injection                        | Web                  |
| CWE-200 | Information Disclosure               | All                  |
| CWE-269 | Improper Privilege Management        | Cloud/IAM            |
| CWE-284 | Improper Access Control              | All (Pillar - avoid) |
| CWE-285 | Improper Authorization               | Web/Cloud            |
| CWE-287 | Improper Authentication              | All                  |
| CWE-306 | Missing Authentication               | Web/Network          |
| CWE-311 | Missing Encryption                   | Cloud/Network        |
| CWE-319 | Cleartext Transmission               | Network              |
| CWE-326 | Inadequate Encryption                | Network/Crypto       |
| CWE-352 | CSRF                                 | Web                  |
| CWE-522 | Insufficiently Protected Credentials | Secrets              |
| CWE-668 | Exposure to Wrong Sphere             | Cloud/Network        |
| CWE-732 | Incorrect Permission Assignment      | Cloud                |
| CWE-778 | Insufficient Logging                 | Cloud                |
| CWE-798 | Hard-coded Credentials               | Secrets              |
| CWE-862 | Missing Authorization                | Web                  |
| CWE-863 | Incorrect Authorization              | Web                  |
| CWE-918 | SSRF                                 | Web                  |
