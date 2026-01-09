---
name: researching-nvd
description: Use when researching CVEs from the National Vulnerability Database (NVD) to find vulnerability details, CVSS scores, affected products (CPE), and references - guides through query formulation, search execution, CVE analysis, and synthesis with severity scoring
allowed-tools: Read, Write, Edit, Bash, WebFetch, WebSearch, Grep, Glob, TodoWrite, AskUserQuestion
---

# Researching NIST National Vulnerability Database (NVD)

**Research methodology for discovering and analyzing CVEs from NIST's comprehensive vulnerability database.**

## When to Use

Use this skill when:

- Researching CVE details not available in CISA KEV (CVSS, CPE, references)
- Finding ALL CVEs for a product/vendor (not just exploited ones)
- Understanding CVSS scoring breakdown (vector, base/temporal/environmental)
- Identifying affected product configurations via CPE matching
- Cross-referencing with CISA KEV for exploitation status
- Researching CVEs by CWE (weakness) category
- Building comprehensive vulnerability intelligence (NVD + CISA KEV)

**Key Principle:** NVD provides DETAILS (250,000+ CVEs), CISA KEV provides PRIORITIZATION (~1,200 exploited). Use NVD for comprehensive analysis, CISA KEV for urgent remediation.

**You MUST use TodoWrite before starting to track all steps.**

## Quick Reference

| Phase                | Purpose                             | Output                                   |
| -------------------- | ----------------------------------- | ---------------------------------------- |
| 1. Query Formulation | Define search strategy              | 2-3 NVD API queries                      |
| 2. Search Execution  | Query NVD API v2.0                  | Top relevant CVEs with JSON data         |
| 3. CVE Analysis      | Extract CVSS/CPE/CWE/references     | Structured CVE details                   |
| 4. Synthesis         | Prioritize by severity + KEV status | CVSS distribution, KEV cross-reference   |
| 5. Recommendation    | Detection/remediation guidance      | Prioritized action list (CVSS + exploit) |

## Progress Tracking (MANDATORY)

**Create these todos at workflow start:**

```
1. "Formulate NVD API search queries for {topic}" (Phase 1)
2. "Execute NVD API searches with rate limiting" (Phase 2)
3. "Analyze CVEs and extract CVSS/CPE/CWE details" (Phase 3)
4. "Synthesize findings with KEV cross-reference" (Phase 4)
5. "Recommend detection/remediation priorities" (Phase 5)
```

---

## Phase 1: Query Formulation

### 1.1 Identify Research Focus

Ask via AskUserQuestion or extract from context:

| Question                               | Purpose                                  |
| -------------------------------------- | ---------------------------------------- |
| What product/vendor are you focused on | Define search scope                      |
| Severity filter needed?                | CRITICAL/HIGH/MEDIUM/LOW                 |
| Date range (recent vs all-time)?       | Published date filtering                 |
| Specific CVE IDs to investigate?       | Direct CVE lookup                        |
| CPE-based product matching?            | Precise affected version identification  |
| Context (research, prioritization)?    | Determines CVSS vs KEV emphasis          |

**Output:** Research focus statement (1-2 sentences).

### 1.2 Formulate NVD API Queries

**Pattern:** API-first (JSON response), fallback to Web UI only if needed

**Query 1 (Keyword Search):**

```
https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch={vendor}
```

**Query 2 (Severity Filter):**

```
https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch={product}&cvssV3Severity=CRITICAL
```

**Query 3 (Specific CVE):**

```
https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2024-1234
```

**See:** [references/query-patterns.md](references/query-patterns.md) for complete API reference

### 1.3 Rate Limiting Strategy

**NVD API Rate Limits:**
- Without API key: 5 requests per 30 seconds
- With API key: 50 requests per 30 seconds

**Implementation:** Add 7-second delays between requests if no API key.

---

## Phase 2: Search Execution

### 2.1 NVD API v2.0 (Primary Method)

**Base URL:** `https://services.nvd.nist.gov/rest/json/cves/2.0`

**Critical Parameters:**

| Parameter        | Values                           | Use Case                         |
| ---------------- | -------------------------------- | -------------------------------- |
| `keywordSearch`  | {query}                          | Vendor/product search            |
| `cveId`          | CVE-YYYY-NNNNN                   | Specific CVE lookup              |
| `cvssV3Severity` | CRITICAL\|HIGH\|MEDIUM\|LOW      | Severity filter                  |
| `cpeName`        | cpe:2.3:a:{vendor}:{product}:... | CPE-based product matching       |
| `resultsPerPage` | 1-2000 (default 2000)            | Results pagination               |

**See:** [references/query-patterns.md](references/query-patterns.md) for CPE syntax

### 2.2 Execute API Queries

```bash
# Query 1: Keyword search
WebFetch("https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=apache&resultsPerPage=20",
         "Extract vulnerabilities array, parse CVE IDs, descriptions, CVSS scores, and CPE from JSON response")

# Wait 7 seconds (rate limiting)

# Query 2: Severity filtered
WebFetch("https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=tomcat&cvssV3Severity=CRITICAL",
         "Extract CRITICAL severity CVEs with full CVSS v3.1 metrics from JSON")

# Wait 7 seconds

# Query 3: Specific CVE
WebFetch("https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2024-1234",
         "Extract complete CVE details including references, weaknesses, configurations")
```

### 2.3 Parse JSON Response

**JSON Structure:**

```json
{
  "vulnerabilities": [
    {
      "cve": {
        "id": "CVE-YYYY-NNNNN",
        "descriptions": [{"lang": "en", "value": "..."}],
        "metrics": {
          "cvssMetricV31": [{
            "cvssData": {
              "baseScore": 9.8,
              "baseSeverity": "CRITICAL",
              "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
            }
          }]
        },
        "weaknesses": [{"description": [{"value": "CWE-79"}]}],
        "configurations": [{"nodes": [{"cpeMatch": [...]}]}],
        "references": [{"url": "...", "tags": [...]}]
      }
    }
  ]
}
```

**Extract:** CVE ID, description, CVSS score/vector/severity, CWE, CPE, references

---

## Phase 3: CVE Analysis

### 3.1 Extract CVSS Metrics

For each CVE, extract and interpret:

**CVSS v3.1 Components:**
- Base Score (0.0-10.0)
- Base Severity (NONE, LOW, MEDIUM, HIGH, CRITICAL)
- Vector String (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)

**Vector Breakdown:**
- AV (Attack Vector): N=Network, A=Adjacent, L=Local, P=Physical
- AC (Attack Complexity): L=Low, H=High
- PR (Privileges Required): N=None, L=Low, H=High
- UI (User Interaction): N=None, R=Required
- S (Scope): U=Unchanged, C=Changed
- C/I/A (Confidentiality/Integrity/Availability): N=None, L=Low, H=High

**See:** [references/cvss-interpretation.md](references/cvss-interpretation.md)

### 3.2 Extract Affected Products (CPE)

**CPE 2.3 Format:**
```
cpe:2.3:part:vendor:product:version:update:edition:language:sw_edition:target_sw:target_hw:other
```

**Example:**
```
cpe:2.3:a:apache:tomcat:9.0.50:*:*:*:*:*:*:*
```

Decodes to: Apache Tomcat version 9.0.50 (application)

**See:** [references/cpe-syntax.md](references/cpe-syntax.md)

### 3.3 Extract CWE and References

**CWE (Common Weakness Enumeration):**
- Classifies vulnerability type
- Example: CWE-79 (Cross-site Scripting), CWE-89 (SQL Injection)

**References:**
- Vendor advisories
- Patch links
- Exploit code (if public)
- Analysis articles

### 3.4 Cross-Reference with CISA KEV

**For each CVE, check CISA KEV status:**

```bash
# Quick check via researching-cisa-kev skill
Read(".claude/skill-library/research/researching-cisa-kev/SKILL.md")

# Or direct CISA KEV lookup
WebFetch("https://www.cisa.gov/known-exploited-vulnerabilities-catalog?field_cve={CVE-ID}",
         "Check if CVE is in CISA KEV catalog")
```

**Status:** In KEV (exploited) or Not in KEV (no exploitation confirmed)

---

## Phase 4: Synthesis

### 4.1 Structured Output Format

```markdown
## NVD Research: {topic}

**Date:** {current-date}
**Purpose:** Research for {context}

### Search Queries Used

1. {query1} - {N} results (severity: {filter})
2. {query2} - {N} results (CPE: {cpe-string})

### CVEs Found

**1. CVE-YYYY-NNNNN: {Short Description}**

- **Published:** {YYYY-MM-DD}
- **CVSS v3.1:** {score} ({CRITICAL/HIGH/MEDIUM/LOW})
- **Vector:** {CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H}
- **CWE:** {CWE-ID} - {weakness-name}
- **Affected Products (CPE):** {cpe-list}
- **Description:** {full-description}
- **References:** {vendor-advisory}, {patch-link}
- **CISA KEV Status:** {In KEV / Not in KEV}
- **Priority:** {Critical/High/Medium/Low} (CVSS + KEV)
- **NVD Link:** [View Details](https://nvd.nist.gov/vuln/detail/{CVE-ID})

### Severity Distribution

| CVSS Severity | Count | Percentage |
| ------------- | ----- | ---------- |
| CRITICAL      | X     | X%         |
| HIGH          | X     | X%         |
| MEDIUM        | X     | X%         |
| LOW           | X     | X%         |

### KEV Cross-Reference

| CVE ID           | CVSS | KEV Status | Priority |
| ---------------- | ---- | ---------- | -------- |
| CVE-YYYY-000001  | 9.8  | In KEV     | P0       |
| CVE-YYYY-000002  | 8.1  | Not in KEV | P1       |

### Synthesis

- Common weakness types (CWEs observed)
- Affected product families/versions
- CVSS score patterns (network-exploitable vs local)
- Exploitation status (KEV vs non-KEV breakdown)
```

### 4.2 Output Location

**Mode 1 (Standalone):**
```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
TOPIC="{semantic-topic-name}"
mkdir -p "$ROOT/.claude/.output/research/${TIMESTAMP}-${TOPIC}-nvd"
# Write synthesis to: SYNTHESIS.md
```

**Mode 2 (Orchestrated via orchestrating-research):**
- Write to: `${OUTPUT_DIR}/nvd.md`

**See:** [references/output-format.md](references/output-format.md)

---

## Phase 5: Recommendation and Integration

### 5.1 Prioritization Matrix

**Priority = CVSS Score + KEV Status**

| Priority | Criteria                          | Action              |
| -------- | --------------------------------- | ------------------- |
| P0       | CVSS ≥9.0 AND In KEV              | Immediate patch     |
| P1       | CVSS ≥7.0 AND In KEV              | Urgent patch        |
| P2       | CVSS ≥9.0 AND Not in KEV          | Monitor, plan patch |
| P3       | CVSS 7.0-8.9 AND Not in KEV       | Standard timeline   |
| P4       | CVSS <7.0                         | Low priority        |

### 5.2 Detection/Capability Guidance

Use NVD findings to guide security work:

| Task                    | NVD Research Input                      |
| ----------------------- | --------------------------------------- |
| Capability Development  | CWE patterns, attack vectors            |
| Nuclei Template         | CVE details, exploitation requirements  |
| Vulnerability Scanning  | CPE matching, affected versions         |
| Patch Prioritization    | CVSS + KEV status combined              |
| Threat Intelligence     | References, public exploits             |

---

## Common Query Patterns

| Research Focus       | NVD API Query Example                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **Vendor-Specific**  | `?keywordSearch=microsoft`                                                                             |
| **Product + Severity | ** | `?keywordSearch=tomcat&cvssV3Severity=CRITICAL`                                                        |
| **CPE-Based**        | `?cpeName=cpe:2.3:a:apache:tomcat:9.0.50`                                                              |
| **Recent CVEs**      | `?keywordSearch=apache&pubStartDate=2024-01-01T00:00:00`                                               |
| **CWE Category**     | `?keywordSearch=CWE-79` (XSS vulnerabilities)                                                          |
| **Specific CVE**     | `?cveId=CVE-2024-1234`                                                                                 |

---

## NVD vs CISA KEV Comparison

| Aspect           | NVD                                | CISA KEV                    |
| ---------------- | ---------------------------------- | --------------------------- |
| **Scope**        | 250,000+ CVEs (comprehensive)      | ~1,200 CVEs (exploited)     |
| **Purpose**      | Vulnerability details & scoring    | Exploitation confirmation   |
| **Key Data**     | CVSS, CPE, CWE, references         | Remediation deadlines       |
| **API**          | JSON REST API (v2.0)               | Web scraping only           |
| **Update Freq**  | Continuous (daily)                 | As exploitation confirmed   |
| **Use For**      | DETAILS and comprehensive research | PRIORITIZATION for patching |

**Recommended Workflow:** Query NVD for details → Cross-reference CISA KEV for exploitation → Prioritize by CVSS + KEV.

---

## Integration with Research Orchestration

This skill is invoked during research orchestration via `orchestrating-research`:

```
skill: "orchestrating-research"
```

Research orchestration delegates to:

1. **NVD research** - CVE details, CVSS, CPE (THIS SKILL)
2. **CISA KEV research** - Exploitation status, remediation deadlines
3. **GitHub research** - POCs, exploits, community analysis
4. **Web research** - Vendor advisories, patches

**Output:** Comprehensive vulnerability intelligence (NVD + KEV + community).

---

## Quality Indicators

| Indicator             | What It Means                                |
| --------------------- | -------------------------------------------- |
| NVD authority         | NIST-maintained, official CVE details        |
| CVSS standardization  | Industry-standard severity metrics           |
| CPE precision         | Exact affected product/version identification |
| CWE classification    | Weakness type categorization                 |
| Reference completeness | Vendor advisories, patches, exploits         |
| JSON API              | Structured, parseable data                   |

**All NVD entries authoritative** - NIST is CVE Numbering Authority (CNA).

---

## Common Rationalizations (DO NOT SKIP)

| Rationalization                    | Why It's Wrong                                       |
| ---------------------------------- | ---------------------------------------------------- |
| "CISA KEV is enough"               | KEV only covers exploited CVEs, not all vulnerabilities |
| "CVSS scores alone tell priority"  | CVSS ≠ exploitation. Need KEV cross-reference        |
| "Too many CVEs to research"        | Filter by severity + product CPE for focus           |
| "I'll use CVE.org instead"         | CVE.org redirects to NVD for details                 |
| "No time for API setup"            | 10 min API setup prevents hours of manual searching  |

---

## Validation Checklist

Before completing research:

- [ ] Formulated 2-3 NVD API queries (not web scraping)
- [ ] Used JSON API v2.0 (not hash-based SPA URLs)
- [ ] Extracted CVSS scores AND vectors (not just scores)
- [ ] Parsed CPE for affected products (not just descriptions)
- [ ] Cross-referenced with CISA KEV for exploitation status
- [ ] Created priority matrix (CVSS + KEV combined)
- [ ] Documented CWE patterns and references

---

## References

- [Query Patterns](references/query-patterns.md) - NVD API construction, CPE syntax
- [CVSS Interpretation](references/cvss-interpretation.md) - Score/vector breakdown
- [CPE Syntax](references/cpe-syntax.md) - CPE 2.3 format guide
- [Output Format](references/output-format.md) - Structured output templates

## Related Skills

| Skill                        | Purpose                                  |
| ---------------------------- | ---------------------------------------- |
| `orchestrating-research`     | Orchestrator delegating to this skill (CORE) |
| `researching-cisa-kev`       | Sibling skill for exploitation confirmation |
| `researching-arxiv`          | Sibling skill for academic research      |
| `writing-nuclei-signatures`  | Uses NVD research for template development |
| `creating-vql-capabilities`  | Uses NVD research for detection logic    |
