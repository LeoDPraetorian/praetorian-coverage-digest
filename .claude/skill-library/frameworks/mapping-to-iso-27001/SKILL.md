---
name: mapping-to-iso-27001
description: Use when mapping security findings to ISO 27001:2022 Annex A controls for compliance evidence - provides control structure, finding-to-control mappings, and audit evidence requirements for ISMS compliance
allowed-tools: Read
---

# Mapping Findings to ISO 27001:2022

**Help map security findings from capabilities (VQL, Nuclei, Janus, etc.) to ISO 27001:2022 Annex A controls for audit evidence and ISMS compliance reporting.**

> **ISO 27001:2022 Annex A** contains **93 controls** organized into **4 themes**: Organizational (37), People (8), Physical (14), Technological (34).

## When to Use

Use this skill when:

- Writing security capabilities that need ISO 27001 control tagging
- Mapping security findings to ISO control objectives for audit evidence
- Need to understand which Annex A control a finding satisfies
- Building compliance reports for ISO 27001 certified organizations
- Generating audit evidence for ISMS assessments
- Migrating from ISO 27001:2013 to 2022 (control mapping changes)

## Critical Rules

### 1. Use 2022 Controls, Not 2013 Controls

**DO NOT use 2013 control numbering** (A.9.x, A.12.x, etc.). The 2022 revision reorganized all controls.

| ❌ Avoid (2013) | ✅ Use Instead (2022) | Control Name        |
| --------------- | --------------------- | ------------------- |
| A.9.1.1         | A.5.15                | Access Control      |
| A.9.2.1         | A.5.16                | Identity Management |
| A.12.6.1        | A.8.24                | Cryptography        |
| A.18.1.5        | A.5.31                | Legal Requirements  |
| A.12.4.1        | A.8.15                | Logging             |
| A.9.4.1         | A.8.3                 | Privileged Access   |

**See:** [references/2013-to-2022-migration.md](references/2013-to-2022-migration.md) for complete mapping table.

### 2. Map to Specific Controls, Not Themes

Use specific control numbers (A.5.15) not theme categories alone (Organizational Controls).

| ❌ Too Generic | ✅ Specific Control    | When                  |
| -------------- | ---------------------- | --------------------- |
| Organizational | A.5.15, A.5.16, A.5.18 | Access management     |
| Technological  | A.8.1, A.8.2, A.8.3    | User endpoint devices |
| People         | A.6.1, A.6.2           | Screening, training   |

### 3. Multiple Controls May Apply

A single finding can satisfy multiple control objectives. Tag all applicable controls.

**Example:** "Exposed admin panel without authentication"

- A.5.15 (Access control)
- A.5.16 (Identity management)
- A.8.5 (Secure authentication)
- A.5.33 (Records protection)

---

## Quick Reference

### Cloud Security (AWS/Azure/GCP)

| Vulnerability Pattern               | ISO 27001:2022 Control | Control Name               | Evidence Type              |
| ----------------------------------- | ---------------------- | -------------------------- | -------------------------- |
| Public S3/Storage bucket            | A.8.11                 | Data masking               | Encryption status scan     |
| IMDSv1 enabled (metadata SSRF)      | A.8.9                  | Configuration management   | Instance metadata check    |
| Overly permissive IAM policy        | A.5.15                 | Access control             | IAM policy review          |
| Missing MFA on privileged account   | A.5.17                 | Authentication information | MFA status report          |
| Exposed secrets in environment vars | A.5.17                 | Authentication information | Secret scanner results     |
| Security group allows 0.0.0.0/0     | A.8.20                 | Networks security          | Network ACL audit          |
| CloudTrail/logging disabled         | A.8.15                 | Logging                    | Logging configuration scan |
| Snapshot shared publicly            | A.5.13                 | Labelling of information   | Snapshot permissions audit |
| Unencrypted storage                 | A.8.24                 | Use of cryptography        | Encryption status scan     |
| Lambda with admin privileges        | A.8.2                  | Privileged access rights   | Function role audit        |

### Network Security

| Vulnerability Pattern          | ISO 27001:2022 Control | Control Name               | Evidence Type            |
| ------------------------------ | ---------------------- | -------------------------- | ------------------------ |
| SSH with password auth enabled | A.5.17                 | Authentication information | SSH configuration scan   |
| Telnet enabled                 | A.8.22                 | Segregation in networks    | Service discovery scan   |
| Weak TLS version (< 1.2)       | A.8.24                 | Use of cryptography        | TLS version enumeration  |
| Open DNS resolver              | A.8.20                 | Networks security          | DNS configuration check  |
| Exposed RDP to internet        | A.8.20                 | Networks security          | Port scan results        |
| Default SNMP community string  | A.5.17                 | Authentication information | SNMP configuration audit |
| Missing HSTS                   | A.8.20                 | Networks security          | HTTP header analysis     |
| Self-signed certificate        | A.8.24                 | Use of cryptography        | Certificate validation   |

### Web Application Security

| Vulnerability Pattern        | ISO 27001:2022 Control | Control Name                            | Evidence Type              |
| ---------------------------- | ---------------------- | --------------------------------------- | -------------------------- |
| SQL Injection                | A.8.16                 | Monitoring activities                   | DAST/penetration test      |
| Cross-Site Scripting (XSS)   | A.8.8                  | Management of technical vulnerabilities | Web app scan results       |
| Command Injection            | A.8.8                  | Management of technical vulnerabilities | Code analysis              |
| Path Traversal               | A.5.33                 | Protection of records                   | Input validation review    |
| SSRF                         | A.8.8                  | Management of technical vulnerabilities | Application security test  |
| Insecure Deserialization     | A.8.8                  | Management of technical vulnerabilities | Code review                |
| Missing Authentication       | A.5.15                 | Access control                          | API endpoint audit         |
| Missing Authorization (IDOR) | A.5.15                 | Access control                          | Authorization test results |
| Open Redirect                | A.8.8                  | Management of technical vulnerabilities | Web security scan          |
| XXE                          | A.8.8                  | Management of technical vulnerabilities | SAST results               |

### Secrets and Credentials

| Vulnerability Pattern         | ISO 27001:2022 Control | Control Name               | Evidence Type          |
| ----------------------------- | ---------------------- | -------------------------- | ---------------------- |
| Hardcoded password in code    | A.5.17                 | Authentication information | Secret scanner results |
| Hardcoded API key             | A.5.17                 | Authentication information | Code repository scan   |
| Exposed .env file             | A.5.33                 | Protection of records      | Web scan results       |
| Secrets in Git history        | A.5.33                 | Protection of records      | Git history analysis   |
| Plaintext password storage    | A.8.24                 | Use of cryptography        | Database audit         |
| Weak password policy          | A.5.17                 | Authentication information | Policy configuration   |
| Default credentials unchanged | A.5.17                 | Authentication information | Credential audit       |
| Credentials in logs           | A.8.15                 | Logging                    | Log file analysis      |

### Container & Kubernetes

| Vulnerability Pattern  | ISO 27001:2022 Control | Control Name               | Evidence Type           |
| ---------------------- | ---------------------- | -------------------------- | ----------------------- |
| Privileged container   | A.8.2                  | Privileged access rights   | Container config audit  |
| hostPath volume mount  | A.8.19                 | Secure system architecture | Pod spec review         |
| Exposed Kubernetes API | A.8.20                 | Networks security          | API exposure scan       |
| Pod with hostNetwork   | A.8.22                 | Segregation in networks    | Pod configuration audit |
| Docker socket mounted  | A.8.2                  | Privileged access rights   | Container runtime audit |
| No resource limits     | A.8.6                  | Capacity management        | Resource quota review   |

---

## ISO 27001:2022 Annex A Structure

### Theme 1: Organizational Controls (A.5.1 - A.5.37)

Management frameworks, policies, governance, risk management, and organizational processes.

**Key controls for security findings:**

| Control | Name                                       | Common Finding Types                   |
| ------- | ------------------------------------------ | -------------------------------------- |
| A.5.7   | Threat intelligence                        | Vulnerability intelligence feeds       |
| A.5.8   | Information security in project management | Secure development practices           |
| A.5.9   | Inventory of information and assets        | Asset discovery, classification        |
| A.5.10  | Acceptable use of information              | Data handling violations               |
| A.5.13  | Labelling of information                   | Missing classification labels          |
| A.5.15  | Access control                             | Authentication, authorization findings |
| A.5.16  | Identity management                        | User account issues                    |
| A.5.17  | Authentication information                 | Credential management findings         |
| A.5.18  | Access rights                              | Excessive permissions                  |
| A.5.23  | Information security for cloud services    | Cloud misconfigurations                |
| A.5.30  | ICT readiness for business continuity      | Backup, disaster recovery              |
| A.5.33  | Protection of records                      | Data exposure, retention violations    |
| A.5.34  | Privacy and PII protection                 | PII exposure, GDPR violations          |

### Theme 2: People Controls (A.6.1 - A.6.8)

Human resources security, screening, awareness, training, and responsibilities.

**Key controls for security findings:**

| Control | Name                                 | Common Finding Types        |
| ------- | ------------------------------------ | --------------------------- |
| A.6.3   | Awareness training                   | Phishing simulation results |
| A.6.5   | Responsibilities after employment    | Access revocation findings  |
| A.6.8   | Information security event reporting | Incident response metrics   |

**Note:** People controls rarely map directly to technical findings. They provide context for policy violations.

### Theme 3: Physical Controls (A.7.1 - A.7.14)

Physical security of premises, equipment, and supporting utilities.

**Key controls for security findings:**

| Control | Name                         | Common Finding Types               |
| ------- | ---------------------------- | ---------------------------------- |
| A.7.4   | Physical security monitoring | Badge access logs, camera coverage |
| A.7.10  | Storage media                | Unencrypted backup media           |
| A.7.13  | Equipment maintenance        | Unpatched hardware                 |

**Note:** Physical controls are rarely applicable to cloud/software security findings.

### Theme 4: Technological Controls (A.8.1 - A.8.34)

Technical security measures, system hardening, monitoring, and cryptography.

**Key controls for security findings:**

| Control | Name                                           | Common Finding Types                    |
| ------- | ---------------------------------------------- | --------------------------------------- |
| A.8.1   | User endpoint devices                          | Unmanaged devices, MDM violations       |
| A.8.2   | Privileged access rights                       | Excessive admin permissions             |
| A.8.3   | Information access restriction                 | Unauthorized data access                |
| A.8.5   | Secure authentication                          | Weak authentication mechanisms          |
| A.8.8   | Management of technical vulnerabilities        | CVEs, unpatched systems                 |
| A.8.9   | Configuration management                       | Insecure configurations                 |
| A.8.10  | Information deletion                           | Data retention violations               |
| A.8.11  | Data masking                                   | Exposed sensitive data                  |
| A.8.15  | Logging                                        | Missing or disabled logging             |
| A.8.16  | Monitoring activities                          | SIEM alerts, anomaly detection          |
| A.8.19  | Secure system architecture                     | Architecture flaws                      |
| A.8.20  | Networks security                              | Firewall rules, network segmentation    |
| A.8.21  | Security of network services                   | Unencrypted protocols                   |
| A.8.22  | Segregation in networks                        | Flat networks, VLAN issues              |
| A.8.23  | Web filtering                                  | Content filtering failures              |
| A.8.24  | Use of cryptography                            | Encryption findings                     |
| A.8.25  | Secure development lifecycle                   | SAST/DAST findings                      |
| A.8.26  | Application security requirements              | Missing security controls               |
| A.8.28  | Secure coding                                  | Code quality, injection vulnerabilities |
| A.8.29  | Security testing                               | Penetration test findings               |
| A.8.31  | Separation of environments                     | Dev/prod separation violations          |
| A.8.32  | Change management                              | Unapproved changes                      |
| A.8.34  | Protection of information systems during audit | Production access during audits         |

---

## Decision Trees

### "Which Control Does This Finding Belong To?"

```
What does the vulnerability expose or enable?

├─ Credentials or authentication issues?
│   └─ A.5.17 (Authentication information)
│   └─ A.5.16 (Identity management)
│   └─ A.8.5 (Secure authentication)
│
├─ Access control or authorization issues?
│   └─ A.5.15 (Access control)
│   └─ A.5.18 (Access rights)
│   └─ A.8.2 (Privileged access rights)
│   └─ A.8.3 (Information access restriction)
│
├─ Encryption or cryptography missing?
│   └─ A.8.24 (Use of cryptography)
│
├─ Network exposure or segmentation issues?
│   └─ A.8.20 (Networks security)
│   └─ A.8.22 (Segregation in networks)
│
├─ Logging or monitoring disabled?
│   └─ A.8.15 (Logging)
│   └─ A.8.16 (Monitoring activities)
│
├─ Sensitive data exposed?
│   └─ A.5.33 (Protection of records)
│   └─ A.5.34 (Privacy and PII protection)
│   └─ A.8.11 (Data masking)
│
├─ Technical vulnerability (CVE, unpatched)?
│   └─ A.8.8 (Management of technical vulnerabilities)
│
├─ Insecure configuration?
│   └─ A.8.9 (Configuration management)
│
└─ Application security flaw?
    └─ A.8.25 (Secure development lifecycle)
    └─ A.8.28 (Secure coding)
```

---

## Audit Evidence Requirements

### What Auditors Need

For each finding mapped to a control, auditors require:

1. **Detection Evidence**: How the issue was discovered
   - Scanner output (Nuclei, Nebula, VQL)
   - Penetration test report
   - Security assessment results

2. **Scope Evidence**: Where the control applies
   - Asset inventory showing affected systems
   - Network diagrams
   - System documentation

3. **Remediation Evidence**: How issues are addressed
   - Remediation tickets (Jira, Linear)
   - Fix verification scans
   - Change management records

4. **Effectiveness Evidence**: Ongoing control monitoring
   - Continuous scanning schedules
   - Monitoring dashboards
   - Exception management process

### Evidence by Control Type

| Control Type           | Required Evidence                          | Chariot Capabilities            |
| ---------------------- | ------------------------------------------ | ------------------------------- |
| A.5.x (Organizational) | Policies, procedures, risk assessments     | Asset inventory, classification |
| A.6.x (People)         | Training records, HR processes             | Security awareness metrics      |
| A.7.x (Physical)       | Access logs, facility assessments          | Physical security audits        |
| A.8.x (Technological)  | Scan results, configs, monitoring evidence | VQL, Nuclei, Nebula, Janus      |

**See:** [references/audit-evidence.md](references/audit-evidence.md) for detailed evidence requirements per control.

---

## Integration

### Called By

- Capability developers (VQL, Nuclei, Janus)
- Security engineers generating compliance reports
- Auditors mapping findings to control objectives

### Requires (invoke before starting)

None - standalone reference skill

### Calls (during execution)

None - terminal reference skill

### Pairs With (conditional)

| Skill                     | Trigger                      | Purpose                      |
| ------------------------- | ---------------------------- | ---------------------------- |
| `mapping-to-mitre-attack` | When threat intel needed     | Add ATT&CK technique context |
| `mapping-to-cwe`          | When weakness classification | Add CWE weakness IDs         |
| `mapping-to-mitre-d3fend` | When defensive measures      | Add D3FEND countermeasures   |

---

## References

- [references/2013-to-2022-migration.md](references/2013-to-2022-migration.md) - Complete 2013→2022 control mapping
- [references/audit-evidence.md](references/audit-evidence.md) - Evidence requirements by control

## Related Resources

### Official Documentation

- **ISO/IEC 27001:2022**: https://www.iso.org/standard/27001
- **ISO/IEC 27002:2022**: https://www.iso.org/standard/75652.html (Implementation guidance)
- **Annex A Control Objectives**: https://www.iso.org/obp/ui/#iso:std:iso-iec:27001:ed-3:v1:en:sec:A

### Implementation Guides

- **NIST SP 800-53 Mapping**: Many ISO controls align with NIST 800-53 families
- **CIS Controls Mapping**: CIS Controls provide implementation benchmarks

---

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
