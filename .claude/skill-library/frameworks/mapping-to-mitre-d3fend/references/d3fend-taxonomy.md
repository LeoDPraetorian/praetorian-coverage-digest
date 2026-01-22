# D3FEND Taxonomy - Complete Defensive Technique Catalog

Complete catalog of MITRE D3FEND defensive techniques organized by category.

---

## Six Defense Categories

D3FEND organizes defensive countermeasures into 6 top-level categories based on their purpose in the defensive lifecycle.

### 1. Model - Understand systems and threats

**Purpose:** Build knowledge of system architecture and threat landscape before implementing defenses.

| Technique ID | Technique Name          | Description                                  |
| ------------ | ----------------------- | -------------------------------------------- |
| D3-TA        | Threat Analysis         | Analyze threat actors, TTPs, and motivations |
| D3-OA        | Object Analysis         | Examine files, executables, and artifacts    |
| D3-SAM       | Software Analysis Model | Model software behavior and dependencies     |
| D3-AM        | Asset Model             | Inventory and classify organizational assets |

**When to use:** Threat modeling, architecture design, pre-deployment planning

---

### 2. Harden - Reduce attack surface

**Purpose:** Prevent vulnerabilities from being exploitable.

| Technique ID | Technique Name           | Description                                        |
| ------------ | ------------------------ | -------------------------------------------------- |
| D3-CH        | Credential Hardening     | Secure credential storage and management           |
| D3-SH        | Software Hardening       | Remove unnecessary features, patch vulnerabilities |
| D3-UA        | User Account Permissions | Implement least privilege access controls          |
| D3-ECR       | Encrypt at Rest          | Encrypt stored data                                |
| D3-EIT       | Encrypt in Transit       | Encrypt network communications (TLS/HTTPS)         |
| D3-SUA       | Strong Password Policy   | Enforce password complexity and rotation           |
| D3-LGA       | Local File Permissions   | Restrict file system access                        |

**When to use:** Preventive controls, reducing initial attack surface

**Priority:** 1st - Most effective defense (prevent exploitation)

---

### 3. Detect - Identify threats

**Purpose:** Identify malicious activity in progress.

| Technique ID | Technique Name                      | Description                                   |
| ------------ | ----------------------------------- | --------------------------------------------- |
| D3-PSA       | Process Spawn Analysis              | Monitor process creation for anomalies        |
| D3-NTA       | Network Traffic Analysis            | Analyze network flows for threats             |
| D3-FA        | File Analysis                       | Inspect files for malicious content           |
| D3-SLA       | System Init Config Analysis         | Monitor system configuration changes          |
| D3-ISVA      | Inbound Session Volume Analysis     | Detect abnormal connection patterns           |
| D3-SCA       | Script Content Analysis             | Analyze script content for malicious behavior |
| D3-OTA       | Outbound Traffic Analysis           | Monitor egress traffic for data exfiltration  |
| D3-OCD       | Outbound Connection Defense         | Block unauthorized outbound connections       |
| D3-CA        | Certificate Analysis                | Validate TLS/SSL certificates                 |
| D3-RA        | Resource Access Analysis            | Monitor access to sensitive resources         |
| D3-ITA       | IPC Traffic Analysis                | Analyze inter-process communications          |
| D3-DA        | Data Analysis                       | Inspect data patterns for anomalies           |
| D3-NTCD      | Network Traffic Community Deviation | Detect unusual protocol usage                 |
| D3-DNSAL     | DNS Allow Listing                   | Validate DNS requests against allowlist       |

**When to use:** Detection engineering, SOC operations, threat hunting

**Priority:** 2nd - Backup when hardening isn't sufficient

---

### 4. Isolate - Contain threats

**Purpose:** Prevent lateral movement and limit blast radius.

| Technique ID | Technique Name                 | Description                                    |
| ------------ | ------------------------------ | ---------------------------------------------- |
| D3-NI        | Network Isolation              | Segment networks to prevent lateral movement   |
| D3-EI        | Execution Isolation            | Sandbox or containerize execution environments |
| D3-PI        | Physical Isolation             | Air-gap critical systems                       |
| D3-ACH       | Authentication Cache Hardening | Protect authentication tokens and sessions     |
| D3-FI        | File Isolation                 | Isolate untrusted files (quarantine)           |

**When to use:** Zero-trust architecture, incident containment, high-security environments

**Priority:** 3rd - Limit damage after detection

---

### 5. Deceive - Misdirect adversaries

**Purpose:** Create false targets to detect and slow attackers.

| Technique ID | Technique Name           | Description                        |
| ------------ | ------------------------ | ---------------------------------- |
| D3-DT        | Decoy Technology         | Deploy honeypots and honeytokens   |
| D3-DTE       | Decoy Target Environment | Create realistic fake environments |
| D3-DF        | Decoy File               | Plant fake sensitive files         |

**When to use:** Advanced threat detection, threat intelligence gathering, attacker profiling

**Priority:** 5th - Specialized use cases

---

### 6. Evict - Remove adversaries

**Purpose:** Terminate adversary access and persistence.

| Technique ID | Technique Name             | Description                       |
| ------------ | -------------------------- | --------------------------------- |
| D3-AR        | Account Removal            | Disable compromised accounts      |
| D3-PE        | Process Eviction           | Terminate malicious processes     |
| D3-FE        | File Eviction              | Remove malicious files            |
| D3-IRA       | Incident Response Analysis | Systematic incident investigation |

**When to use:** Incident response, remediation, recovery operations

**Priority:** 6th - Post-incident recovery

---

## Technique Relationships

### Defense-in-Depth Layering

D3FEND techniques are designed to layer:

```
Layer 1: Harden (Prevent)
    └─ D3-CH, D3-SH, D3-UA, D3-ECR
        ↓ (If bypass occurs)
Layer 2: Detect (Identify)
    └─ D3-PSA, D3-NTA, D3-FA, D3-ISVA
        ↓ (If detected)
Layer 3: Isolate (Contain)
    └─ D3-NI, D3-EI, D3-ACH
        ↓ (After containment)
Layer 4: Evict (Remove)
    └─ D3-AR, D3-PE, D3-FE
```

### Complementary Techniques

Some D3FEND techniques work best in combination:

| Primary Technique               | Complementary Techniques | Use Case                            |
| ------------------------------- | ------------------------ | ----------------------------------- |
| D3-CH (Credential Hardening)    | D3-MFAA, D3-ECR, D3-FA   | Comprehensive credential protection |
| D3-NI (Network Isolation)       | D3-NTA, D3-ISVA          | Segmentation with monitoring        |
| D3-PSA (Process Spawn Analysis) | D3-EAL, D3-SCA           | Process control with allow listing  |
| D3-ECR (Encrypt at Rest)        | D3-UA, D3-LGA            | Data protection with access control |

---

## External Resources

- [MITRE D3FEND Official Site](https://d3fend.mitre.org/)
- [D3FEND Knowledge Graph](https://d3fend.mitre.org/ontologies/)
- [D3FEND Matrix](https://d3fend.mitre.org/matrix/)
