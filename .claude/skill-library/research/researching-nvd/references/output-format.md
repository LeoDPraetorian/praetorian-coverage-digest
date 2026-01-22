# Output Format for NVD Research

**Structured output templates for CVE research findings.**

## Standard Research Output

### Complete Research Document

```markdown
## NVD Research: {topic}

**Date:** {YYYY-MM-DD}
**Researcher:** {Name/Team}
**Purpose:** {Research context - capability development, prioritization, threat intel}

---

### Executive Summary

{2-3 paragraphs summarizing:}

- Number of CVEs found
- CVSS severity distribution
- Key affected products
- CISA KEV cross-reference results
- Recommended immediate actions

---

### Search Queries Used

1. **{query1}** - {N} results
   - API: `https://services.nvd.nist.gov/rest/json/cves/2.0?{params}`
   - Filter: {severity/date/CPE filter applied}

2. **{query2}** - {N} results
   - API: `https://services.nvd.nist.gov/rest/json/cves/2.0?{params}`
   - Filter: {severity/date/CPE filter applied}

---

### CVEs Found

#### 1. CVE-YYYY-NNNNN: {Short Description}

- **Published:** {YYYY-MM-DD}
- **Last Modified:** {YYYY-MM-DD}
- **CVSS v3.1:** {score} ({CRITICAL/HIGH/MEDIUM/LOW})
- **Vector:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`
- **Vector Breakdown:**
  - Attack Vector: Network (remotely exploitable)
  - Attack Complexity: Low (easy exploitation)
  - Privileges Required: None (unauthenticated)
  - User Interaction: None (no victim action)
  - Scope: Unchanged (contained impact)
  - Impact: High on Confidentiality/Integrity/Availability
- **CWE:** {CWE-ID} - {weakness-name} (e.g., CWE-79 - Cross-site Scripting)
- **Affected Products (CPE):**
  - `cpe:2.3:a:vendor:product:version:*:*:*:*:*:*:*`
  - Version range: {start} to {end}
- **Description:** {full-description-from-NVD}
- **References:**
  - Vendor Advisory: [Link]
  - Patch: [Link]
  - Exploit Code: [Link] (if public)
- **CISA KEV Status:** {In KEV / Not in KEV}
- **Priority:** {P0/P1/P2/P3/P4} (based on CVSS + KEV)
- **NVD Link:** [View Full Details](https://nvd.nist.gov/vuln/detail/{CVE-ID})

#### 2. CVE-YYYY-NNNNN: {Short Description}

{Repeat structure above for each CVE}

---

### Analysis and Synthesis

#### CVSS Severity Distribution

| CVSS Severity | Count | Percentage | Action Required    |
| ------------- | ----- | ---------- | ------------------ |
| CRITICAL      | X     | X%         | Immediate patching |
| HIGH          | X     | X%         | Urgent patching    |
| MEDIUM        | X     | X%         | Standard timeline  |
| LOW           | X     | X%         | Low priority       |

#### CWE Distribution

| CWE ID  | Weakness Type        | Count | Notes               |
| ------- | -------------------- | ----- | ------------------- |
| CWE-79  | Cross-site Scripting | X     | Client-side attacks |
| CWE-89  | SQL Injection        | X     | Database attacks    |
| CWE-787 | Out-of-bounds Write  | X     | Memory corruption   |

#### Affected Product Families

| Vendor     | Product     | Versions Affected | CVE Count |
| ---------- | ----------- | ----------------- | --------- |
| {Vendor 1} | {Product 1} | {X.X - Y.Y}       | X         |
| {Vendor 2} | {Product 2} | {All versions}    | X         |

#### CISA KEV Cross-Reference

**CVEs In KEV Catalog:** {count} ({percentage}%)

| CVE ID          | CVSS | KEV Date Added | Due Date   | Priority |
| --------------- | ---- | -------------- | ---------- | -------- |
| CVE-YYYY-000001 | 9.8  | 2024-MM-DD     | 2024-MM-DD | P0       |
| CVE-YYYY-000002 | 8.1  | 2024-MM-DD     | 2024-MM-DD | P1       |

**CVEs Not In KEV:** {count} ({percentage}%)

- No confirmed exploitation per CISA
- Monitor for KEV addition
- Lower priority unless high CVSS + exposure

---

### Prioritization Matrix

| Priority | CVE ID          | CVSS | KEV Status | Rationale                              |
| -------- | --------------- | ---- | ---------- | -------------------------------------- |
| P0       | CVE-YYYY-000001 | 9.8  | In KEV     | Critical + Actively exploited          |
| P0       | CVE-YYYY-000002 | 9.3  | In KEV     | Critical + KEV = emergency             |
| P1       | CVE-YYYY-000003 | 8.1  | In KEV     | High + Exploited = urgent              |
| P2       | CVE-YYYY-000004 | 9.1  | Not in KEV | Critical but no exploitation confirmed |
| P3       | CVE-YYYY-000005 | 7.5  | Not in KEV | High severity, monitor for KEV         |

**Priority Legend:**

- **P0 (Critical):** CVSS ≥9.0 AND In KEV - Immediate action
- **P1 (High):** CVSS ≥7.0 AND In KEV - Urgent (24-48 hours)
- **P2 (Medium):** CVSS ≥9.0 AND Not in KEV - High priority
- **P3 (Standard):** CVSS 7.0-8.9 AND Not in KEV - Standard timeline
- **P4 (Low):** CVSS <7.0 - Low priority

---

### Detection and Capability Gaps

#### Existing Coverage

{List capabilities/detections already in place:}

- Nuclei Template 1: Covers CVE-YYYY-NNNNN
- VQL Capability 2: Detects CWE-79 patterns
- Scanner Config 3: Identifies affected versions

#### Coverage Gaps

1. **Gap 1:** No detection for {CWE/attack-pattern}
   - Affected CVEs: CVE-YYYY-NNNNN, CVE-YYYY-NNNNN
   - Recommendation: Create Nuclei template for {pattern}

2. **Gap 2:** No CPE-based version detection for {product}
   - Affected CVEs: CVE-YYYY-NNNNN
   - Recommendation: Add CPE matching to scanner

---

### Recommendations

#### Immediate Actions (P0 - Next 24 Hours)

1. **CVE-YYYY-NNNNN: {Vulnerability Name}**
   - Action: Apply vendor patch v{X.X.X}
   - Affected Systems: {Count} ({list})
   - Owner: {Team/Person}
   - Verification: Run vulnerability scanner post-patch

2. **CVE-YYYY-NNNNN: {Vulnerability Name}**
   {Repeat structure}

#### Urgent Actions (P1 - Next 48-72 Hours)

{List P1 priority CVEs with action plans}

#### Standard Timeline (P2/P3 - Next 2-4 Weeks)

{List P2/P3 priority CVEs with action plans}

#### Detection Development

1. **Nuclei Template:** {CWE pattern detection}
   - Based on: CVE-YYYY-NNNNN exploitation pattern
   - Priority: High
   - Estimated Effort: {Hours/Days}

2. **VQL Capability:** {Attack detection logic}
   - Based on: CVE-YYYY-NNNNN, CVE-YYYY-NNNNN
   - Priority: Medium
   - Estimated Effort: {Hours/Days}

---

### Related CVEs

{Optional: List related CVEs not yet assigned CVSS or in analysis:}

- **CVE-YYYY-NNNNN:** Related to {primary CVE}, pending analysis
- **CVE-YYYY-NNNNN:** Same product family, monitor status

---

### References and Resources

#### NVD Resources

- [NVD Home](https://nvd.nist.gov/)
- [NVD API Documentation](https://nvd.nist.gov/developers)
- [CVSS v3.1 Calculator](https://www.first.org/cvss/calculator/3.1)

#### CISA Resources

- [CISA KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- [BOD 22-01](https://www.cisa.gov/news-events/directives/bod-22-01)

#### Vendor Security Advisories

- {Vendor 1}: [Security Advisory URL]
- {Vendor 2}: [Security Advisory URL]

#### Community Resources

- {Blog post analyzing exploitation}
- {GitHub POC/exploit repo} (if applicable)
- {Security researcher analysis}

---

### Changelog

- **{Date}:** Initial research
- **{Date}:** Updated with new CVEs
- **{Date}:** KEV cross-reference updated
```

## Mode 2: Orchestrated Output (orchestrating-research)

When invoked by `orchestrating-research` with `OUTPUT_DIR` provided:

**File:** `${OUTPUT_DIR}/nvd.md`

**Simplified format for integration:**

```markdown
# NVD Research Results

## Interpretation: {interpretation from orchestrating-research}

### Key Findings

- {Finding 1: CVSS distribution}
- {Finding 2: KEV status}
- {Finding 3: Affected products}

### Patterns Observed

- {Pattern 1: Common CWE types}
- {Pattern 2: Vendor concentration}
- {Pattern 3: CVSS score patterns}

### Cross-Reference with CISA KEV

- CVEs in KEV: {count} ({percentage}%)
- CVEs not in KEV: {count} ({percentage}%)
- Priority shift: {how KEV changes priorities}

### Sources

{List of NVD API URLs queried}

### Confidence

{0.0-1.0 based on data completeness}

**Note:** NVD data is authoritative (NIST maintained, confidence: 1.0 for CVE details)
```

## Quick Reference Output (CLI/Dashboard)

For rapid triage and status updates:

```
NVD Research Summary
====================

Query: {search-term}
Date: {YYYY-MM-DD}
Results: {N} CVEs

CVSS Distribution:
CRITICAL: {count} ({percentage}%)
HIGH: {count} ({percentage}%)
MEDIUM: {count} ({percentage}%)
LOW: {count} ({percentage}%)

KEV Cross-Reference:
In KEV: {count} (actively exploited)
Not in KEV: {count} (no exploitation confirmed)

Priority Breakdown:
P0 (CRITICAL + KEV): {count}
P1 (HIGH + KEV): {count}
P2 (CRITICAL, no KEV): {count}
P3 (HIGH, no KEV): {count}
P4 (MEDIUM/LOW): {count}
```

## Capability Development Output

When research is for creating detection capabilities:

```markdown
## Detection Capability: {CVE-ID} / {CWE-ID}

**Based on:** NVD Research {date}

### Threat Context

- **CVE:** {CVE-ID}
- **CVSS:** {score} ({severity})
- **CWE:** {CWE-ID} - {weakness-type}
- **CISA KEV:** {In KEV / Not in KEV}
- **Attack Vector:** {from CVSS vector}

### Detection Logic

{Based on CWE and CVE technical details}

### Nuclei Template / VQL Capability Stub

{Implementation guidance}

### References

- NVD: [Link]
- Vendor Advisory: [Link]
- CISA KEV: [Link] (if applicable)
```

## Related References

- [Query Patterns](query-patterns.md) - NVD API construction
- [CVSS Interpretation](cvss-interpretation.md) - Score/vector breakdown
- [CPE Syntax](cpe-syntax.md) - Product matching
