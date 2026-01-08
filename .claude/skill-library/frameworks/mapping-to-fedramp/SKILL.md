---
name: mapping-to-fedramp
description: Use when mapping security findings to FedRAMP control baselines (Low/Moderate/High) - provides NIST 800-53 Rev 5 control mappings, baseline validation, ConMon guidance, and POA&M generation for federal compliance
allowed-tools: Read, Write, Grep, Glob, Bash
---

# Mapping to FedRAMP

**Map security findings to FedRAMP control baselines for federal compliance.**

## When to Use

Use this skill when:

- Mapping security findings to NIST 800-53 controls
- Validating findings against FedRAMP baselines (Low/Moderate/High)
- Generating POA&Ms (Plans of Action and Milestones) for findings
- Determining continuous monitoring (ConMon) requirements
- Tagging capabilities or findings with FedRAMP control identifiers
- Supporting federal authorization packages

**Critical**: FedRAMP authorization requires mapping security findings to NIST 800-53 Rev 5 controls. This skill provides systematic mapping for federal compliance.

---

## Quick Reference

| Baseline | Control Count | Common Use Case                     |
| -------- | ------------- | ----------------------------------- |
| Low      | 156 controls  | Low-impact SaaS, non-sensitive data |
| Moderate | 325 controls  | Most federal systems (default)      |
| High     | 421 controls  | National security, law enforcement  |

**Control Family Quick Lookup:**

| Family | Focus Area                         | Example Controls       |
| ------ | ---------------------------------- | ---------------------- |
| AC     | Access Control                     | AC-2, AC-3, AC-6       |
| AU     | Audit and Accountability           | AU-2, AU-6, AU-12      |
| CA     | Assessment and Authorization       | CA-2, CA-7, CA-8       |
| CM     | Configuration Management           | CM-2, CM-6, CM-8       |
| IA     | Identification and Authentication  | IA-2, IA-4, IA-5       |
| IR     | Incident Response                  | IR-4, IR-6, IR-8       |
| RA     | Risk Assessment                    | RA-3, RA-5, RA-7       |
| SC     | System and Communications Security | SC-7, SC-8, SC-12      |
| SI     | System and Information Integrity   | SI-2, SI-3, SI-4, SI-7 |

---

## Workflow

### Step 1: Identify Finding Type

Classify the security finding by category:

**Infrastructure Findings:**

- Network exposure (open ports, services)
- TLS/SSL configuration issues
- Firewall/security group misconfigurations
- DNS vulnerabilities

**Application Findings:**

- Authentication weaknesses
- Authorization bypasses
- Input validation issues
- Session management flaws

**Data Protection Findings:**

- Encryption at rest issues
- Encryption in transit issues
- Key management problems
- Data retention violations

**Operational Findings:**

- Missing security monitoring
- Insufficient logging
- Patch management gaps
- Configuration drift

### Step 2: Map Finding to Control Family

Use the mapping table to identify relevant control families:

**For detailed finding-to-control mappings, see:** [references/finding-control-mappings.md](references/finding-control-mappings.md)

**Quick mapping guide:**

| Finding Type              | Primary Control Family  | Secondary Families |
| ------------------------- | ----------------------- | ------------------ |
| Authentication weakness   | IA (Identification)     | AC, AU             |
| Authorization bypass      | AC (Access Control)     | IA, AU             |
| Encryption issues         | SC (Communications)     | IA, MP             |
| Vulnerability (unpatched) | SI (System Integrity)   | RA, CM             |
| Logging/monitoring gap    | AU (Audit)              | IR, SI             |
| Network exposure          | SC (Communications)     | AC, CM             |
| Configuration drift       | CM (Configuration)      | RA, SI             |
| Incident response gap     | IR (Incident Response)  | AU, CA             |
| Risk assessment missing   | RA (Risk Assessment)    | CA, PM             |
| Weak access controls      | AC (Access Control)     | IA, AU             |
| Insecure data handling    | SC (Communications)     | MP, PE             |
| Supply chain risk         | SA (System Acquisition) | RA, CM             |

### Step 3: Identify Specific Controls

Within the control family, identify specific controls:

**Example: Vulnerability Scanning Finding**

- **Finding:** "Unpatched critical CVE-2023-12345 in Apache component"
- **Control Family:** SI (System and Information Integrity)
- **Specific Control:** SI-2 (Flaw Remediation)
- **Related Controls:** RA-5 (Vulnerability Monitoring and Scanning), CM-3 (Configuration Change Control)

**Example: Weak TLS Configuration**

- **Finding:** "TLS 1.0 enabled on API endpoint"
- **Control Family:** SC (System and Communications Protection)
- **Specific Control:** SC-8 (Transmission Confidentiality and Integrity)
- **Related Controls:** SC-13 (Cryptographic Protection), IA-5 (Authenticator Management)

**For comprehensive control descriptions, see:** [references/nist-800-53-controls.md](references/nist-800-53-controls.md)

### Step 4: Validate Against Baseline

Determine if the control is required for the target baseline:

```
FedRAMP Low (156 controls):
- Core security fundamentals
- Basic access control, audit, incident response
- Typically cloud-hosted SaaS with low-impact data

FedRAMP Moderate (325 controls):
- Most federal systems target this level
- Adds configuration management, enhanced monitoring
- Default for most federal agency systems

FedRAMP High (421 controls):
- National security systems
- Law enforcement data
- Adds advanced threat protection, data isolation
```

**Baseline validation logic:**

1. Is control in the FedRAMP baseline spreadsheet for target level?
2. Check control enhancements (e.g., SI-2(1), SI-2(2))
3. Verify if control is "P0" (mandatory) vs "P1/P2" (conditional)

**For complete baseline matrices, see:** [references/fedramp-baselines.md](references/fedramp-baselines.md)

### Step 5: Determine Control Implementation Status

Assess current implementation:

| Status              | Meaning                                           | Action Required              |
| ------------------- | ------------------------------------------------- | ---------------------------- |
| **Implemented**     | Control fully operational, documented, tested     | Document in SSP              |
| **Partially**       | Control partially implemented or not fully tested | Complete + document          |
| **Planned**         | Control design approved, implementation pending   | Include in POA&M with dates  |
| **Not Implemented** | Control not addressed                             | High-priority POA&M required |

### Step 6: Generate POA&M Entry (If Required)

If control is not fully implemented, create a POA&M entry:

**POA&M Required Fields:**

```yaml
Control Identifier: [e.g., SI-2, SC-8(1)]
Control Name: [e.g., Flaw Remediation]
Weakness Description: [Specific finding details]
Resources Required: [Personnel, tools, budget]
Scheduled Completion Date: [Target date]
Milestones with Completion Dates:
  - [Milestone 1]: [Date]
  - [Milestone 2]: [Date]
Status: [Ongoing/Risk Accepted/Completed]
```

**For POA&M templates and examples, see:** [references/poam-generation.md](references/poam-generation.md)

### Step 7: Tag Finding with Control Metadata

Add FedRAMP control metadata to the finding:

**Example metadata structure:**

```json
{
  "finding_id": "VULN-2024-001",
  "title": "Unpatched Apache Struts vulnerability",
  "fedramp_controls": ["SI-2", "RA-5"],
  "control_family": ["SI", "RA"],
  "fedramp_baseline": {
    "low": true,
    "moderate": true,
    "high": true
  },
  "implementation_status": "not_implemented",
  "requires_poam": true,
  "conmon_frequency": "monthly"
}
```

### Step 8: Document Continuous Monitoring (ConMon) Requirements

Specify ongoing monitoring for the control:

**ConMon frequencies by control type:**

| Control Type                | Frequency         | Method                            |
| --------------------------- | ----------------- | --------------------------------- |
| Vulnerability Scanning      | Monthly (minimum) | Automated scanner + manual review |
| Configuration Monitoring    | Continuous        | CSAM tools, drift detection       |
| Access Reviews              | Quarterly         | Manual review of privileges       |
| Incident Response Testing   | Annual            | Tabletop exercises                |
| Penetration Testing         | Annual            | Independent assessment            |
| Log Review                  | Continuous        | SIEM with automated alerting      |
| Patch Management Validation | Monthly           | Patch compliance reporting        |

**For complete ConMon requirements, see:** [references/continuous-monitoring.md](references/continuous-monitoring.md)

---

## Common Finding-to-Control Mappings

### Vulnerability Management

**Finding:** Unpatched vulnerabilities
**Primary Control:** RA-5 (Vulnerability Monitoring and Scanning)
**Related Controls:** SI-2 (Flaw Remediation), CM-3 (Configuration Change Control)
**All Baselines:** Low, Moderate, High

### Access Control

**Finding:** Weak password policy
**Primary Control:** IA-5 (Authenticator Management)
**Related Controls:** AC-7 (Unsuccessful Logon Attempts), AU-2 (Audit Events)
**All Baselines:** Low, Moderate, High

### Encryption

**Finding:** Unencrypted data transmission
**Primary Control:** SC-8 (Transmission Confidentiality and Integrity)
**Related Controls:** SC-13 (Cryptographic Protection), SC-23 (Session Authenticity)
**All Baselines:** Low, Moderate, High

### Logging and Monitoring

**Finding:** Insufficient security logging
**Primary Control:** AU-2 (Event Logging), AU-6 (Audit Review, Analysis, and Reporting)
**Related Controls:** SI-4 (System Monitoring), IR-5 (Incident Monitoring)
**All Baselines:** Low, Moderate, High

---

## Output Formats

### For Capability Definitions

When tagging security capabilities with FedRAMP controls:

```yaml
capability:
  name: "TLS Configuration Scanner"
  fedramp_controls:
    - control: "SC-8"
      enhancement: null
      description: "Transmission Confidentiality and Integrity"
    - control: "SC-13"
      enhancement: null
      description: "Cryptographic Protection"
  applicable_baselines: ["low", "moderate", "high"]
```

### For Finding Reports

When generating finding reports with FedRAMP context:

```markdown
## Finding: Weak TLS Configuration

**Severity:** High
**FedRAMP Impact:** Critical for all baselines

**Affected Controls:**

- SC-8: Transmission Confidentiality and Integrity
- SC-13: Cryptographic Protection

**Baseline Requirements:**

- Low: SC-8, SC-13 (required)
- Moderate: SC-8, SC-8(1), SC-13 (required)
- High: SC-8, SC-8(1), SC-8(2), SC-13 (required)

**Recommendation:** Upgrade to TLS 1.2+ and disable weak cipher suites to meet FedRAMP requirements.

**POA&M Required:** Yes (if not implemented within 30 days)
```

---

## Control Enhancement Notation

NIST 800-53 uses control enhancements with numeric suffixes:

- **SI-2**: Base control (Flaw Remediation)
- **SI-2(1)**: Enhancement 1 (Central Management)
- **SI-2(2)**: Enhancement 2 (Automated Flaw Remediation)
- **SI-2(3)**: Enhancement 3 (Time to Remediate)

**FedRAMP typically requires:**

- **Low baseline:** Base controls only
- **Moderate baseline:** Base + select enhancements (e.g., SI-2(2))
- **High baseline:** Base + all moderate enhancements + additional (e.g., SI-2(6))

---

## Integration

### Called By

- Security capability developers tagging findings with compliance controls
- Security analysts generating POA&Ms for federal customers
- Compliance teams mapping assessment findings to FedRAMP requirements
- `/fedramp` command (if implemented)

### Requires (invoke before starting)

None - standalone skill (terminal skill for compliance mapping)

### Calls (during execution)

None - this skill provides reference data and mapping logic

### Pairs With (conditional)

| Skill                          | Trigger                                    | Purpose                                |
| ------------------------------ | ------------------------------------------ | -------------------------------------- |
| `mapping-to-iso-27001`         | When dual FedRAMP + ISO 27001 compliance   | Cross-map NIST 800-53 ↔ ISO Annex A    |
| `mapping-to-mitre-attack`      | When threat intelligence context needed    | ATT&CK technique → control mapping     |
| `mapping-to-cwe`               | When vulnerability classification needed   | CWE → control mapping                  |
| `cvss-scoring`                 | When severity scoring needed               | CVSS score influences POA&M priority   |
| `mapping-security-controls`    | When general control mapping needed        | Broader security control framework     |
| `threat-modeling-orchestrator` | When architecting security controls        | Threat model → control recommendations |

---

## References

Detailed documentation in `references/`:

- [finding-control-mappings.md](references/finding-control-mappings.md) - Complete finding type to control mappings
- [nist-800-53-controls.md](references/nist-800-53-controls.md) - Full NIST 800-53 Rev 5 control descriptions
- [fedramp-baselines.md](references/fedramp-baselines.md) - Complete Low/Moderate/High baseline matrices
- [poam-generation.md](references/poam-generation.md) - POA&M templates and examples
- [continuous-monitoring.md](references/continuous-monitoring.md) - ConMon frequency and methods
- [control-enhancements.md](references/control-enhancements.md) - Complete enhancement listings by baseline

---

## Anti-Patterns

**❌ Don't:** Map every finding to AC-1 (Access Control Policy)
**✅ Do:** Map to specific, actionable controls (AC-2, AC-3, AC-6)

**❌ Don't:** Ignore control enhancements (e.g., just SI-2)
**✅ Do:** Include baseline-specific enhancements (e.g., SI-2(2) for Moderate)

**❌ Don't:** Create POA&Ms for implemented controls
**✅ Do:** Only create POA&Ms for not implemented or partially implemented controls

**❌ Don't:** Use generic descriptions like "fix the issue"
**✅ Do:** Use specific remediation steps aligned with control requirements

**❌ Don't:** Map findings to controls not in the target baseline
**✅ Do:** Validate control is required for Low/Moderate/High before mapping

---

## Related Skills

| Skill                          | Purpose                                        |
| ------------------------------ | ---------------------------------------------- |
| `mapping-to-iso-27001`         | Map findings to ISO 27001/27002 Annex A controls (common for orgs needing both FedRAMP + ISO) |
| `mapping-to-mitre-attack`      | Map findings to ATT&CK techniques/tactics      |
| `mapping-to-mitre-d3fend`      | Map defensive techniques to D3FEND framework   |
| `mapping-to-cwe`               | Map vulnerabilities to CWE categories          |
| `mapping-to-sans-top-25`       | Map findings to SANS Top 25 vulnerabilities    |
| `cvss-scoring`                 | Calculate CVSS scores for findings             |
| `mapping-security-controls`    | General security control framework mapping     |
| `threat-modeling-orchestrator` | Architect security controls from threat models |
