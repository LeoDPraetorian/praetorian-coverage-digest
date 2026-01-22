---
name: mapping-to-fda-cybersecurity
description: Use when mapping security findings to FDA medical device cybersecurity guidance during capability development - provides premarket/postmarket requirements, severity classification framework, SBOM requirements, and coordinated disclosure guidance for healthcare compliance
allowed-tools: Read
---

# Mapping Findings to FDA Cybersecurity Guidance

**Help capability developers map security findings to FDA medical device cybersecurity requirements for regulatory compliance and patient safety.**

> **FDA Premarket Cybersecurity Guidance** (September 2023) establishes cybersecurity requirements for medical device 510(k) submissions, including SBOM documentation, vulnerability management plans, and coordinated disclosure procedures.

## When to Use

Use this skill when:

- Scanning medical devices or healthcare systems for security vulnerabilities
- Preparing premarket submissions (510(k)) with cybersecurity documentation
- Assessing postmarket surveillance requirements for vulnerability disclosure
- Classifying vulnerabilities using FDA's exploitability + patient harm framework
- Creating Software Bill of Materials (SBOM) for medical device submissions
- Determining coordinated vulnerability disclosure timelines for medical devices

## Critical Rules

### 1. Use FDA Severity Classification (Dual-Axis)

FDA requires **both** exploitability AND patient harm assessment, not just CVSS scores.

| FDA Severity | Exploitability | Patient Harm    | Action Required      |
| ------------ | -------------- | --------------- | -------------------- |
| **Critical** | High           | Severe/Death    | Immediate patch      |
| **High**     | High           | Moderate harm   | 30-day timeline      |
| **Medium**   | Low            | Moderate harm   | 90-day timeline      |
| **Low**      | Low            | Minimal/no harm | Standard patch cycle |

### 2. Premarket vs Postmarket Requirements

| Phase      | Requirements                              | Documentation             |
| ---------- | ----------------------------------------- | ------------------------- |
| Premarket  | Cybersecurity plan, threat model, SBOM    | 510(k) submission package |
| Postmarket | Vulnerability monitoring, patch lifecycle | Annual postmarket reports |

### 3. SBOM (Software Bill of Materials) Requirements

All medical device software **MUST** include SBOM documentation for 510(k) submissions:

- Component name, version, supplier
- Known vulnerabilities (CVE references)
- License information
- Dependency relationships

**Format:** SPDX 2.3+ or CycloneDX 1.4+

---

## Quick Reference

### Premarket Requirements (510(k) Submission)

| Document                 | FDA Requirement | Purpose                          |
| ------------------------ | --------------- | -------------------------------- |
| Cybersecurity Plan       | Mandatory       | Risk management and threat model |
| SBOM                     | Mandatory       | Software component inventory     |
| Vulnerability Disclosure | Mandatory       | Coordinated disclosure process   |
| Security Testing Report  | Recommended     | Penetration testing results      |
| Access Control Matrix    | Recommended     | Authentication/authorization     |
| Data Protection Plan     | Mandatory       | Encryption and data integrity    |

### Postmarket Requirements

| Requirement              | Timeline   | Regulatory Reference         |
| ------------------------ | ---------- | ---------------------------- |
| Vulnerability monitoring | Continuous | 21 CFR 822                   |
| Security updates         | Risk-based | FDA Postmarket Guidance      |
| Incident reporting       | 30 days    | MDR (Medical Device Reports) |
| Annual postmarket report | Yearly     | 21 CFR 822                   |

### Vulnerability Severity (Patient Harm)

| Patient Harm Level | Description                             | Examples                              |
| ------------------ | --------------------------------------- | ------------------------------------- |
| **Severe/Death**   | Could result in death or serious injury | Insulin pump dosage manipulation      |
| **Moderate**       | Could result in temporary injury        | False alarm suppression on monitor    |
| **Minimal**        | No direct patient harm                  | Delayed diagnostic result display     |
| **None**           | No patient impact                       | Administrative interface cosmetic bug |

---

## Mapping Security Findings to FDA Requirements

### Cloud Security (Medical Device Backend)

| Vulnerability Pattern      | Patient Harm | FDA Severity | Premarket Requirement | Postmarket Action     |
| -------------------------- | ------------ | ------------ | --------------------- | --------------------- |
| Public S3 with PHI         | Severe       | Critical     | Data protection plan  | Immediate patching    |
| Exposed API (device data)  | Moderate     | High         | Access control matrix | 30-day disclosure     |
| Missing MFA (clinician UI) | Moderate     | High         | Authentication design | Security update       |
| Weak encryption (at-rest)  | Severe       | Critical     | Encryption standards  | Immediate remediation |
| CloudTrail disabled        | Minimal      | Medium       | Audit logging plan    | 90-day timeline       |

### Medical Device Interface Security

| Vulnerability Pattern          | Patient Harm | FDA Severity | Premarket Requirement   | Postmarket Action |
| ------------------------------ | ------------ | ------------ | ----------------------- | ----------------- |
| Unauthenticated device control | Severe       | Critical     | Access control matrix   | Recall possible   |
| Weak device pairing            | Moderate     | High         | Authentication design   | Coordinated patch |
| Cleartext communication        | Severe       | Critical     | Encryption requirements | Immediate update  |
| Command injection in firmware  | Severe       | Critical     | Security testing report | Recall possible   |
| Default credentials            | High         | Critical     | Password policy         | Mandatory update  |

### Network & Infrastructure

| Vulnerability Pattern     | Patient Harm | FDA Severity | Premarket Requirement | Postmarket Action |
| ------------------------- | ------------ | ------------ | --------------------- | ----------------- |
| Open ports on device      | Moderate     | Medium       | Network architecture  | Risk assessment   |
| Missing network isolation | Moderate     | High         | Network segmentation  | Configuration fix |
| Vulnerable TLS version    | Moderate     | High         | Encryption standards  | Security update   |
| Exposed debug interface   | High         | Critical     | Security design       | Immediate patch   |

### Software Supply Chain

| Vulnerability Pattern       | Patient Harm | FDA Severity | Premarket Requirement | Postmarket Action      |
| --------------------------- | ------------ | ------------ | --------------------- | ---------------------- |
| Vulnerable dependency (CVE) | Variable     | Risk-based   | SBOM documentation    | Assess + patch if high |
| Outdated OS/framework       | Moderate     | Medium       | SBOM + update plan    | Planned update         |
| Unsigned firmware           | High         | Critical     | Code signing          | Mandatory signing      |
| Leaked credentials in code  | Severe       | Critical     | Secret management     | Immediate rotation     |

---

## Decision Trees

### "Which FDA Requirement Applies?"

```
Is this a new device submission?
├─ Yes → Premarket (510(k))
│   ├─ Need cybersecurity plan?
│   │   └─ YES - Mandatory for all devices (2023 guidance)
│   ├─ Need SBOM?
│   │   └─ YES - Mandatory (SPDX 2.3+ or CycloneDX 1.4+)
│   ├─ Need threat model?
│   │   └─ YES - Risk-based approach
│   └─ Need security testing?
│       └─ RECOMMENDED - Penetration testing report
│
└─ No → Postmarket
    ├─ Is this a vulnerability?
    │   ├─ Critical (patient harm + high exploitability)?
    │   │   └─ Immediate disclosure + patch
    │   ├─ High severity?
    │   │   └─ 30-day coordinated disclosure
    │   └─ Medium/Low severity?
    │       └─ 90-day disclosure or standard cycle
    │
    └─ Need to report to FDA?
        ├─ Could cause death/serious injury?
        │   └─ YES - MDR report within 30 days
        └─ Requires device modification?
            └─ Postmarket surveillance report
```

### "What is the FDA Severity?"

```
Vulnerability detected:

Step 1: Assess Patient Harm
├─ Could cause death or serious injury?
│   └─ Patient Harm = SEVERE
├─ Could cause temporary/reversible injury?
│   └─ Patient Harm = MODERATE
├─ Could delay or degrade functionality?
│   └─ Patient Harm = MINIMAL
└─ No patient impact?
    └─ Patient Harm = NONE

Step 2: Assess Exploitability
├─ Remotely exploitable + no auth required?
│   └─ Exploitability = HIGH
├─ Local access or authentication required?
│   └─ Exploitability = MEDIUM
└─ Requires physical access or complex conditions?
    └─ Exploitability = LOW

Step 3: Determine FDA Severity
├─ SEVERE + HIGH → CRITICAL
├─ MODERATE/SEVERE + HIGH → HIGH
├─ MODERATE + LOW → MEDIUM
└─ MINIMAL/NONE + ANY → LOW
```

### "Do I Need Coordinated Disclosure?"

```
Found vulnerability in deployed medical device:

Is it exploitable remotely?
├─ Yes → Coordinated disclosure required
│   ├─ CRITICAL severity (patient harm possible)?
│   │   └─ 0-day disclosure + immediate patch
│   ├─ HIGH severity?
│   │   └─ 30-day coordinated timeline
│   └─ MEDIUM/LOW severity?
│       └─ 90-day coordinated timeline
│
└─ No (local/physical only)
    ├─ Could cause patient harm?
    │   └─ Report to manufacturer + standard patch cycle
    └─ No patient harm?
        └─ Standard vulnerability disclosure
```

---

## Common Mistakes

### 1. Using Only CVSS Scores

**Wrong:** Classifying vulnerability as "CVSS 7.5 = High severity"

FDA requires **patient harm assessment**, not just technical exploitability.

| ❌ Wrong            | ✅ Correct                                |
| ------------------- | ----------------------------------------- |
| CVSS 9.0 = Critical | CVSS 9.0 + Patient Harm Assessment        |
| Network exposure    | Network + authentication + patient impact |
| SQL injection       | SQL injection + data type + harm level    |

### 2. Ignoring Premarket vs Postmarket Context

| Question                         | Answer                 | Requirement Type          |
| -------------------------------- | ---------------------- | ------------------------- |
| "Is this a new device?"          | → Premarket (510(k))   | Cybersecurity plan + SBOM |
| "Found vuln in deployed device?" | → Postmarket           | Coordinated disclosure    |
| "Testing prototype?"             | → Premarket validation | Security testing report   |

### 3. Missing SBOM Documentation

**All software components MUST be documented:**

```json
{
  "component": "openssl",
  "version": "1.1.1k",
  "supplier": "OpenSSL Project",
  "cve": ["CVE-2021-3711"],
  "license": "Apache-2.0"
}
```

### 4. Confusing MDR (Medical Device Reporting) with CVD (Coordinated Vulnerability Disclosure)

| Requirement | Trigger                           | Timeline   | Recipient          |
| ----------- | --------------------------------- | ---------- | ------------------ |
| **MDR**     | Device malfunction/death/injury   | 30 days    | FDA                |
| **CVD**     | Security vulnerability discovered | 30-90 days | Manufacturer + FDA |

### 5. Not Considering Device Classification

| Device Class | Risk Level | Premarket Requirement    | Example                  |
| ------------ | ---------- | ------------------------ | ------------------------ |
| Class III    | High       | Premarket Approval (PMA) | Pacemakers, ventilators  |
| Class II     | Moderate   | 510(k) clearance         | Infusion pumps, monitors |
| Class I      | Low        | General controls         | Bandages, stethoscopes   |

**Higher class = stricter cybersecurity requirements.**

---

## Integration with Capability Development

### Nebula/Diocletian Pattern (Medical Device Scanning)

```go
finding := &tabularium.Finding{
    Title:       "Unauthenticated Infusion Pump Command Interface",
    Description: "Insulin pump accepts commands without authentication, could allow remote dosage manipulation",
    CWE:         "CWE-306",   // Missing Authentication
    Severity:    "Critical",
    FDA: FDAClassification{
        PatientHarm:      "Severe",        // Could cause death
        Exploitability:   "High",          // Network accessible
        Severity:         "Critical",
        PremarketReq:     "Access control matrix, authentication design",
        PostmarketAction: "Immediate patch + MDR report",
        DeviceClass:      "III",
    },
}
```

### Janus Capability Pattern (Medical Device Backend)

```go
capability := &Capability{
    Name: "detect-exposed-medical-device-apis",
    Findings: []Finding{
        {
            Title:       "Medical Device API Exposed Without Authentication",
            CWE:         "CWE-306",
            Severity:    "High",
            FDA: FDAClassification{
                PatientHarm:      "Moderate",  // Could alter readings
                Exploitability:   "High",      // Internet-facing
                Severity:         "High",
                PremarketReq:     "Authentication + encryption design",
                PostmarketAction: "30-day coordinated disclosure",
            },
        },
    },
}
```

### Validation Checklist

Before finalizing FDA classification:

1. ✅ Did I assess **both** exploitability AND patient harm?
2. ✅ Did I determine if this is premarket or postmarket context?
3. ✅ Is SBOM documentation included (premarket)?
4. ✅ Is the device class (I/II/III) identified?
5. ✅ Does the severity match FDA's dual-axis framework?
6. ✅ Are coordinated disclosure timelines specified?
7. ✅ Would a medical device regulatory specialist agree?

---

## SBOM Requirements

### Required SBOM Fields (FDA 2023 Guidance)

| Field             | Requirement | Example              |
| ----------------- | ----------- | -------------------- |
| Component name    | Mandatory   | "openssl"            |
| Component version | Mandatory   | "1.1.1k"             |
| Supplier          | Mandatory   | "OpenSSL Project"    |
| Known CVEs        | Mandatory   | ["CVE-2021-3711"]    |
| License           | Recommended | "Apache-2.0"         |
| Dependency tree   | Recommended | Direct vs transitive |
| Hash/checksum     | Recommended | SHA-256              |

### SBOM Format Standards

| Format    | Version         | FDA Accepted | Notes                      |
| --------- | --------------- | ------------ | -------------------------- |
| SPDX      | 2.3+            | ✅ Yes       | ISO/IEC 5962:2021 standard |
| CycloneDX | 1.4+            | ✅ Yes       | OWASP project              |
| SWID      | ISO/IEC 19770-2 | ✅ Yes       | Legacy format              |

---

## Coordinated Vulnerability Disclosure (CVD)

### Timeline Requirements

| Severity | Disclosure Window | Patch Deadline | FDA Notification |
| -------- | ----------------- | -------------- | ---------------- |
| Critical | 0-7 days          | Immediate      | Same day         |
| High     | 30 days           | 30 days        | Within 5 days    |
| Medium   | 90 days           | 90 days        | Within 30 days   |
| Low      | Standard cycle    | Next release   | Annual report    |

### CVD Stakeholders

1. **Manufacturer** - Device vendor (primary recipient)
2. **FDA** - Regulatory notification (MedWatch or CDRH)
3. **ICS-CERT** - DHS coordination (critical infrastructure)
4. **Customers** - Healthcare facilities using the device

### CVD Process

```
Discovery → Vendor notification → FDA notification → Joint assessment
→ Patch development → Coordinated release → Public disclosure
```

---

## References

| Reference                                                           | Content                                                               |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [premarket-requirements.md](references/premarket-requirements.md)   | Complete 510(k) cybersecurity checklist                               |
| [postmarket-requirements.md](references/postmarket-requirements.md) | Vulnerability management and disclosure                               |
| [sbom-templates.md](references/sbom-templates.md)                   | SPDX and CycloneDX SBOM examples                                      |
| [severity-classification.md](references/severity-classification.md) | Patient harm + exploitability decision trees, Tier 1/2 classification |

## External Sources

- [FDA Premarket Cybersecurity Guidance (2023)](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cybersecurity-medical-devices-quality-system-considerations-and-content-premarket-submissions)
- [FDA Postmarket Cybersecurity Guidance (2016)](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/postmarket-management-cybersecurity-medical-devices)
- [FDA SBOM Requirements](https://www.fda.gov/medical-devices/software-medical-device-samd/cybersecurity)
- [21 CFR 822 - Postmarket Surveillance](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-822)

---

## Integration

### Called By

- Capability developers scanning medical devices or healthcare systems
- Security engineers preparing 510(k) submissions
- Vulnerability researchers performing coordinated disclosure

### Requires (invoke before starting)

| Skill                      | When                      | Purpose                           |
| -------------------------- | ------------------------- | --------------------------------- |
| `mapping-to-cwe`           | Classifying vulnerability | CWE mapping for FDA documentation |
| `calculating-cvss-vectors` | Technical severity        | CVSS supplement to patient harm   |

### Calls (during execution)

None - terminal skill

### Pairs With (conditional)

| Skill                     | Trigger                     | Purpose                         |
| ------------------------- | --------------------------- | ------------------------------- |
| `mapping-to-mitre-attack` | Threat intelligence context | ATT&CK mapping for threat model |
| `mapping-to-sans-top-25`  | Risk prioritization         | Cross-reference with SANS       |

---

## Related Skills

| Skill                      | Purpose                             |
| -------------------------- | ----------------------------------- |
| `mapping-to-cwe`           | Map findings to CWE identifiers     |
| `mapping-to-mitre-attack`  | Map to adversary tactics/techniques |
| `calculating-cvss-vectors` | Determine CVSS scores for findings  |
| `mapping-to-sans-top-25`   | Cross-reference with SANS Top 25    |
