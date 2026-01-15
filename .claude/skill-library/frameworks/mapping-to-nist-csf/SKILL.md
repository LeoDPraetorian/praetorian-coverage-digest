---
name: mapping-to-nist-csf
description: Use when tagging security findings with NIST Cybersecurity Framework 2.0 categories during capability development - provides function/category lookup, decision trees, finding-to-CSF mappings for compliance dashboards and gap analysis
allowed-tools: Read
---

# Mapping Findings to NIST Cybersecurity Framework 2.0

**Help capability developers map security findings to NIST CSF 2.0 categories for compliance dashboards, gap analysis, and risk management reporting.**

> **NIST CSF 2.0** (February 2024) contains **6 Functions**, **23 Categories**, and **106 Subcategories** across all risk management activities.

## When to Use

Use this skill when:

- Writing security capabilities that detect vulnerabilities or misconfigurations
- Tagging findings with NIST CSF categories for compliance reporting
- Need to understand which Function/Category/Subcategory applies to a finding
- Building compliance dashboards showing CSF coverage
- Performing gap analysis against CSF implementation tiers
- Mapping existing security controls to CSF framework

## Critical Rules

### 1. Always Use Category IDs, Not Function-Only

**DO NOT tag findings with Functions alone** (GV, ID, PR, DE, RS, RC). They are too generic.

| ❌ Avoid (Function) | ✅ Use Instead (Category)  | When                         |
| ------------------- | -------------------------- | ---------------------------- |
| ID (Identify)       | ID.AM, ID.RA, ID.RM        | Asset/Risk management        |
| PR (Protect)        | PR.AC, PR.DS, PR.PS        | Access control, data protect |
| DE (Detect)         | DE.AE, DE.CM               | Anomaly/continuous monitor   |
| RS (Respond)        | RS.AN, RS.MA, RS.MI        | Analysis, mitigation         |
| RC (Recover)        | RC.RP, RC.CO               | Recovery planning            |
| GV (Govern)         | GV.OC, GV.RM, GV.SC, GV.PO | Org context, risk, supply    |

### 2. Prefer Subcategories for Precision

Use subcategories (ID.AM-01, PR.AC-03) when you know the specific control:

| Generic Category       | Specific Subcategory           | Use When                              |
| ---------------------- | ------------------------------ | ------------------------------------- |
| ID.AM (Asset Mgmt)     | ID.AM-01 (Physical inventory)  | Discovering network assets            |
| PR.AC (Access Control) | PR.AC-03 (Remote access)       | VPN, RDP, SSH security                |
| DE.CM (Continuous Mon) | DE.CM-01 (Network monitoring)  | Network traffic analysis              |
| RS.MI (Mitigation)     | RS.MI-01 (Vulnerabilities)     | Patching, vulnerability remediation   |
| ID.RA (Risk Assess)    | ID.RA-01 (Vuln identification) | Vulnerability scanning, CVE detection |
| PR.DS (Data Security)  | PR.DS-02 (Data at rest)        | Encryption, storage security          |
| DE.AE (Anomalies)      | DE.AE-02 (Threat intel)        | IOC detection, threat feeds           |
| GV.RM (Risk Mgmt)      | GV.RM-01 (Risk strategy)       | Risk assessment methodology           |
| RC.RP (Recovery Plan)  | RC.RP-01 (Recovery plan exec)  | Backup restoration, disaster recovery |
| PR.PS (Platform Sec)   | PR.PS-01 (Baseline config)     | Hardening, configuration management   |

### 3. NIST CSF 2.0 Changes from 1.1

**New in CSF 2.0 (February 2024):**

| Change                      | Description                                | Impact                           |
| --------------------------- | ------------------------------------------ | -------------------------------- |
| **GOVERN Function**         | New function (was part of other functions) | All governance now under GV      |
| **Category count**          | 22 → 23 categories                         | Added: GV.OC, GV.RM, GV.SC, etc. |
| **Subcategory count**       | 98 → 106 subcategories                     | More granular controls           |
| **Supply chain focus**      | GV.SC (Supply Chain Risk)                  | Third-party risk management      |
| **Organizational context**  | GV.OC (Organizational Context)             | Mission, stakeholders, assets    |
| **Renamed categories**      | Some categories renamed for clarity        | Check migration notes            |
| **Implementation examples** | More industry-specific examples            | Healthcare, finance, energy      |
| **Tiers expanded**          | Clearer progression: Partial → Adaptive    | Better maturity assessment       |

**🚨 DO NOT use CSF 1.1 categories without verification.** Always confirm against CSF 2.0 structure.

---

## Quick Finding-to-CSF Mappings

For comprehensive vulnerability-to-CSF category mapping tables covering:
- Cloud Security (AWS/Azure/GCP) - 14 patterns
- Network Security - 10 patterns
- Web Application Security - 12 patterns
- Vulnerability Management - 8 patterns
- Identity & Access Management - 8 patterns
- Cryptography & Data Protection - 8 patterns

**See:** [references/finding-type-mappings.md](references/finding-type-mappings.md) - Complete mapping tables with 60+ finding types

**Common patterns:**
- Public S3 bucket → PR.DS-05 (Leak protection)
- Unpatched CVE → PR.IP-12 (Vulnerability remediation)
- SQL Injection → PR.DS-08 (Integrity check)
- No MFA → PR.AC-07 (Auth/credentials)
- Weak TLS → PR.DS-02 (Data in transit)

---

## CSF 2.0 Framework Structure

### The 6 Functions

| Function ID | Function Name | Purpose                                             | Use When                          |
| ----------- | ------------- | --------------------------------------------------- | --------------------------------- |
| **GV**      | **GOVERN**    | Establish/monitor cybersecurity risk strategy       | Policy, risk mgmt, supply chain   |
| **ID**      | **IDENTIFY**  | Understand org context, assets, risks               | Asset discovery, risk assessment  |
| **PR**      | **PROTECT**   | Implement safeguards to ensure service delivery     | Controls, hardening, access mgmt  |
| **DE**      | **DETECT**    | Identify occurrence of cybersecurity events         | Monitoring, anomaly detection     |
| **RS**      | **RESPOND**   | Take action regarding detected incidents            | Incident response, containment    |
| **RC**      | **RECOVER**   | Restore capabilities/services impaired by incidents | Disaster recovery, business cont. |

### GOVERN (GV) - New in CSF 2.0

| Category  | Category Name              | Subcategories | Purpose                             |
| --------- | -------------------------- | ------------- | ----------------------------------- |
| **GV.OC** | Organizational Context     | 5             | Mission, stakeholders, dependencies |
| **GV.RM** | Risk Management Strategy   | 7             | Risk appetite, strategy, roles      |
| **GV.RR** | Roles, Responsibilities    | 2             | Accountability, assignments         |
| **GV.PO** | Policy                     | 2             | Policies, procedures                |
| **GV.OV** | Oversight                  | 3             | Board, leadership responsibility    |
| **GV.SC** | Cybersecurity Supply Chain | 10            | Third-party risk, vendor management |

### IDENTIFY (ID)

| Category  | Category Name    | Subcategories | Purpose                             |
| --------- | ---------------- | ------------- | ----------------------------------- |
| **ID.AM** | Asset Management | 7             | Hardware, software, data inventory  |
| **ID.RA** | Risk Assessment  | 10            | Vulnerability and threat assessment |
| **ID.IM** | Improvement      | 2             | Lessons learned, improvements       |

### PROTECT (PR)

| Category  | Category Name               | Subcategories | Purpose                                |
| --------- | --------------------------- | ------------- | -------------------------------------- |
| **PR.AA** | Identity Mgmt, Auth, Access | 6             | Identity proofing, access control      |
| **PR.AT** | Awareness and Training      | 2             | Security training, awareness           |
| **PR.DS** | Data Security               | 11            | Data protection, encryption, integrity |
| **PR.PS** | Platform Security           | 2             | Hardware/software baseline, secure dev |
| **PR.IR** | Technology Infra Resilience | 4             | Backups, capacity, resilience          |

### DETECT (DE)

| Category  | Category Name         | Subcategories | Purpose                                 |
| --------- | --------------------- | ------------- | --------------------------------------- |
| **DE.AE** | Anomalies and Events  | 4             | Baseline, anomaly detection             |
| **DE.CM** | Continuous Monitoring | 9             | Network, physical, personnel monitoring |

### RESPOND (RS)

| Category  | Category Name               | Subcategories | Purpose                             |
| --------- | --------------------------- | ------------- | ----------------------------------- |
| **RS.MA** | Incident Management         | 2             | Incident mgmt lifecycle             |
| **RS.AN** | Incident Analysis           | 5             | Investigation, analysis, forensics  |
| **RS.RP** | Incident Response Reporting | 1             | Reporting requirements, authorities |
| **RS.MI** | Incident Mitigation         | 3             | Containment, eradication, recovery  |

### RECOVER (RC)

| Category  | Category Name                   | Subcategories | Purpose                                 |
| --------- | ------------------------------- | ------------- | --------------------------------------- |
| **RC.RP** | Incident Recovery Plan Exec     | 2             | Execute recovery plans                  |
| **RC.CO** | Incident Recovery Communication | 3             | Internal/external recovery coordination |

---

## CSF Implementation Tiers

**Tiers measure cybersecurity risk management maturity** (not technical capability levels).

| Tier                       | Risk Management                  | Integrated Risk Mgmt              | External Participation      | Chariot Platform Example                       |
| -------------------------- | -------------------------------- | --------------------------------- | --------------------------- | ---------------------------------------------- |
| **Tier 1 (Partial)**       | Ad hoc, reactive                 | Isolated by dept                  | Limited awareness           | Manual scans, no automation                    |
| **Tier 2 (Risk Informed)** | Risk-aware, no org-wide policy   | Risk-informed but not established | Aware but no formal sharing | Basic automation, some integration             |
| **Tier 3 (Repeatable)**    | Formal policy, regularly updated | Org-wide approach                 | Formal collaboration        | Automated scanning, centralized reporting      |
| **Tier 4 (Adaptive)**      | Adaptive, lessons learned        | Real-time risk-based              | Proactive, real-time intel  | Continuous monitoring, ML-based prioritization |

**Use tiers to describe maturity progression:**

- "This capability moves you from Tier 1 (manual vuln scans) to Tier 2 (automated daily scans)"
- "Chariot's asset discovery + continuous monitoring = Tier 3 maturity"
- "With threat intel integration, we achieve Tier 4 adaptive response"

---

## Decision Trees

### "Where does this vulnerability finding belong?"

```
1. Is it about DISCOVERING the vulnerability/asset?
   → ID.RA (Risk Assessment) - ID.RA-01 (Vuln identification)

2. Is it about PREVENTING exploitation with a control?
   → PR.* (PROTECT function)
   ├─ Authentication/Authorization? → PR.AA (Identity Mgmt)
   ├─ Data protection/Encryption? → PR.DS (Data Security)
   ├─ Configuration/Hardening? → PR.PS (Platform Security)
   └─ Resilience/Redundancy? → PR.IR (Infrastructure Resilience)

3. Is it about MONITORING/DETECTING threats?
   → DE.* (DETECT function)
   ├─ Anomaly detection? → DE.AE (Anomalies and Events)
   └─ Continuous monitoring? → DE.CM (Continuous Monitoring)

4. Is it about RESPONDING to an incident?
   → RS.* (RESPOND function)
   ├─ Incident handling? → RS.MA (Incident Management)
   ├─ Forensics/Analysis? → RS.AN (Incident Analysis)
   └─ Containment/Mitigation? → RS.MI (Incident Mitigation)

5. Is it about RECOVERING from an incident?
   → RC.* (RECOVER function)
   ├─ Recovery plans? → RC.RP (Recovery Plan Execution)
   └─ Recovery communication? → RC.CO (Recovery Communication)

6. Is it about GOVERNANCE/POLICY/RISK STRATEGY?
   → GV.* (GOVERN function)
   ├─ Risk management strategy? → GV.RM (Risk Management Strategy)
   ├─ Policies? → GV.PO (Policy)
   └─ Third-party/Supply chain? → GV.SC (Supply Chain Risk)
```

### "Is this a vulnerability scanner finding or a security control?"

| If your capability DETECTS...      | Use Category | Rationale                                 |
| ---------------------------------- | ------------ | ----------------------------------------- |
| Vulnerable software (CVEs)         | ID.RA        | Risk Assessment → Vulnerability ID        |
| Misconfigured security control     | ID.RA        | Identifies gap in implemented controls    |
| Missing security control           | ID.RA        | Identifies absence of protection          |
| Weak authentication mechanism      | PR.AA        | PROTECT function (control implementation) |
| Encrypted vs unencrypted data      | PR.DS        | Data Security control                     |
| Network anomaly/suspicious traffic | DE.CM        | Continuous Monitoring (detection)         |
| Exposed credentials                | ID.RA        | Identifies credential exposure risk       |
| Insecure API endpoint              | ID.RA        | Identifies API security risk              |

**Rule of thumb**: If you're SCANNING for it → ID.RA. If you're IMPLEMENTING it → PR.\*

---

## Implementation Examples & Gap Analysis

For real-world capability implementations, gap analysis procedures, and tool integration examples:

**See:** [references/implementation-examples.md](references/implementation-examples.md) - Comprehensive implementation guide

**Includes:**
- Capability coverage matrix (10+ Chariot examples)
- Implementation examples by CSF category (GV, ID, PR, DE, RS, RC)
- Gap analysis methodology with prioritization
- Tool integration examples (Qualys, Splunk, AWS Security Hub)
- Code snippets for auto-tagging findings with CSF categories

**Example**: Vulnerability Scanner (Nuclei) → ID.RA-01 (primary) + PR.IP-12 (supporting for remediation)

---

## Integration

### Called By

- **Gateway**: `gateway-security` (routing security framework queries)
- **Agents**: `capability-lead`, `capability-developer` (when tagging findings)
- **Commands**: N/A (library skill, not exposed as command)

### Requires (invoke before starting)

None - terminal skill providing framework documentation.

### Calls (during execution)

None - documentation-only skill, no workflow dependencies.

### Pairs With (conditional)

| Skill                     | Trigger                      | Purpose                                 |
| ------------------------- | ---------------------------- | --------------------------------------- |
| `mapping-to-mitre-attack` | Threat context needed        | Correlate CSF with adversary techniques |
| `mapping-to-cwe`          | Vulnerability classification | Map CSF to technical weakness types     |
| `mapping-to-sans-top-25`  | Prioritization needed        | Align CSF with industry-critical risks  |
| `scoring-cvss-threats`            | Severity assessment          | Risk severity + CSF category            |

---

## References

For detailed subcategory mappings, implementation examples, and migration guidance, see:

- [references/subcategory-reference.md](references/subcategory-reference.md) - All 106 subcategories with descriptions
- [references/finding-type-mappings.md](references/finding-type-mappings.md) - Comprehensive finding → CSF mappings
- [references/implementation-examples.md](references/implementation-examples.md) - Real-world capability examples
- [references/csf-1.1-to-2.0-migration.md](references/csf-1.1-to-2.0-migration.md) - Migration guide from CSF 1.1
- [references/tier-progression-guide.md](references/tier-progression-guide.md) - Maturity model details

---

## Common Pitfalls

### 1. Using Function IDs Instead of Categories

❌ **Wrong**: "Tag this with ID (Identify)"
✅ **Right**: "Tag this with ID.RA-01 (Vulnerability identification)"

### 2. Confusing Similar Categories

| Often Confused | Correct Usage                              |
| -------------- | ------------------------------------------ |
| ID.RA vs PR.IP | ID.RA = Finding vulns, PR.IP = Patching    |
| DE.CM vs DE.AE | DE.CM = Monitoring, DE.AE = Anomaly detect |
| PR.AA vs PR.AC | PR.AA = Auth/Access, PR.AC = Access only   |
| GV.SC vs ID.RA | GV.SC = Supply chain, ID.RA = Risk assess  |

### 3. Ignoring CSF 2.0 Changes

If you see "ID.GV" or "PR.PT" → **These are CSF 1.1 categories, now deprecated.**

**CSF 1.1 → CSF 2.0 mapping:**

| CSF 1.1 Category | CSF 2.0 Replacement  | Notes                     |
| ---------------- | -------------------- | ------------------------- |
| ID.GV            | GV.\* (new function) | Governance now separate   |
| PR.PT            | PR.DS                | Data protection           |
| PR.IP            | PR.PS, PR.IR         | Split into platform/infra |
| (various)        | GV.SC                | Supply chain added        |

### 4. Mapping to Wrong Tier

**Tier is about ORGANIZATION maturity, not TECHNICAL capability.**

❌ "This scan is Tier 4 because it uses AI"
✅ "Enabling this scan moves your ORG from Tier 1 (ad hoc) to Tier 2 (automated)"

---

## Changelog

See `.history/CHANGELOG` for version history and updates.
