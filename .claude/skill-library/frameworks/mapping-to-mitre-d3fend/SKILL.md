---
name: mapping-to-mitre-d3fend
description: Use when recommending defensive countermeasures for detected vulnerabilities - provides D3FEND defensive technique mappings, ATT&CK-to-D3FEND tables, and remediation guidance for Chariot security findings
allowed-tools: Read
---

# Mapping to MITRE D3FEND Defensive Techniques

**Help capability developers recommend defensive countermeasures using MITRE D3FEND framework.**

> **MITRE D3FEND** provides a knowledge graph of cybersecurity countermeasure techniques mapped to offensive techniques in ATT&CK.

## When to Use

Use this skill when:

- Writing remediation guidance for Chariot capability findings
- Need to recommend specific defensive techniques for ATT&CK techniques
- Building security architecture recommendations
- Mapping findings through CWE → ATT&CK → D3FEND chain
- Prioritizing defensive controls based on threat landscape

## Critical Rules

### 1. Use D3FEND Technique IDs

**DO use standardized D3FEND IDs** (D3-XXX format) for defensive recommendations.

| ❌ Generic Advice  | ✅ D3FEND Technique                          | When                                 |
| ------------------ | -------------------------------------------- | ------------------------------------ |
| "Use EDR"          | D3-PSA (Process Spawn Analysis)              | Detecting malicious process creation |
| "Block PowerShell" | D3-EAL (Execution Application Allow Listing) | Restricting script execution         |
| "Monitor network"  | D3-NTA (Network Traffic Analysis)            | Network-based threat detection       |

### 2. Map ATT&CK Techniques to Defensive Controls

Use D3FEND to provide **offensive → defensive** mappings:

| ATT&CK Technique                  | Primary D3FEND Defense                    | Secondary Defenses            |
| --------------------------------- | ----------------------------------------- | ----------------------------- |
| T1059.001 (PowerShell)            | D3-SCA (Script Content Analysis)          | D3-EAL, D3-PSA                |
| T1552.001 (Credentials in Files)  | D3-CH (Credential Hardening)              | D3-FA (File Analysis)         |
| T1190 (Exploit Public-Facing App) | D3-ISVA (Inbound Session Volume Analysis) | D3-ITA (IPC Traffic Analysis) |

### 3. Use D3FEND Taxonomy Hierarchy

D3FEND organizes defenses into 6 top-level categories:

| Category    | Purpose                  | Example Techniques                                                 |
| ----------- | ------------------------ | ------------------------------------------------------------------ |
| **Model**   | Understand system/threat | D3-TA (Threat Analysis), D3-OA (Object Analysis)                   |
| **Harden**  | Reduce attack surface    | D3-CH (Credential Hardening), D3-SH (Software Hardening)           |
| **Detect**  | Identify threats         | D3-PSA (Process Spawn Analysis), D3-NTA (Network Traffic Analysis) |
| **Isolate** | Contain threats          | D3-NI (Network Isolation), D3-EI (Execution Isolation)             |
| **Deceive** | Misdirect adversaries    | D3-DT (Decoy Technology), D3-DTE (Decoy Target Environment)        |
| **Evict**   | Remove adversaries       | D3-AR (Account Removal), D3-PE (Process Eviction)                  |

---

## Quick Reference

### Cloud Security Defenses

| Vulnerability Pattern    | Primary D3FEND Defense               | ATT&CK Technique Defended         |
| ------------------------ | ------------------------------------ | --------------------------------- |
| Public S3 bucket         | D3-RA (Resource Access Analysis)     | T1530 (Data from Cloud Storage)   |
| IMDSv1 enabled           | D3-NTA (Network Traffic Analysis)    | T1552.005 (Cloud Metadata API)    |
| Overly permissive IAM    | D3-UA (User Account Permissions)     | T1078.004 (Valid Accounts: Cloud) |
| Missing encryption       | D3-ECR (Encrypt at Rest)             | T1530 (Data theft)                |
| CloudTrail disabled      | D3-SLA (System Init Config Analysis) | T1562.008 (Impair Defenses)       |
| Security group 0.0.0.0/0 | D3-NI (Network Isolation)            | T1046 (Network Service Discovery) |

### Network Security Defenses

| Vulnerability Pattern   | Primary D3FEND Defense                        | ATT&CK Technique Defended         |
| ----------------------- | --------------------------------------------- | --------------------------------- |
| Weak TLS version        | D3-NTCD (Network Traffic Community Deviation) | T1040 (Network Sniffing)          |
| Open RDP/SSH            | D3-NI (Network Isolation)                     | T1021 (Remote Services)           |
| Missing HSTS            | D3-DNSAL (DNS Allow Listing)                  | T1557 (Adversary-in-the-Middle)   |
| Self-signed certificate | D3-CA (Certificate Analysis)                  | T1573.002 (Asymmetric Crypto)     |
| Default SNMP community  | D3-ACH (Authentication Cache Hardening)       | T1552.001 (Unsecured Credentials) |

### Application Security Defenses

| Vulnerability Pattern | Primary D3FEND Defense                    | ATT&CK Technique Defended                 |
| --------------------- | ----------------------------------------- | ----------------------------------------- |
| SQL Injection         | D3-ISVA (Inbound Session Volume Analysis) | T1190 (Exploit Public-Facing Application) |
| XSS                   | D3-OCD (Outbound Connection Defense)      | T1189 (Drive-by Compromise)               |
| Command Injection     | D3-PSA (Process Spawn Analysis)           | T1059 (Command Interpreter)               |
| Path Traversal        | D3-FA (File Analysis)                     | T1083 (File and Directory Discovery)      |
| SSRF                  | D3-OTA (Outbound Traffic Analysis)        | T1090 (Proxy)                             |
| Deserialization       | D3-DA (Data Analysis)                     | T1203 (Exploitation for Client Execution) |

### Credential Security Defenses

| Vulnerability Pattern | Primary D3FEND Defense                | ATT&CK Technique Defended         |
| --------------------- | ------------------------------------- | --------------------------------- |
| Hardcoded password    | D3-CH (Credential Hardening)          | T1552.001 (Credentials in Files)  |
| Weak password policy  | D3-SUA (Strong Password Policy)       | T1110 (Brute Force)               |
| Missing MFA           | D3-MFAA (Multi-factor Authentication) | T1078 (Valid Accounts)            |
| Plaintext storage     | D3-ECR (Encrypt at Rest)              | T1552.001 (Unsecured Credentials) |
| Credentials in logs   | D3-LGA (Local File Permissions)       | T1552.004 (Private Keys in logs)  |

---

## D3FEND Taxonomy Overview

### Six Defense Categories

**1. Model** - Understand systems and threats

- D3-TA: Threat Analysis
- D3-OA: Object Analysis
- D3-SAM: Software Analysis Model
- D3-AM: Asset Model

**2. Harden** - Reduce attack surface

- D3-CH: Credential Hardening
- D3-SH: Software Hardening
- D3-UA: User Account Permissions
- D3-ECR: Encrypt at Rest
- D3-EIT: Encrypt in Transit

**3. Detect** - Identify threats

- D3-PSA: Process Spawn Analysis
- D3-NTA: Network Traffic Analysis
- D3-FA: File Analysis
- D3-SLA: System Init Config Analysis
- D3-ISVA: Inbound Session Volume Analysis

**4. Isolate** - Contain threats

- D3-NI: Network Isolation
- D3-EI: Execution Isolation
- D3-PI: Physical Isolation
- D3-ACH: Authentication Cache Hardening

**5. Deceive** - Misdirect adversaries

- D3-DT: Decoy Technology
- D3-DTE: Decoy Target Environment
- D3-DF: Decoy File

**6. Evict** - Remove adversaries

- D3-AR: Account Removal
- D3-PE: Process Eviction
- D3-FE: File Eviction

**See:** [references/d3fend-taxonomy.md](references/d3fend-taxonomy.md) for complete technique catalog.

---

## ATT&CK to D3FEND Mapping

### Common ATT&CK Techniques with Defensive Controls

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

**See:** [references/attack-to-d3fend-mapping.md](references/attack-to-d3fend-mapping.md) for complete mappings.

---

## Decision Trees

### "Which Defense Category Should I Recommend?"

```
What is the primary remediation goal?

├─ Prevent the vulnerability from existing?
│   └─ **Harden** (D3-CH, D3-SH, D3-UA, D3-ECR)

├─ Detect when an attack happens?
│   └─ **Detect** (D3-PSA, D3-NTA, D3-FA, D3-ISVA)

├─ Prevent lateral movement or damage?
│   └─ **Isolate** (D3-NI, D3-EI, D3-ACH)

├─ Understand the threat before choosing defense?
│   └─ **Model** (D3-TA, D3-OA, D3-SAM)

├─ Distract or mislead attackers?
│   └─ **Deceive** (D3-DT, D3-DTE, D3-DF)

└─ Remove attacker access?
    └─ **Evict** (D3-AR, D3-PE, D3-FE)
```

### "Which Specific Technique for Credential Security?"

```
Credential vulnerability detected:

Where are credentials stored?
├─ In source code/config files
│   └─ D3-CH (Credential Hardening) - Use secrets manager

├─ In memory/runtime
│   └─ D3-ACH (Authentication Cache Hardening) - Protected memory

├─ On disk unencrypted
│   └─ D3-ECR (Encrypt at Rest) - Full disk encryption

└─ Transmitted in cleartext
    └─ D3-EIT (Encrypt in Transit) - TLS/HTTPS
```

**See:** [references/decision-trees.md](references/decision-trees.md) for additional decision trees.

---

## Common Mistakes

### 1. Generic Advice Without D3FEND IDs

**Wrong:** "Use intrusion detection" (not standardized)

**Correct:** "Implement D3-ISVA (Inbound Session Volume Analysis) to detect exploit attempts"

### 2. Single Defense When Defense-in-Depth Needed

**Wrong:** Only recommending D3-MFAA (MFA) for T1078 (Valid Accounts)

**Correct:** Recommend multiple defenses:

- D3-MFAA (Multi-factor Authentication) - primary
- D3-UA (User Account Permissions) - least privilege
- D3-ACH (Authentication Cache Hardening) - session management

### 3. Confusing Detection with Prevention

| Vulnerability      | ❌ Wrong Category | ✅ Correct Category             |
| ------------------ | ----------------- | ------------------------------- |
| Hardcoded password | Detect (D3-FA)    | Harden (D3-CH)                  |
| Public S3 bucket   | Detect (D3-RA)    | Harden (D3-UA) + Detect (D3-RA) |
| Missing encryption | Detect (D3-NTA)   | Harden (D3-ECR)                 |

**Principle:** Always recommend **Harden** first (prevent), then **Detect** as backup.

### 4. Missing CWE → ATT&CK → D3FEND Chain

**Incomplete:** Finding tags CWE but not defensive techniques

**Complete Chain:**

```go
finding := &tabularium.Finding{
    Title:       "Hardcoded AWS Credentials",
    CWE:         "CWE-798",           // Hard-coded Credentials
    MITREAttack: []string{"T1552.001"}, // Credentials in Files
    D3FEND:      []string{"D3-CH"},     // Credential Hardening
    Remediation: "Store credentials in AWS Secrets Manager (D3-CH)",
}
```

---

## Integration with Capability Development

### Chariot Finding Pattern

```go
type Finding struct {
    Title       string   `json:"title"`
    Description string   `json:"description"`
    CWE         string   `json:"cwe"`
    MITREAttack []string `json:"mitre_attack"`
    D3FEND      []string `json:"d3fend"`         // NEW: Defensive techniques
    Remediation string   `json:"remediation"`    // Plain-text guidance
}

// Example: IMDSv1 finding with complete chain
finding := &tabularium.Finding{
    Title:       "EC2 Instance Metadata Service v1 Enabled",
    Description: "IMDSv1 allows SSRF attacks to steal IAM credentials",
    CWE:         "CWE-918",  // SSRF
    MITREAttack: []string{"T1552.005"},  // Cloud Metadata API
    D3FEND:      []string{"D3-NTA", "D3-NI"},  // Network Traffic Analysis + Network Isolation
    Remediation: "1. Enforce IMDSv2 (D3-NTA for detection, D3-NI to isolate metadata endpoint)\n" +
                 "2. Use IAM roles with least privilege (D3-UA)\n" +
                 "3. Monitor 169.254.169.254 access (D3-NTA)",
}
```

### Remediation Template

**Format for remediation guidance:**

```
1. [Primary Defense Category]: [Specific Action] (D3-XXX)
   - Implementation: [How to deploy]
   - Priority: Critical/High/Medium

2. [Secondary Defense Category]: [Specific Action] (D3-XXX)
   - Implementation: [How to deploy]
   - Priority: High/Medium

3. [Detection Category]: [Monitoring Action] (D3-XXX)
   - Implementation: [What to monitor]
   - Priority: Medium
```

**Example:**

```
Remediation for T1552.001 (Hardcoded Credentials):

1. Harden: Remove hardcoded credentials (D3-CH)
   - Implementation: Migrate to AWS Secrets Manager / HashiCorp Vault
   - Priority: Critical

2. Harden: Rotate compromised credentials (D3-CH)
   - Implementation: Revoke existing keys, generate new ones
   - Priority: Critical

3. Detect: Scan code repositories for secrets (D3-FA)
   - Implementation: Implement git-secrets / TruffleHog in CI/CD
   - Priority: High
```

### Validation Checklist

Before finalizing D3FEND recommendations:

1. ✅ Is defensive technique specific (D3-XXX ID, not generic)?
2. ✅ Does it directly counter the ATT&CK technique?
3. ✅ Is there a defense-in-depth approach (multiple defenses)?
4. ✅ Are defenses prioritized (Critical > High > Medium)?
5. ✅ Is implementation guidance provided?

---

## Defensive Technique Effectiveness

### High-Impact Defenses (Protect Multiple Techniques)

| D3FEND Technique                      | Defends Against            | Impact Level |
| ------------------------------------- | -------------------------- | ------------ |
| D3-MFAA (Multi-factor Authentication) | T1078, T1110, T1078.004    | Very High    |
| D3-NI (Network Isolation)             | T1046, T1021, T1090, T1133 | Very High    |
| D3-ECR (Encrypt at Rest)              | T1530, T1552.001, T1005    | High         |
| D3-PSA (Process Spawn Analysis)       | T1059.\*, T1203, T1055     | High         |
| D3-UA (User Account Permissions)      | T1078, T1548, T1068        | High         |

### Cost-Benefit Analysis

| Defense Category | Implementation Cost | Maintenance Cost | Effectiveness | Priority |
| ---------------- | ------------------- | ---------------- | ------------- | -------- |
| Harden           | Medium-High         | Low              | Very High     | 1st      |
| Detect           | Medium              | Medium           | High          | 2nd      |
| Isolate          | Low-Medium          | Low              | High          | 3rd      |
| Model            | Low                 | Low              | Medium        | 4th      |
| Deceive          | High                | High             | Medium        | 5th      |
| Evict            | Low                 | Medium           | Medium        | 6th      |

**Recommendation:** Always prioritize **Harden** defenses (D3-CH, D3-SH, D3-UA, D3-ECR) as they prevent exploitation. Use **Detect** defenses as backup.

---

## Knowledge Gaps

D3FEND coverage has gaps in some areas:

| Area                                | Closest D3FEND Defense | Notes                                     |
| ----------------------------------- | ---------------------- | ----------------------------------------- |
| Serverless cold start attacks       | D3-NTA                 | No serverless-specific defenses           |
| GraphQL injection                   | D3-ISVA                | Generic API defense, not GraphQL-specific |
| Container escape via kernel         | D3-EI, D3-PI           | Limited container-specific defenses       |
| Supply chain attacks (dependencies) | D3-SAM                 | Software Analysis Model is generic        |

When no specific D3FEND technique exists, use the closest generic technique and note the limitation.

---

## References

| Reference                                                             | Content                              |
| --------------------------------------------------------------------- | ------------------------------------ |
| [d3fend-taxonomy.md](references/d3fend-taxonomy.md)                   | Complete defensive technique catalog |
| [attack-to-d3fend-mapping.md](references/attack-to-d3fend-mapping.md) | ATT&CK → D3FEND mappings             |
| [decision-trees.md](references/decision-trees.md)                     | Defense selection decision trees     |
| [remediation-templates.md](references/remediation-templates.md)       | Remediation guidance templates       |

## External Sources

- [MITRE D3FEND](https://d3fend.mitre.org/)
- [D3FEND Knowledge Graph](https://d3fend.mitre.org/ontologies/)
- [ATT&CK to D3FEND Mappings](https://d3fend.mitre.org/offensive-technique/)

---

## Related Skills

| Skill                                  | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `mapping-to-mitre-attack`              | Map findings to offensive ATT&CK techniques |
| `mapping-to-cwe`                       | Map findings to CWE identifiers             |
| `calculating-cvss-vectors`             | Determine CVSS scores for findings          |
| `enforcing-go-capability-architecture` | Capability development patterns             |
