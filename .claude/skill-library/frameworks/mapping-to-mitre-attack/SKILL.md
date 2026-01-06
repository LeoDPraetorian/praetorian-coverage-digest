---
name: mapping-to-mitre-attack
description: Use when tagging security findings with MITRE ATT&CK techniques during capability development - provides tactic/technique lookup, decision trees, and detection-to-TTP mappings for threat intelligence correlation
allowed-tools: Read
---

# Mapping Findings to MITRE ATT&CK

**Help capability developers map security findings to MITRE ATT&CK techniques for threat intelligence context and adversary TTP correlation.**

> **MITRE ATT&CK v15** (October 2024) contains **14 tactics** and **200+ techniques** across Enterprise, Cloud, and ICS matrices.

## When to Use

Use this skill when:

- Writing Nebula/Diocletian/Janus capabilities that detect vulnerabilities
- Tagging findings with ATT&CK technique IDs for threat correlation
- Need to understand which tactic (TA####) or technique (T####) applies
- Building threat intelligence mappings for security findings
- Mapping detection logic to adversary tactics, techniques, and procedures (TTPs)

## Critical Rules

### 1. Use Technique IDs, Not Tactic IDs

**DO NOT use Tactic IDs** (TA0001-TA0043) as primary tags. They are too generic.

| ❌ Avoid (Tactic) | ✅ Use Instead (Technique) | When                 |
| ----------------- | -------------------------- | -------------------- |
| TA0006            | T1552, T1555, T1056        | Credential Access    |
| TA0010            | T1530, T1567, T1048        | Exfiltration         |
| TA0005            | T1548, T1068, T1078        | Privilege Escalation |

### 2. Prefer Sub-Techniques When Applicable

Use sub-techniques (T####.###) for precision when you know the specific method:

| Generic Technique           | Specific Sub-Technique         | Use When             |
| --------------------------- | ------------------------------ | -------------------- |
| T1059 (Command Interpreter) | T1059.001 (PowerShell)         | PowerShell execution |
| T1078 (Valid Accounts)      | T1078.004 (Cloud Accounts)     | Cloud IAM abuse      |
| T1552 (Credentials)         | T1552.005 (Cloud Metadata API) | IMDSv1 exploitation  |

### 3. Cloud Matrix vs Enterprise Matrix

| Matrix       | Use For                      | Technique Range           |
| ------------ | ---------------------------- | ------------------------- |
| Enterprise   | On-prem, endpoints, networks | Most T#### techniques     |
| Cloud (IaaS) | AWS, Azure, GCP findings     | Cloud-specific techniques |
| ICS          | Industrial control systems   | ICS-specific techniques   |

**Many cloud findings use Enterprise techniques.** The Cloud matrix is a filtered view, not separate numbering.

---

## Quick Reference

### Cloud Security (AWS/Azure/GCP)

| Vulnerability Pattern               | ATT&CK Technique | Tactic               | Notes                                 |
| ----------------------------------- | ---------------- | -------------------- | ------------------------------------- |
| Public S3/Storage bucket            | T1530            | Collection           | Data from Cloud Storage Object        |
| IMDSv1 enabled (metadata SSRF)      | T1552.005        | Credential Access    | Unsecured Credentials: Cloud Metadata |
| Overly permissive IAM policy        | T1078.004        | Initial Access       | Valid Accounts: Cloud Accounts        |
| Missing MFA on privileged account   | T1078.004        | Initial Access       | Cloud account without MFA             |
| Exposed secrets in environment vars | T1552.001        | Credential Access    | Credentials in Files                  |
| Security group allows 0.0.0.0/0     | T1046            | Discovery            | Network Service Discovery             |
| CloudTrail/logging disabled         | T1562.008        | Defense Evasion      | Impair Defenses: Disable Logs         |
| Snapshot shared publicly            | T1537            | Collection           | Transfer Data to Cloud Account        |
| Unencrypted storage                 | T1530            | Collection           | Facilitates data theft                |
| Lambda with admin privileges        | T1078.004        | Privilege Escalation | Excessive cloud permissions           |

### Network Security

| Vulnerability Pattern          | ATT&CK Technique | Tactic            | Notes                          |
| ------------------------------ | ---------------- | ----------------- | ------------------------------ |
| SSH with password auth enabled | T1110.001        | Credential Access | Brute Force: Password Guessing |
| Telnet enabled                 | T1040            | Credential Access | Network Sniffing (cleartext)   |
| Weak TLS version (< 1.2)       | T1040            | Credential Access | Enables traffic interception   |
| Open DNS resolver              | T1498            | Impact            | Network DoS amplification      |
| Exposed RDP to internet        | T1021.001        | Lateral Movement  | Remote Services: RDP           |
| Default SNMP community string  | T1552.001        | Credential Access | Default credentials            |
| Missing HSTS                   | T1557            | Credential Access | MitM: Adversary-in-the-Middle  |
| Self-signed certificate        | T1573.002        | Command & Control | Asymmetric Crypto weakened     |

### Web Application Security

| Vulnerability Pattern        | ATT&CK Technique | Tactic            | Notes                             |
| ---------------------------- | ---------------- | ----------------- | --------------------------------- |
| SQL Injection                | T1190            | Initial Access    | Exploit Public-Facing Application |
| Cross-Site Scripting (XSS)   | T1189            | Initial Access    | Drive-by Compromise               |
| Command Injection            | T1059            | Execution         | Command and Scripting Interpreter |
| Path Traversal               | T1083            | Discovery         | File and Directory Discovery      |
| SSRF                         | T1090            | Command & Control | Proxy for internal access         |
| Insecure Deserialization     | T1203            | Execution         | Exploitation for Client Execution |
| Missing Authentication       | T1190            | Initial Access    | Unauthenticated access            |
| Missing Authorization (IDOR) | T1087            | Discovery         | Account Discovery                 |
| Open Redirect                | T1566.002        | Initial Access    | Phishing: Spearphishing Link      |
| XXE                          | T1552.001        | Credential Access | Read sensitive files              |

### Secrets and Credentials

| Vulnerability Pattern         | ATT&CK Technique | Tactic            | Notes                      |
| ----------------------------- | ---------------- | ----------------- | -------------------------- |
| Hardcoded password in code    | T1552.001        | Credential Access | Credentials in Files       |
| Hardcoded API key             | T1552.001        | Credential Access | API keys in source         |
| Exposed .env file             | T1552.001        | Credential Access | Config file exposure       |
| Secrets in Git history        | T1552.001        | Credential Access | Historical credential leak |
| Plaintext password storage    | T1552.001        | Credential Access | Unprotected credentials    |
| Weak password policy          | T1110            | Credential Access | Brute Force enabled        |
| Default credentials unchanged | T1078            | Initial Access    | Valid Accounts             |
| Credentials in logs           | T1552.004        | Credential Access | Private Keys in logs       |

### Container & Kubernetes

| Vulnerability Pattern  | ATT&CK Technique | Tactic               | Notes                             |
| ---------------------- | ---------------- | -------------------- | --------------------------------- |
| Privileged container   | T1611            | Privilege Escalation | Escape to Host                    |
| hostPath volume mount  | T1611            | Privilege Escalation | Container escape path             |
| Exposed Kubernetes API | T1552.007        | Credential Access    | Kubernetes API credentials        |
| Pod with hostNetwork   | T1046            | Discovery            | Network visibility                |
| Docker socket mounted  | T1611            | Privilege Escalation | Full host control                 |
| No resource limits     | T1496            | Impact               | Resource Hijacking (cryptomining) |

---

## ATT&CK Taxonomy Overview

### Tactics (The "Why")

ATT&CK tactics represent **adversary goals** in the attack lifecycle:

| ID     | Tactic               | Description                | Common in Chariot            |
| ------ | -------------------- | -------------------------- | ---------------------------- |
| TA0001 | Initial Access       | Entry point to environment | ✅ High (exposed services)   |
| TA0002 | Execution            | Running malicious code     | ✅ Medium (injection vulns)  |
| TA0003 | Persistence          | Maintain foothold          | ⚠️ Low (detection focus)     |
| TA0004 | Privilege Escalation | Gain higher permissions    | ✅ High (misconfigurations)  |
| TA0005 | Defense Evasion      | Avoid detection            | ✅ Medium (logging disabled) |
| TA0006 | Credential Access    | Steal credentials          | ✅ Very High (secrets)       |
| TA0007 | Discovery            | Understand environment     | ✅ High (reconnaissance)     |
| TA0008 | Lateral Movement     | Move through network       | ⚠️ Medium                    |
| TA0009 | Collection           | Gather data of interest    | ✅ High (data exposure)      |
| TA0010 | Exfiltration         | Steal data                 | ✅ High (public storage)     |
| TA0011 | Command & Control    | Communicate with systems   | ⚠️ Low                       |
| TA0040 | Impact               | Disrupt operations         | ⚠️ Low                       |

**See:** [references/tactic-reference.md](references/tactic-reference.md) for complete tactic descriptions.

### Techniques (The "How")

Techniques are **specific methods** adversaries use. Format: `T####` or `T####.###` (sub-technique).

**Abstraction levels:**

```
Tactic (TA####) ─── Goal (e.g., "Credential Access")
  └── Technique (T####) ─── Method (e.g., "T1552 Unsecured Credentials")
        └── Sub-Technique (T####.###) ─── Specific variant (e.g., "T1552.005 Cloud Metadata API")
```

**For findings, prefer Technique or Sub-Technique level. Do NOT use Tactic alone.**

---

## Decision Trees

### "Which Tactic Does This Belong To?"

```
What does the vulnerability enable an attacker to do?

├─ Gain initial foothold?
│   └─ TA0001 Initial Access (e.g., exposed service, missing auth)
│
├─ Execute code?
│   └─ TA0002 Execution (e.g., injection, RCE)
│
├─ Elevate privileges?
│   └─ TA0004 Privilege Escalation (e.g., IAM misconfiguration, container escape)
│
├─ Steal credentials?
│   └─ TA0006 Credential Access (e.g., hardcoded secrets, weak encryption)
│
├─ Access sensitive data?
│   └─ TA0009 Collection (e.g., public S3 bucket, exposed database)
│
├─ Disable security controls?
│   └─ TA0005 Defense Evasion (e.g., logging disabled)
│
└─ Discover environment?
    └─ TA0007 Discovery (e.g., open ports, cloud metadata)
```

### "S3/Storage Exposure" Mapping

```
Public S3 bucket detected:

What data does it contain?
├─ Credentials or keys?
│   └─ PRIMARY: T1552.001 (Credentials in Files)
│   └─ SECONDARY: T1530 (Data from Cloud Storage Object)
│
├─ Application data or PII?
│   └─ PRIMARY: T1530 (Data from Cloud Storage Object)
│   └─ TACTIC: TA0009 (Collection)
│
└─ Application code or config?
    └─ PRIMARY: T1213 (Data from Information Repositories)
    └─ SECONDARY: T1530
```

### "Credential Exposure" Mapping

```
Credentials found:

Where are they stored?
├─ In source code or .env file?
│   └─ T1552.001 (Credentials in Files)
│
├─ In cloud metadata service?
│   └─ T1552.005 (Cloud Instance Metadata API)
│
├─ In Kubernetes secrets (exposed)?
│   └─ T1552.007 (Container API)
│
├─ In logs or error messages?
│   └─ T1552.004 (Private Keys) if keys, else T1552.001
│
└─ Default/unchanged credentials?
    └─ T1078 (Valid Accounts)
```

**See:** [references/decision-trees.md](references/decision-trees.md) for additional decision trees.

---

## Common Mistakes

### 1. Using Tactic IDs as Primary Tags

**Wrong:** Tagging findings with TA0006 (Credential Access)

Tactics describe goals, not methods. Use techniques instead.

| ❌ Wrong | ✅ Correct | Reason                                 |
| -------- | ---------- | -------------------------------------- |
| TA0006   | T1552.001  | Tactic too generic, technique specific |
| TA0001   | T1190      | Initial Access via web exploit         |
| TA0009   | T1530      | Collection from cloud storage          |

### 2. Confusing Discovery with Initial Access

| Question               | Tactic                  | Example Technique                 |
| ---------------------- | ----------------------- | --------------------------------- |
| "How did they get in?" | Initial Access (TA0001) | T1190 (Exploit Public-Facing App) |
| "What did they find?"  | Discovery (TA0007)      | T1046 (Network Service Discovery) |

**Port scan vulnerability** → T1046 (Discovery), not T1190 (Initial Access)

### 3. Ignoring Sub-Technique Precision

Use sub-techniques when you know the specific variant:

| Finding                   | ❌ Generic | ✅ Specific |
| ------------------------- | ---------- | ----------- |
| IMDSv1 enabled            | T1552      | T1552.005   |
| PowerShell execution      | T1059      | T1059.001   |
| Cloud account without MFA | T1078      | T1078.004   |

### 4. Cloud Findings Without Cloud Context

Many cloud vulnerabilities use **Enterprise techniques** with cloud context:

```go
finding := &tabularium.Finding{
    Title:       "Public S3 Bucket Detected",
    MITREAttack: "T1530",  // Correct
    // NOT a Cloud-only technique, but applies to cloud
}
```

**See:** [references/cloud-technique-mapping.md](references/cloud-technique-mapping.md) for cloud-specific guidance.

### 5. Missing Sub-Technique When Available

If detection is specific, use the sub-technique:

| Detection                | Wrong | Right     | Why                        |
| ------------------------ | ----- | --------- | -------------------------- |
| "EC2 IMDSv1 enabled"     | T1552 | T1552.005 | IMDSv1 is specific variant |
| "bash -c in logs"        | T1059 | T1059.004 | Unix Shell specific        |
| "Azure managed identity" | T1078 | T1078.004 | Cloud accounts             |

---

## Integration with Capability Development

### Nebula/Diocletian Pattern

```go
finding := &tabularium.Finding{
    Title:       "EC2 Instance Metadata Service v1 Enabled",
    Description: "IMDSv1 allows SSRF attacks to steal IAM credentials",
    CWE:         "CWE-918",   // SSRF
    MITREAttack: "T1552.005", // Unsecured Credentials: Cloud Instance Metadata API
    MITRETactic: "TA0006",    // Credential Access
}
```

### Janus Capability Pattern

```go
// When building VQL capabilities or Janus tool chains
capability := &Capability{
    Name: "detect-public-s3-buckets",
    Findings: []Finding{
        {
            Title:       "S3 Bucket Publicly Accessible",
            MITREAttack: "T1530",  // Data from Cloud Storage Object
            MITRETactic: "TA0009", // Collection
            Severity:    "High",
        },
    },
}
```

### Validation Checklist

Before finalizing ATT&CK mapping:

1. ✅ Is this a Technique (T####), not Tactic (TA####)?
2. ✅ Is a sub-technique (T####.###) more accurate?
3. ✅ Does the technique match the detection, not the vulnerability class?
4. ✅ Is the tactic correctly aligned with adversary goal?
5. ✅ Would a threat intelligence analyst agree?

---

## Detection vs Vulnerability Perspective

**Critical distinction:** ATT&CK describes what **attackers do**, not what **defenders find**.

| What You Detect    | Vulnerability Type              | ATT&CK Technique                  |
| ------------------ | ------------------------------- | --------------------------------- |
| Public S3 bucket   | CWE-732 (Incorrect Permissions) | T1530 (Data from Cloud Storage)   |
| Missing MFA        | CWE-308 (Single Factor Auth)    | T1078.004 (Valid Accounts: Cloud) |
| Hardcoded password | CWE-798 (Hardcoded Credentials) | T1552.001 (Credentials in Files)  |
| SQL Injection      | CWE-89 (SQL Injection)          | T1190 (Exploit Public-Facing App) |

**Map to the attack technique, not the vulnerability category.**

---

## Platform Filtering

### Enterprise Matrix (Most Common)

Use for:

- On-premises infrastructure
- Network security findings
- Endpoint vulnerabilities
- General web applications

### Cloud Matrix

Use for:

- AWS/Azure/GCP misconfigurations
- Cloud-native service findings
- IAM and identity findings
- Serverless vulnerabilities

**Note:** Cloud matrix is a **filtered view** of Enterprise, not separate techniques. Many cloud findings use Enterprise technique IDs.

### ICS Matrix

Use for:

- Industrial control systems
- SCADA vulnerabilities
- OT (Operational Technology) findings

---

## Knowledge Gaps

ATT&CK coverage has gaps in some areas:

| Area                                     | Closest Technique | Notes                                  |
| ---------------------------------------- | ----------------- | -------------------------------------- |
| Supply chain attacks (dependencies)      | T1195.001         | Limited dependency-specific coverage   |
| Serverless cold start timing attacks     | T1499             | No serverless-specific techniques      |
| GraphQL injection                        | T1190             | Covered under general web exploitation |
| Infrastructure-as-Code misconfigurations | T1078.004         | IaC not explicitly called out          |

When no specific technique exists, use the closest generic technique and document the specific context in the finding description.

---

## References

| Reference                                                           | Content                                              |
| ------------------------------------------------------------------- | ---------------------------------------------------- |
| [tactic-reference.md](references/tactic-reference.md)               | Complete tactic descriptions with kill chain mapping |
| [technique-reference.md](references/technique-reference.md)         | Common technique lookup by domain                    |
| [decision-trees.md](references/decision-trees.md)                   | Extended decision trees for ambiguous cases          |
| [cloud-technique-mapping.md](references/cloud-technique-mapping.md) | Cloud-specific technique guidance                    |
| [detection-to-technique.md](references/detection-to-technique.md)   | Detection type to ATT&CK mappings                    |

## External Sources

- [MITRE ATT&CK v15](https://attack.mitre.org/)
- [ATT&CK Navigator](https://mitre-attack.github.io/attack-navigator/)
- [ATT&CK for Cloud (IaaS)](https://attack.mitre.org/matrices/enterprise/cloud/)

---

## Related Skills

| Skill                                  | Purpose                            |
| -------------------------------------- | ---------------------------------- |
| `mapping-to-cwe`                       | Map findings to CWE identifiers    |
| `mapping-to-mitre-d3fend`              | Map to defensive countermeasures   |
| `calculating-cvss-vectors`             | Determine CVSS scores for findings |
| `enforcing-go-capability-architecture` | Capability development patterns    |
