# CVSS v4.0 Changes from v3.1

**Migration guide highlighting key differences between CVSS v3.1 and v4.0.**

## Overview

CVSS v4.0 was released in November 2023 with significant enhancements for granularity and context.

**Key principle:** v4.0 is **NOT backward compatible** with v3.1. Scores cannot be directly compared across versions.

---

## Major Changes

### 1. New Base Metric: Attack Requirements (AT)

**Replaces:** Aspects of Attack Complexity (AC) in v3.1

**Purpose:** Captures prerequisite deployment/execution conditions distinct from complexity.

| Value       | Description                                                           |
| ----------- | --------------------------------------------------------------------- |
| **None**    | No deployment or execution conditions required                        |
| **Present** | Specific conditions must exist (race conditions, network position, etc.) |

**Examples:**
- Race condition vulnerabilities → AT:Present
- Time-of-check-to-time-of-use (TOCTOU) → AT:Present
- Standard SQL injection → AT:None

**v3.1 Equivalent:** Partially captured in AC:H

---

### 2. Impact Metric Split: Vulnerable vs Subsequent Systems

**Change:** CVSS v4.0 separates impact into two categories:

1. **Vulnerable System Impact** - Direct impact on the vulnerable component
2. **Subsequent System Impact** - Impact on other components/systems

**Metrics affected:**
- Confidentiality: VC (Vulnerable) + SC (Subsequent)
- Integrity: VI (Vulnerable) + SI (Subsequent)
- Availability: VA (Vulnerable) + SA (Subsequent)

**Example:**
- XSS in web app:
  - VC:L (limited data from vulnerable page)
  - SC:H (can access user's data across all integrated apps)

**v3.1 Equivalent:** Partially captured by Scope (S) metric

---

### 3. Scope (S) Metric Removed

**CRITICAL:** The controversial Scope metric from v3.1 has been removed.

**Replaced by:** Vulnerable/Subsequent System impact split (see above)

**Why removed:** Scope was frequently misunderstood and over-inflated scores.

**Migration:**
- v3.1 S:U → v4.0 focus on Vulnerable System metrics
- v3.1 S:C → v4.0 use Subsequent System metrics with appropriate values

---

### 4. New Supplemental Metrics

**Purpose:** Provide context **without affecting Base Score**.

| Metric                             | Values                          | Purpose                                      |
| ---------------------------------- | ------------------------------- | -------------------------------------------- |
| **Safety (S)**                     | Not Defined, Present            | Human injury potential (IEC 61508 standard)  |
| **Automatable (AU)**               | No, Yes                         | Can all kill chain steps be automated?       |
| **Recovery (R)**                   | Not Defined, Auto, User, Irrecoverable | System resilience post-attack          |
| **Value Density (V)**              | Diffuse, Concentrated           | Resource concentration                       |
| **Vulnerability Response Effort (RE)** | None, Low, Moderate, High   | Remediation difficulty                       |
| **Provider Urgency (U)**           | Clear, Green, Amber, Red        | Vendor severity assessment                   |

**Key insight:** These **do NOT** affect the numeric CVSS score. They provide qualitative context.

---

### 5. Modified User Interaction (UI)

**v3.1 values:** None (N), Required (R)

**v4.0 values:** None (N), Passive (P), Active (A)

**New granularity:**
- **Passive (P):** User unknowingly triggers (e.g., viewing malicious image)
- **Active (A):** User deliberately performs action (e.g., clicking link, running file)

**Migration:**
- v3.1 UI:N → v4.0 UI:N
- v3.1 UI:R → v4.0 UI:P or UI:A (depends on action type)

---

## Nomenclature Clarity

CVSS v4.0 introduces precise nomenclature for score reporting:

| Notation   | Includes                          | Use Case                          |
| ---------- | --------------------------------- | --------------------------------- |
| **CVSS-B** | Base metrics only                 | Initial vulnerability assessment  |
| **CVSS-BT** | Base + Threat metrics             | With exploit availability context |
| **CVSS-BE** | Base + Environmental metrics      | Organization-specific context     |
| **CVSS-BTE** | Base + Threat + Environmental    | Complete contextualized scoring   |

**Why important:** Enables score comparability - "CVSS-B 7.5" vs "CVSS-BTE 8.2" shows which metrics were assessed.

---

## Migration Examples

### Example 1: SQL Injection

**v3.1:**
```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
Score: 9.1 (CRITICAL)
```

**v4.0:**
```
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N
Score: 9.3 (CRITICAL)

Changes:
- Added AT:N (no attack requirements)
- Split impact: VC/VI/VA (vulnerable), SC/SI/SA (subsequent)
- Removed S (Scope)
```

### Example 2: XSS with User Interaction

**v3.1:**
```
CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N
Score: 6.1 (MEDIUM)
```

**v4.0:**
```
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:N/VA:N/SC:L/SI:L/SA:N
Score: 5.4 (MEDIUM)

Changes:
- Added AT:N (no attack requirements)
- UI:R → UI:A (active user interaction - clicking link)
- S:C removed, now represented as SC:L/SI:L (subsequent system impact)
- VC/VI/VA:N (no direct vulnerable system impact)
```

---

## When to Use v3.1 vs v4.0

### Use CVSS v3.1 when:
- Industry standard compatibility required (most CVEs still use v3.1)
- Integration with existing tools/processes (NVD, CVSS calculators)
- Organizational policy requires v3.1
- Simpler scoring process preferred

### Use CVSS v4.0 when:
- Need improved granularity (attack requirements, impact split)
- Want to avoid Scope (S) inflation issues
- Require supplemental metrics (safety, automatability)
- Organization has adopted v4.0 as standard

**Current adoption (2026):** v3.1 is still dominant. v4.0 adoption is growing but not yet universal.

---

## Common Migration Mistakes

### ❌ Mistake 1: Direct Score Conversion

**WRONG:** "v3.1 score 7.5 = v4.0 score 7.5"

**RIGHT:** Rescore using v4.0 calculator. Scores are NOT equivalent.

### ❌ Mistake 2: Ignoring AT (Attack Requirements)

**WRONG:** Leaving AT unspecified or defaulting to N

**RIGHT:** Evaluate if specific conditions required (race condition, network position, etc.)

### ❌ Mistake 3: Treating Supplemental Metrics as Required

**WRONG:** Scoring all 6 supplemental metrics for every finding

**RIGHT:** Use supplemental metrics only when context adds value. Base score is sufficient for most findings.

### ❌ Mistake 4: Not Separating Vulnerable/Subsequent Impact

**WRONG:** Using only VC/VI/VA and leaving SC/SI/SA as N

**RIGHT:** Analyze both direct and downstream impacts separately

---

## Transition Strategy

If your organization is transitioning from v3.1 to v4.0:

1. **Dual Scoring Period:** Score critical findings in both versions during transition (6-12 months)
2. **Tool Updates:** Ensure CVSS calculators, vulnerability scanners support v4.0
3. **Training:** Educate security team on new metrics (AT, impact split, supplemental)
4. **Policy Update:** Document which version to use and when
5. **Historical Compatibility:** Maintain v3.1 scores for historical comparison

---

## Resources

- [CVSS v4.0 Specification](https://www.first.org/cvss/v4-0/specification-document)
- [CVSS v4.0 Calculator](https://www.first.org/cvss/calculator/4.0)
- [CVSS v4.0 User Guide](https://www.first.org/cvss/v4-0/user-guide)
- [CVSS v3.1 to v4.0 Migration Guide](https://www.first.org/cvss/v4-0/migration-guide)
