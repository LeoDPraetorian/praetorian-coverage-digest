# ATT&CK to D3FEND Mappings

Complete mappings from MITRE ATT&CK offensive techniques to D3FEND defensive countermeasures.

---

## Common ATT&CK Techniques with Defensive Controls

| ATT&CK Technique                  | Tactic            | Primary Defense                           | Secondary Defenses |
| --------------------------------- | ----------------- | ----------------------------------------- | ------------------ |
| T1059.001 (PowerShell)            | Execution         | D3-SCA (Script Content Analysis)          | D3-PSA, D3-EAL     |
| T1078 (Valid Accounts)            | Initial Access    | D3-MFAA (Multi-factor Authentication)     | D3-UA, D3-ACH      |
| T1190 (Exploit Public-Facing App) | Initial Access    | D3-ISVA (Inbound Session Volume Analysis) | D3-ITA, D3-NTA     |
| T1552.001 (Credentials in Files)  | Credential Access | D3-CH (Credential Hardening)              | D3-FA, D3-ECR      |
| T1552.005 (Cloud Metadata API)    | Credential Access | D3-NTA (Network Traffic Analysis)         | D3-NI, D3-RA       |
| T1530 (Data from Cloud Storage)   | Collection        | D3-RA (Resource Access Analysis)          | D3-ECR, D3-UA      |
| T1046 (Network Service Discovery) | Discovery         | D3-NI (Network Isolation)                 | D3-NTA, D3-FI      |
| T1562.008 (Disable Logs)          | Defense Evasion   | D3-SLA (System Init Config Analysis)      | D3-LGA, D3-IRA     |

---

## Cloud Security Defenses

| Vulnerability Pattern    | Primary D3FEND Defense               | ATT&CK Technique Defended         |
| ------------------------ | ------------------------------------ | --------------------------------- |
| Public S3 bucket         | D3-RA (Resource Access Analysis)     | T1530 (Data from Cloud Storage)   |
| IMDSv1 enabled           | D3-NTA (Network Traffic Analysis)    | T1552.005 (Cloud Metadata API)    |
| Overly permissive IAM    | D3-UA (User Account Permissions)     | T1078.004 (Valid Accounts: Cloud) |
| Missing encryption       | D3-ECR (Encrypt at Rest)             | T1530 (Data theft)                |
| CloudTrail disabled      | D3-SLA (System Init Config Analysis) | T1562.008 (Impair Defenses)       |
| Security group 0.0.0.0/0 | D3-NI (Network Isolation)            | T1046 (Network Service Discovery) |

---

## Network Security Defenses

| Vulnerability Pattern   | Primary D3FEND Defense                        | ATT&CK Technique Defended         |
| ----------------------- | --------------------------------------------- | --------------------------------- |
| Weak TLS version        | D3-NTCD (Network Traffic Community Deviation) | T1040 (Network Sniffing)          |
| Open RDP/SSH            | D3-NI (Network Isolation)                     | T1021 (Remote Services)           |
| Missing HSTS            | D3-DNSAL (DNS Allow Listing)                  | T1557 (Adversary-in-the-Middle)   |
| Self-signed certificate | D3-CA (Certificate Analysis)                  | T1573.002 (Asymmetric Crypto)     |
| Default SNMP community  | D3-ACH (Authentication Cache Hardening)       | T1552.001 (Unsecured Credentials) |

---

## Application Security Defenses

| Vulnerability Pattern | Primary D3FEND Defense                    | ATT&CK Technique Defended                 |
| --------------------- | ----------------------------------------- | ----------------------------------------- |
| SQL Injection         | D3-ISVA (Inbound Session Volume Analysis) | T1190 (Exploit Public-Facing Application) |
| XSS                   | D3-OCD (Outbound Connection Defense)      | T1189 (Drive-by Compromise)               |
| Command Injection     | D3-PSA (Process Spawn Analysis)           | T1059 (Command Interpreter)               |
| Path Traversal        | D3-FA (File Analysis)                     | T1083 (File and Directory Discovery)      |
| SSRF                  | D3-OTA (Outbound Traffic Analysis)        | T1090 (Proxy)                             |
| Deserialization       | D3-DA (Data Analysis)                     | T1203 (Exploitation for Client Execution) |

---

## Credential Security Defenses

| Vulnerability Pattern | Primary D3FEND Defense                | ATT&CK Technique Defended         |
| --------------------- | ------------------------------------- | --------------------------------- |
| Hardcoded password    | D3-CH (Credential Hardening)          | T1552.001 (Credentials in Files)  |
| Weak password policy  | D3-SUA (Strong Password Policy)       | T1110 (Brute Force)               |
| Missing MFA           | D3-MFAA (Multi-factor Authentication) | T1078 (Valid Accounts)            |
| Plaintext storage     | D3-ECR (Encrypt at Rest)              | T1552.001 (Unsecured Credentials) |
| Credentials in logs   | D3-LGA (Local File Permissions)       | T1552.004 (Private Keys in logs)  |

---

## High-Impact Defenses

Defenses that protect against multiple ATT&CK techniques:

| D3FEND Technique                      | Defends Against            | Impact Level |
| ------------------------------------- | -------------------------- | ------------ |
| D3-MFAA (Multi-factor Authentication) | T1078, T1110, T1078.004    | Very High    |
| D3-NI (Network Isolation)             | T1046, T1021, T1090, T1133 | Very High    |
| D3-ECR (Encrypt at Rest)              | T1530, T1552.001, T1005    | High         |
| D3-PSA (Process Spawn Analysis)       | T1059.\*, T1203, T1055     | High         |
| D3-UA (User Account Permissions)      | T1078, T1548, T1068        | High         |

**Recommendation:** Prioritize these techniques for maximum defensive coverage.

---

## Cost-Benefit Analysis

| Defense Category | Implementation Cost | Maintenance Cost | Effectiveness | Priority |
| ---------------- | ------------------- | ---------------- | ------------- | -------- |
| Harden           | Medium-High         | Low              | Very High     | 1st      |
| Detect           | Medium              | Medium           | High          | 2nd      |
| Isolate          | Low-Medium          | Low              | High          | 3rd      |
| Model            | Low                 | Low              | Medium        | 4th      |
| Deceive          | High                | High             | Medium        | 5th      |
| Evict            | Low                 | Medium           | Medium        | 6th      |

---

## Knowledge Gaps

D3FEND coverage has gaps in some areas:

| Area                                | Closest D3FEND Defense | Notes                                     |
| ----------------------------------- | ---------------------- | ----------------------------------------- |
| Serverless cold start attacks       | D3-NTA                 | No serverless-specific defenses           |
| GraphQL injection                   | D3-ISVA                | Generic API defense, not GraphQL-specific |
| Container escape via kernel         | D3-EI, D3-PI           | Limited container-specific defenses       |
| Supply chain attacks (dependencies) | D3-SAM                 | Software Analysis Model is generic        |

**When no specific D3FEND technique exists:** Use the closest generic technique and note the limitation in remediation guidance.

---

## External Resources

- [MITRE D3FEND Matrix](https://d3fend.mitre.org/matrix/)
- [D3FEND Offensive Technique Mappings](https://d3fend.mitre.org/offensive-technique/)
- [D3FEND Knowledge Graph](https://d3fend.mitre.org/ontologies/)
