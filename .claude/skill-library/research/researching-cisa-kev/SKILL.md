---
name: researching-cisa-kev
description: Use when researching known exploited vulnerabilities from CISA KEV catalog to find CVEs actively exploited in the wild - guides through query formulation, search execution, vulnerability analysis, and synthesis with remediation timelines
allowed-tools: Read, Write, Edit, Bash, WebFetch, WebSearch, Grep, Glob, TodoWrite, AskUserQuestion
---

# Researching CISA Known Exploited Vulnerabilities (KEV)

**Research methodology for discovering and analyzing known exploited vulnerabilities from CISA's authoritative KEV catalog.**

## When to Use

Use this skill when:

- Researching CVEs that are actively exploited in the wild
- Prioritizing vulnerability remediation based on real-world exploitation
- Creating security capabilities/detections for known threats
- Validating if a CVE is on federal mandatory remediation list
- Understanding remediation timelines for compliance (FCEB deadlines)
- Building threat intelligence for attack surface management

**Key Principle:** The CISA KEV catalog is authoritative for exploitation confirmation. Use this for detection prioritization instead of theoretical CVE scoring (CVSS).

**You MUST use TodoWrite before starting to track all steps.**

## Quick Reference

| Phase                     | Purpose                        | Output                              |
| ------------------------- | ------------------------------ | ----------------------------------- |
| 1. Query Formulation      | Define search strategy         | 2-3 targeted search queries         |
| 2. Search Execution       | Query CISA KEV catalog         | Top relevant CVEs with metadata     |
| 3. Vulnerability Analysis | Extract exploitation details   | CVE IDs, remediation dates, vendors |
| 4. Synthesis              | Prioritize and contextualize   | Structured findings with priorities |
| 5. Recommendation         | Detection/remediation guidance | Ordered action items                |

## Progress Tracking (MANDATORY)

**Create these todos at workflow start:**

```
1. "Formulate CISA KEV search queries for {topic}" (Phase 1)
2. "Execute CISA KEV catalog searches" (Phase 2)
3. "Analyze vulnerabilities and extract exploitation context" (Phase 3)
4. "Synthesize findings with remediation priorities" (Phase 4)
5. "Recommend detection/remediation actions" (Phase 5)
```

---

## Phase 1: Query Formulation

### 1.1 Identify Research Focus

Ask via AskUserQuestion or extract from context:

| Question                             | Purpose                                 |
| ------------------------------------ | --------------------------------------- |
| What product/vendor are you focused  | Define search scope                     |
| on?                                  |                                         |
| Which vulnerability types?           | Narrow to RCE, auth bypass, SQLi, etc.  |
| Time range (recent vs all-time)?     | Filter by date added to KEV             |
| Specific CVE IDs to investigate?     | Direct CVE lookup vs exploratory search |
| Context (capability dev, compliance, | Determines output focus (detection vs   |
| threat intel)?                       | remediation)                            |

**Output:** Research focus statement (1-2 sentences).

### 1.2 Formulate Search Queries

**Pattern:** Specific → Broad (reverse of arxiv approach)

**Query 1 (Specific):** Known product/vendor

- Example: `apache` or `CVE-2024-1234`
- Purpose: Target known threats

**Query 2 (Product Type):** Category search

- Example: `web server` or `VPN`
- Purpose: Technology class vulnerabilities

**Query 3 (Vulnerability Class):** Attack vector

- Example: `RCE` or `authentication bypass`
- Purpose: Find similar exploitation patterns

**See:** [references/query-patterns.md](references/query-patterns.md)

### 1.3 Date Filtering Strategy

**CISA KEV Date Added Options:**

| Filter | Time Range       | Use Case                      |
| ------ | ---------------- | ----------------------------- |
| 30     | Last 30 days     | Emerging threats              |
| 60     | Last 60 days     | Recent exploitation           |
| 90     | Last 90 days     | Quarterly threat intelligence |
| all    | All-time (2021+) | Comprehensive research        |

**Why date filtering matters:** Recent additions indicate active exploitation campaigns. Older entries may have widespread mitigations.

---

## Phase 2: Search Execution

### 2.1 CISA KEV Search API

**Base URL:** `https://www.cisa.gov/known-exploited-vulnerabilities-catalog`

**Query Parameters:**

| Parameter                  | Values             | Use Case             |
| -------------------------- | ------------------ | -------------------- |
| `search_api_fulltext`      | URL-encoded search | Main search term     |
| `field_date_added_wrapper` | `all\|30\|60\|90`  | Time range filter    |
| `field_cve`                | CVE-ID             | Specific CVE lookup  |
| `sort_by`                  | `field_date_added` | Sort by newest first |
| `items_per_page`           | `20\|50\|100`      | Results per page     |

**Search URL Pattern:**

```text
https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext={QUERY}&field_date_added_wrapper=all&sort_by=field_date_added&items_per_page=20
```

### 2.2 Execute Searches

For each query from Phase 1:

```bash
# Query 1 (Vendor/Product)
WebFetch("https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=apache&field_date_added_wrapper=all&sort_by=field_date_added&items_per_page=20",
         "Extract CVE IDs, vulnerability names, vendors, products, and date added for all results")

# Query 2 (CVE-specific)
WebFetch("https://www.cisa.gov/known-exploited-vulnerabilities-catalog?field_cve=CVE-2024-1234",
         "Extract full vulnerability details including required action and due date")

# Query 3 (Vulnerability class)
WebFetch("https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=remote+code+execution&field_date_added_wrapper=90&items_per_page=50",
         "Extract CVEs with RCE vulnerabilities added in last 90 days")
```

### 2.3 Parse Search Results

Extract from each search results page:

| Field              | Location/Format       | Notes                                |
| ------------------ | --------------------- | ------------------------------------ |
| CVE ID             | `CVE-YYYY-NNNNN`      | Primary identifier                   |
| Vulnerability Name | Short description     | CISA-provided title                  |
| Vendor/Project     | Organization name     | Software vendor                      |
| Product            | Affected software     | Specific product/version             |
| Date Added to KEV  | YYYY-MM-DD            | When CISA confirmed exploitation     |
| Short Description  | Vulnerability summary | Technical details                    |
| Required Action    | Remediation guidance  | Apply patch, disable feature, etc.   |
| Due Date           | YYYY-MM-DD            | Federal remediation deadline (FCEB)  |
| Notes              | Exploitation context  | Known campaigns, ransom groups, etc. |

**Output:** List of 5-20 vulnerabilities with complete metadata.

---

## Phase 3: Vulnerability Analysis

### 3.1 Identify High-Priority CVEs

From search results, prioritize based on:

| Criterion            | Why It Matters                           |
| -------------------- | ---------------------------------------- |
| Due Date proximity   | Federal deadline indicates urgency       |
| Recent addition      | Active exploitation campaigns            |
| Vendor/product match | Directly affects your environment        |
| Vulnerability class  | RCE > Auth bypass > Info disclosure      |
| Notes field          | Ransomware, APT, widespread exploitation |

### 3.2 Extract Exploitation Context

For each selected CVE:

**CVE Metadata:**

- CVE ID
- Vulnerability Name
- Vendor/Project
- Product
- Date Added to KEV
- Short Description
- Required Action (patch, workaround, disable)
- Due Date (federal remediation deadline)
- Notes (exploitation context)
- CISA KEV Link

**Key Questions:**

- What attack vector is exploited?
- Which threat actors are using this?
- What is the remediation timeline?

**See:** [references/remediation-analysis.md](references/remediation-analysis.md)

---

## Phase 4: Synthesis

### 4.1 Structured Output Format

Create research findings document:

```markdown
## CISA KEV Research: {topic}

**Date:** {current-date}
**Purpose:** Research for {context}

### Search Queries Used

1. {query1} - {N} results (filter: {date-range})
2. {query2} - {N} results (filter: {date-range})
3. {query3} - {N} results (filter: {date-range})

### Known Exploited Vulnerabilities Found

**1. CVE-YYYY-NNNNN: {Vulnerability Name}**

- **Vendor/Product:** {vendor} / {product}
- **Date Added:** {YYYY-MM-DD}
- **Due Date:** {YYYY-MM-DD} (Federal remediation deadline)
- **Vulnerability Class:** {RCE/Auth Bypass/SQLi/etc.}
- **Description:** {short-description}
- **Required Action:** {remediation-guidance}
- **Exploitation Notes:** {active campaigns, threat actors, ransom groups}
- **Relevance:** {why this matters for current task}
- **CISA Link:** [View in KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext={CVE-ID})

**2. CVE-YYYY-NNNNN: {Vulnerability Name}**

... (repeat for 5-10 high-priority CVEs)

### Synthesis

{2-3 paragraphs summarizing:}

- Common attack vectors across CVEs
- Affected product families/vendors
- Remediation timeline patterns (urgent vs standard)
- Known threat actors/campaigns
- Detection/capability gaps

### Remediation Priority Matrix

| CVE ID        | Due Date   | Impact | Relevance | Priority |
| ------------- | ---------- | ------ | --------- | -------- |
| CVE-YYYY-0001 | 2024-MM-DD | High   | Direct    | 1        |
| CVE-YYYY-0002 | 2024-MM-DD | Medium | Indirect  | 2        |
```

### 4.2 Output Location

**Output location depends on invocation mode:**

**Mode 1: Standalone (invoked directly)**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
TOPIC="{semantic-topic-name}"
mkdir -p "$ROOT/.claude/.output/research/${TIMESTAMP}-${TOPIC}-cisa-kev"
# Write synthesis to: $ROOT/.claude/.output/research/${TIMESTAMP}-${TOPIC}-cisa-kev/SYNTHESIS.md
```

**Mode 2: Orchestrated (invoked by orchestrating-research)**

When parent skill provides `OUTPUT_DIR`:

- Write synthesis to: `${OUTPUT_DIR}/cisa-kev.md`
- Do NOT create directory (parent already created it)

**Detection logic:** If parent skill passed an output directory path, use Mode 2. Otherwise use Mode 1.

**See:** [references/output-format.md](references/output-format.md)

---

## Phase 5: Recommendation and Integration

### 5.1 Prioritize Remediation/Detection

Order CVEs by:

1. **Federal deadline** - Due date proximity (most urgent first)
2. **Environmental relevance** - Direct product matches prioritized
3. **Exploitation severity** - Active campaigns, ransomware, APT
4. **Detection capability** - Can we create signatures/capabilities?

### 5.2 Detection/Capability Guidance

Use KEV findings to guide security work:

| Task                   | KEV Research Input                    |
| ---------------------- | ------------------------------------- |
| Capability Development | Exploitation patterns, attack vectors |
| Vulnerability Scanning | Affected products, version ranges     |
| Threat Intelligence    | Exploitation notes, threat actors     |
| Compliance Reporting   | Federal deadlines, remediation status |
| Patch Prioritization   | Due dates, exploitation context       |

### 5.3 Integration with Capability Development

In capability SKILL.md or detection rules:

```markdown
## Threat Context

This capability detects exploitation of:

- **CVE-YYYY-NNNNN:** {Vulnerability Name}
  - Added to CISA KEV: {date}
  - Exploitation: {active campaigns, threat actors}
  - Remediation deadline: {due-date}
  - CISA KEV: [Link](URL)

**Justification:** Confirmed active exploitation per CISA KEV catalog.
```

---

## Common Query Patterns

| Research Focus       | Example Queries                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------- |
| **Vendor-Specific**  | `microsoft`, `apache`, `cisco`, `oracle`, `vmware`                                        |
| **Product Type**     | `web server`, `VPN`, `firewall`, `CMS`, `authentication`                                  |
| **Vulnerability**    | `remote code execution`, `authentication bypass`, `SQL injection`, `privilege escalation` |
| **Technology Stack** | `java`, `php`, `python`, `.net`, `node.js`                                                |
| **CVE Direct**       | `CVE-2024-1234` (specific CVE lookup)                                                     |
| **Recent Threats**   | `field_date_added_wrapper=30` (last 30 days)                                              |

---

## Quality Indicators

When evaluating KEV findings:

| Indicator           | What It Means                                              |
| ------------------- | ---------------------------------------------------------- |
| Recent addition     | Active exploitation campaign ongoing                       |
| Short due date      | High urgency (CISA deems critical)                         |
| Notes field present | Additional context available (threat actors, campaigns)    |
| Required action     | Specific remediation guidance (not just "patch available") |
| Multiple CVEs       | Broader vulnerability pattern across products              |

**All KEV entries confirmed exploited** - unlike CVE databases, every entry represents active real-world exploitation.

---

## Integration with Research Orchestration

This skill is invoked during research orchestration via `orchestrating-research`:

```
Read(".claude/skill-library/research/orchestrating-research/SKILL.md")
```

Research orchestration typically delegates to:

1. **CISA KEV research** - Known exploited vulnerabilities (THIS SKILL)
2. **Codebase research** - Find similar detection patterns
3. **GitHub research** - Community POCs, detection rules
4. **Web research** - Exploitation analysis, write-ups

**Output:** Comprehensive threat intelligence combining KEV data with technical details.

---

## Common Rationalizations (DO NOT SKIP)

| Rationalization                 | Why It's Wrong                                         |
| ------------------------------- | ------------------------------------------------------ |
| "CVE score tells me severity"   | CVSS ≠ exploitation. KEV = confirmed exploitation      |
| "I'll check NVD instead"        | NVD has all CVEs, KEV has only exploited ones          |
| "Too many results, skip search" | Exploitation confirmation is the whole point           |
| "No time for research"          | 10 min research prevents prioritizing wrong CVEs       |
| "This CVE isn't in our stack"   | Supply chain, dependencies, transitive vulnerabilities |

---

## Validation Checklist

Before completing research:

- [ ] Formulated 2-3 search queries (vendor/product/vulnerability class)
- [ ] Executed searches on CISA KEV catalog (not generic CVE search)
- [ ] Analyzed 5-10 CVEs (not just listed them)
- [ ] Extracted remediation deadlines and required actions
- [ ] Created prioritized remediation matrix
- [ ] Documented exploitation context (threat actors, campaigns)
- [ ] Integrated findings into capability/detection work

---

## References

- [Query Patterns](references/query-patterns.md) - Vendor/product search strategies
- [Remediation Analysis](references/remediation-analysis.md) - Due dates and federal deadlines
- [Output Format](references/output-format.md) - Structured output templates

## Related Skills

| Skill                              | Purpose                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `orchestrating-research` (LIBRARY) | Orchestrator delegating to this skill - `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")` |
| `researching-arxiv`                | Sibling skill for academic security research                                                                     |
| `researching-github`               | Sibling skill for POC/exploit research                                                                           |
| `writing-nuclei-signatures`        | Uses KEV research for detection development                                                                      |
| `creating-vql-capabilities`        | Uses KEV research for capability scoping                                                                         |
| `writing-nerva-tcp-udp-modules`     | Uses KEV research for vulnerable service versions                                                                |
