# Output Format for CISA KEV Research

**Structured output templates for vulnerability research findings.**

## Standard Research Output

### Complete Research Document

```markdown
## CISA KEV Research: {topic}

**Date:** {YYYY-MM-DD}
**Researcher:** {Name/Team}
**Purpose:** {Research context - capability development, threat intelligence, compliance, etc.}

---

### Executive Summary

{2-3 paragraphs summarizing:}

- Number of CVEs found
- Key vendors/products affected
- Most urgent vulnerabilities (by due date)
- Common attack vectors
- Recommended immediate actions

---

### Search Queries Used

1. **{query1}** - {N} results
   - Filter: `field_date_added_wrapper={30|60|90|all}`
   - Items per page: {20|50|100}
   - URL: [CISA KEV Search](https://www.cisa.gov/...)

2. **{query2}** - {N} results
   - Filter: `field_date_added_wrapper={30|60|90|all}`
   - Items per page: {20|50|100}
   - URL: [CISA KEV Search](https://www.cisa.gov/...)

3. **{query3}** - {N} results
   - Filter: `field_date_added_wrapper={30|60|90|all}`
   - Items per page: {20|50|100}
   - URL: [CISA KEV Search](https://www.cisa.gov/...)

---

### Known Exploited Vulnerabilities Found

#### 1. CVE-YYYY-NNNNN: {Vulnerability Name}

- **Vendor/Project:** {Vendor} / {Product}
- **Date Added to KEV:** {YYYY-MM-DD}
- **Due Date:** {YYYY-MM-DD} (Federal remediation deadline)
- **Days Until Due Date:** {X}
- **Vulnerability Class:** {RCE/Authentication Bypass/SQL Injection/Privilege Escalation/etc.}
- **Short Description:** {CISA-provided description}
- **Required Action:** {Apply updates/Apply mitigations/Disable feature/Remove product}
- **Exploitation Notes:** {Ransomware groups, APT actors, widespread campaigns, public exploits}
- **Environmental Relevance:** {Direct match/Similar product/Supply chain/Not applicable}
- **CISA KEV Link:** [View Full Details](https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext={CVE-ID})
- **NVD Link:** [NVD Entry](https://nvd.nist.gov/vuln/detail/{CVE-ID})

**Priority:** {Critical/High/Medium/Low} (Based on due date, relevance, exploitation context)

---

#### 2. CVE-YYYY-NNNNN: {Vulnerability Name}

{Repeat structure above for each CVE}

---

### Analysis and Synthesis

#### Attack Vector Distribution

| Attack Vector         | Count | Percentage |
| --------------------- | ----- | ---------- |
| Remote Code Execution | X     | X%         |
| Authentication Bypass | X     | X%         |
| SQL Injection         | X     | X%         |
| Privilege Escalation  | X     | X%         |
| Other                 | X     | X%         |

#### Affected Vendor Distribution

| Vendor     | CVE Count | High Priority |
| ---------- | --------- | ------------- |
| {Vendor 1} | X         | X             |
| {Vendor 2} | X         | X             |
| {Vendor 3} | X         | X             |

#### Exploitation Timeline

{2-3 paragraphs discussing:}

- When vulnerabilities were added to KEV (recent surge? steady?)
- Common exploitation patterns observed
- Notable threat actors or campaigns
- Relationship between date added and due date urgency

#### Remediation Complexity

| Complexity       | CVE Count | Notes                           |
| ---------------- | --------- | ------------------------------- |
| Simple Patch     | X         | Vendor patch available, tested  |
| Complex Patch    | X         | Patch with compatibility issues |
| Mitigation Only  | X         | No patch, workarounds available |
| No Fix Available | X         | EOL products, awaiting vendor   |

---

### Remediation Priority Matrix

| Priority | CVE ID          | Due Date   | Days Left | Product   | Relevance |
| -------- | --------------- | ---------- | --------- | --------- | --------- |
| P0       | CVE-YYYY-000001 | 2024-MM-DD | X         | {Product} | Direct    |
| P0       | CVE-YYYY-000002 | 2024-MM-DD | X         | {Product} | Direct    |
| P1       | CVE-YYYY-000003 | 2024-MM-DD | X         | {Product} | Similar   |
| P1       | CVE-YYYY-000004 | 2024-MM-DD | X         | {Product} | Direct    |
| P2       | CVE-YYYY-000005 | 2024-MM-DD | X         | {Product} | Indirect  |

**Priority Legend:**

- **P0 (Critical):** Due date ≤7 days, direct product match, active campaigns
- **P1 (High):** Due date 7-14 days, high relevance, known exploitation
- **P2 (Medium):** Due date 14-21 days, moderate relevance
- **P3 (Low):** Due date >21 days, low/no relevance

---

### Detection and Capability Gaps

#### Existing Coverage

{List capabilities/detections already in place:}

- Capability 1: Covers CVE-YYYY-NNNNN, CVE-YYYY-NNNNN
- Detection Rule 2: Covers attack pattern X
- Scanner Config 3: Identifies vulnerable versions

#### Coverage Gaps

{Identify what's missing:}

1. **Gap 1:** No detection for {attack pattern/vulnerability class}
   - Affected CVEs: CVE-YYYY-NNNNN, CVE-YYYY-NNNNN
   - Recommendation: Create Nuclei template for {pattern}

2. **Gap 2:** No version fingerprinting for {product}
   - Affected CVEs: CVE-YYYY-NNNNN
   - Recommendation: Add fingerprinting module

---

### Recommendations

#### Immediate Actions (Next 7 Days)

1. **CVE-YYYY-NNNNN: {Vulnerability Name}**
   - Action: {Patch/Mitigate/Disable/Remove}
   - Affected Systems: {Count}
   - Owner: {Team/Person}
   - Timeline: {Date}
   - Verification: {Scan/Test/Audit}

2. **CVE-YYYY-NNNNN: {Vulnerability Name}**
   {Repeat structure}

#### Short-Term Actions (Next 14-21 Days)

{List P1/P2 priority CVEs with action plans}

#### Detection Development

1. **Nuclei Template:** {Vulnerability pattern}
   - Based on: CVE-YYYY-NNNNN exploitation pattern
   - Priority: High
   - Effort: {Hours/Days}

2. **VQL Capability:** {Attack detection}
   - Based on: CVE-YYYY-NNNNN, CVE-YYYY-NNNNN
   - Priority: Medium
   - Effort: {Hours/Days}

---

### Threat Intelligence Context

#### Known Threat Actors

{List threat actors exploiting these vulnerabilities:}

- **{Threat Actor 1}:** Exploiting CVE-YYYY-NNNNN, CVE-YYYY-NNNNN
- **{Ransomware Group 2}:** Mass exploitation of CVE-YYYY-NNNNN

#### Exploitation Campaigns

{Describe known campaigns:}

- **Campaign 1:** {Description, timeline, targets}
- **Campaign 2:** {Description, timeline, targets}

#### IOCs and Detection Artifacts

{List any indicators of compromise mentioned:}

- File hashes: {MD5/SHA256}
- Network indicators: {IPs, domains, URLs}
- Behavioral patterns: {Process chains, registry keys}

---

### Related CVEs (Not in KEV)

{Optional: List related CVEs not yet in KEV but worth monitoring:}

- **CVE-YYYY-NNNNN:** Related to {KEV CVE}, not yet confirmed exploited
- **CVE-YYYY-NNNNN:** Same product family, monitor for KEV inclusion

---

### References and Resources

#### CISA Resources

- [KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- [BOD 22-01](https://www.cisa.gov/news-events/directives/bod-22-01)
- [Vendor Advisory Links]

#### Vendor Security Advisories

- {Vendor 1}: [Security Advisory URL]
- {Vendor 2}: [Security Advisory URL]

#### Community Resources

- {Blog post analyzing exploitation}
- {GitHub POC/exploit repo}
- {Security researcher analysis}

---

### Changelog

- **{Date}:** Initial research
- **{Date}:** Updated with new KEV additions
- **{Date}:** Remediation status updated
```

## Mode 2: Orchestrated Output (orchestrating-research)

When invoked by `orchestrating-research` with `OUTPUT_DIR` provided:

**File:** `${OUTPUT_DIR}/cisa-kev.md`

**Simplified format for integration:**

```markdown
# CISA KEV Research Results

## Interpretation: {interpretation from orchestrating-research}

### Key Findings

- {Finding 1}
- {Finding 2}
- {Finding 3}

### Patterns Observed

- {Pattern 1: Common vulnerability class}
- {Pattern 2: Vendor concentration}
- {Pattern 3: Exploitation timeline}

### Conflicts/Trade-offs

- {Any disagreements between KEV data and other sources}
- {Remediation vs business continuity trade-offs}

### Sources

{List of CISA KEV URLs queried}

### Confidence

{0.0-1.0 based on KEV data completeness}

**Note:** All entries in CISA KEV are confirmed exploited (confidence: 1.0 for exploitation status)
```

## Quick Reference Output (CLI/Dashboard)

For rapid triage and status updates:

```
CISA KEV Research Summary
=========================

Query: {search-term}
Date: {YYYY-MM-DD}
Results: {N} CVEs

Critical Priority (P0): {count}
- CVE-YYYY-001 | Due: MM-DD | {Product} | RCE
- CVE-YYYY-002 | Due: MM-DD | {Product} | Auth Bypass

High Priority (P1): {count}
- CVE-YYYY-003 | Due: MM-DD | {Product} | SQLi
- CVE-YYYY-004 | Due: MM-DD | {Product} | XSS

Medium Priority (P2): {count}
Low Priority (P3): {count}

Total Due Within 7 Days: {count}
Total Due Within 14 Days: {count}
```

## Capability Development Output

When research is for creating detection capabilities:

```markdown
## Detection Capability: {CVE-ID} Exploitation

**Based on:** CISA KEV Research {date}

### Threat Context

- **CVE:** {CVE-ID}
- **Vulnerability:** {Name}
- **Exploitation:** Confirmed active per CISA KEV (added {date})
- **Threat Actors:** {List from KEV notes}
- **Attack Vector:** {RCE/Auth Bypass/etc.}

### Detection Logic

{Based on exploitation patterns from KEV notes and vendor advisories}

### Nuclei Template / VQL Capability

{Stub for implementation}

### References

- CISA KEV: [Link]
- Vendor Advisory: [Link]
- Exploitation Analysis: [Link]
```

## Compliance Report Output

For tracking federal deadline compliance:

```markdown
## FCEB KEV Compliance Report

**Report Date:** {YYYY-MM-DD}
**Coverage:** {All/Specific Vendors/Products}

### Summary

- Total KEV CVEs in Scope: {count}
- Remediated: {count} ({percentage}%)
- In Progress: {count} ({percentage}%)
- Overdue: {count} ({percentage}%)
- Mitigated (not patched): {count}

### Overdue Remediations

| CVE ID          | Product   | Due Date   | Days Overdue | Status      |
| --------------- | --------- | ---------- | ------------ | ----------- |
| CVE-YYYY-000001 | {Product} | 2024-MM-DD | X            | In Progress |

### Upcoming Deadlines (Next 14 Days)

| CVE ID          | Product   | Due Date   | Days Left | Status    |
| --------------- | --------- | ---------- | --------- | --------- |
| CVE-YYYY-000002 | {Product} | 2024-MM-DD | X         | Validated |

### Remediation Blockers

{List any impediments to meeting deadlines}
```

## Related References

- [Query Patterns](query-patterns.md) - Search strategies
- [Remediation Analysis](remediation-analysis.md) - Priority and deadline interpretation
