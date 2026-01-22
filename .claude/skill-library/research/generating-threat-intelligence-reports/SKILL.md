---
name: generating-threat-intelligence-reports
description: Use when generating 45-day KEV threat reports with nation-state/ransomware attribution, nuclei detection gaps, and priority patching recommendations for customer meetings
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Skill, AskUserQuestion, WebSearch, WebFetch
---

# Generating Threat Intelligence Reports

**Orchestrated workflow for producing customer-facing threat intelligence reports that correlate actively exploited vulnerabilities (CISA KEV) with threat actor attribution and Chariot's detection capabilities.**

## When to Use

Use this skill when:

- Preparing 45-day threat intelligence reports for customer meetings
- Correlating CISA KEV vulnerabilities with threat actor attribution and detection capabilities
- Generating executive summaries of threat landscape with nation-state/ransomware campaigns
- Producing priority patching recommendations based on active exploitation
- Automating threat intelligence report generation for recurring meetings

**Key Principle:** This skill automates the entire workflow from KEV research through threat intelligence gathering and nuclei template correlation to customer-ready output, eliminating manual search and compilation steps.

**You MUST use TodoWrite before starting to track all phases.**

## Quick Reference

| Phase                   | Purpose                               | Output                         |
| ----------------------- | ------------------------------------- | ------------------------------ |
| 1. KEV Research         | Get top actively exploited CVEs       | Top CVEs from CISA catalog     |
| 2. Attribution Research | Enrich with threat actor intelligence | APT/ransomware attribution     |
| 3. Nuclei Correlation   | Search templates for detection        | Detection coverage status      |
| 4. Prioritization       | Rank by threat + coverage             | Priority matrix                |
| 5. Report Generation    | Format for customer delivery          | Key Takeaways + Patching Table |

## Progress Tracking (MANDATORY)

**Create these todos at workflow start:**

```
1. "Execute CISA KEV research for timeframe" (Phase 1)
2. "Research threat actor attribution from public sources" (Phase 2)
3. "Correlate CVEs with nuclei templates" (Phase 3)
4. "Prioritize vulnerabilities by threat + coverage" (Phase 4)
5. "Generate customer-facing report" (Phase 5)
```

---

## Workflow Overview

### Input Parameters

Ask user via AskUserQuestion if not provided:

| Parameter             | Default  | Purpose                                                                      |
| --------------------- | -------- | ---------------------------------------------------------------------------- |
| **Timeframe**         | 45 days  | KEV catalog date range                                                       |
| **Top N CVEs**        | 5        | Number of vulnerabilities to report                                          |
| **Industry Vertical** | All      | Healthcare, Financial, Government, Manufacturing, Energy, Technology, or All |
| **Output Format**     | Markdown | Table/Presentation format                                                    |

### Output Artifacts

| Artifact                   | Location    | Purpose                               |
| -------------------------- | ----------- | ------------------------------------- |
| **Key Takeaways**          | REPORT.md   | 5 executive bullets                   |
| **Priority Table**         | REPORT.md   | CVE + Threat Actor + Detection Status |
| **Attribution Evidence**   | REPORT.md   | Source citations for threat actors    |
| **Detection Gap Analysis** | REPORT.md   | CVEs without nuclei templates         |
| **Research Artifacts**     | OUTPUT_DIR/ | Raw KEV data + attribution sources    |

---

## Phase 1: CISA KEV Research

**Objective:** Retrieve actively exploited vulnerabilities from authoritative CISA catalog.

### 1.1 Invoke KEV Research Skill

Use existing `researching-cisa-kev` skill with timeframe parameter:

```
Read(".claude/skill-library/research/researching-cisa-kev/SKILL.md")
```

**Parameters to pass:**

- Timeframe: {days} (default: 45)
- Focus: All vulnerability classes OR specific (RCE, auth bypass, etc.)
- Output mode: Standalone (creates its own OUTPUT_DIR)

### 1.2 Parse KEV Research Output

From the SYNTHESIS.md produced by `researching-cisa-kev`:

**Extract for each CVE:**

- CVE ID
- Vulnerability Name
- Vendor/Product
- Date Added to KEV
- Due Date (federal remediation deadline)
- Exploitation Notes (initial attribution from KEV catalog)
- CVSS Severity
- Required Action

**Store in structured format** for Phase 2 enrichment.

### 1.3 Select Top N Candidates

Based on KEV criteria:

- Recent addition (within timeframe)
- Federal deadline proximity
- CVSS severity
- Ransomware campaign flag

**Output:** Top 5-10 CVEs for detailed attribution research in Phase 2.

---

## Phase 2: Threat Actor Attribution Research

**Objective:** Enrich KEV data with comprehensive threat intelligence from public sources.

**This phase addresses the attribution gap - KEV catalog provides basic exploitation confirmation but limited threat actor details.**

### 2.1 Execute WebSearch Queries

For each CVE from Phase 1, run targeted searches:

**Query patterns:**

1. `"{CVE-ID} threat actor attribution"` - Direct attribution
2. `"{CVE-ID} APT ransomware campaign"` - Campaign context
3. `"{Product} {CVE-ID} exploitation {year}"` - Recent exploitation

**Priority sources:** CISA, Unit 42, Mandiant, Microsoft TI, CrowdStrike, Arctic Wolf, Wiz, Recorded Future

### 2.2 Extract Attribution Data

For each CVE, document:

- **Primary Actor** (APT28, LockBit, etc.)
- **Actor Type** (Nation-state/Ransomware/Opportunistic)
- **Country** (if nation-state)
- **Campaign Name** (if known)
- **Target Sectors** (Government, Financial, etc.)
- **Source Citations** (URL + date)

### 2.3 Assign Confidence Levels

| Confidence  | Criteria                         | Use                    |
| ----------- | -------------------------------- | ---------------------- |
| **HIGH**    | Multiple Tier 1/2 sources        | Full priority weight   |
| **MEDIUM**  | Single Tier 2 or multiple Tier 3 | Partial weight (0.7x)  |
| **LOW**     | Tier 3 only or speculation       | Minimal weight (0.3x)  |
| **UNKNOWN** | No attribution found             | Flag for investigation |

**Alternative:** If WebSearch insufficient, use `researching-perplexity` for synthesized intelligence.

**See:** [references/attribution-research-methodology.md](references/attribution-research-methodology.md) for detailed query patterns, source prioritization, and citation formats.

### 2.4 Industry Vertical Filtering

**If industry vertical specified (not "All"):**

Filter CVEs based on "Target Sectors" extracted in Phase 2.2:

**Matching logic:**

- **Healthcare:** CVEs targeting Healthcare, Medical, Hospitals, Pharmaceutical sectors
- **Financial:** CVEs targeting Financial Services, Banking, Fintech, Insurance sectors
- **Government:** CVEs targeting Government, Defense, Federal, State agencies
- **Manufacturing:** CVEs targeting Manufacturing, Industrial Control Systems, Supply Chain
- **Energy:** CVEs targeting Energy, Oil & Gas, Utilities, Power Grid
- **Technology:** CVEs targeting Technology, Software, SaaS, Cloud providers

**Examples:**

```
User requests: --vertical Healthcare
Attribution data: "Target Sectors: Healthcare, Government"
Result: ✅ INCLUDE (Healthcare match)

User requests: --vertical Financial
Attribution data: "Target Sectors: Healthcare, Government"
Result: ❌ EXCLUDE (No Financial match)

User requests: --vertical All
Attribution data: Any
Result: ✅ INCLUDE (All sectors accepted)
```

**Filtering behavior:**

- Apply filter AFTER Phase 2 attribution research completes
- If fewer than Top N CVEs match vertical, report all matching CVEs
- **If ZERO CVEs match vertical:** Generate summary report with recommendation to expand search
- Include note in report: "Filtered by {vertical} sector targeting"

**Priority boost:** CVEs targeting specified vertical receive +15% priority weight in Phase 4 scoring.

**Zero-match handling:**

```markdown
# Threat Intelligence Report

**Industry Focus:** Healthcare
**CVEs Found:** 0

No CVEs targeting the Healthcare sector were identified in the {days}-day KEV window.

**Recommendation:**

- Expand search: Use --vertical All to see all threats
- Extend timeframe: Use --days 90 for broader coverage
```

---

## Phase 3: Nuclei Template Correlation

**Objective:** Determine if Chariot can detect each CVE via nuclei templates.

### 3.1 Locate Nuclei Templates Repository

**Primary location:** `/tmp/nuclei-templates` (if cloned)
**Fallback:** Clone from `https://github.com/praetorian-inc/nuclei-templates.git`

```bash
# Check if already cloned
if [ ! -d "/tmp/nuclei-templates" ]; then
  git clone https://github.com/praetorian-inc/nuclei-templates.git /tmp/nuclei-templates
fi
```

### 3.2 Search for CVE Templates

For each CVE from Phase 1-2:

```bash
# Search for CVE-YYYY-NNNNN in nuclei templates
grep -r "CVE-YYYY-NNNNN" /tmp/nuclei-templates --include="*.yaml" --include="*.yml"
```

**Record:**

- Template exists: YES/NO
- Template path(s) if found
- Multiple templates if available (e.g., praetorian/ vs http/cves/)
- Template metadata (severity, tags, verified status)

### 3.3 Detection Coverage Analysis

**Initial status assignment (tentative - refined in Phase 2):**

| Detection Status | Symbol | Meaning                                                             |
| ---------------- | ------ | ------------------------------------------------------------------- |
| **COVERED**      | ✅     | Template exists in nuclei (refined by customer exposure in Phase 2) |
| **GAP**          | ❌     | No template found (refined by remediation in Phase 3)               |

**Note:** This is a tentative status. The progressive detection status system refines this based on:

- **Phase 2:** Customer asset exposure (COVERED → COVERED-EXPOSED if customer has vulnerable assets)
- **Phase 3:** Remediation status (GAP → IN DEVELOPMENT when CVE research triggered)

**For templates found:** Read first 50 lines to extract:

- Template severity
- Detection method (HTTP/network/file-based)
- Verified status (metadata.verified: true/false)

**See:** [references/detection-coverage-analysis.md](references/detection-coverage-analysis.md) and [references/detection-status-system.md](references/detection-status-system.md) for complete progressive status definitions

---

## Phase 4: Prioritization

**Objective:** Rank vulnerabilities by threat severity, attribution confidence, and detection coverage.

### 4.1 Prioritization Matrix

Rank CVEs using combined scoring:

| Factor                         | Weight | Scoring                                                                                                       |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| **Threat Actor Attribution**   | 35%    | Nation-state HIGH conf (10) > Ransomware HIGH (8) > Nation-state MEDIUM (6) > Opportunistic (3) > Unknown (1) |
| **Federal Deadline Proximity** | 30%    | Days until due date (urgent = 10, >90 days = 1)                                                               |
| **CVSS Severity**              | 20%    | Critical (10) > High (7) > Medium (4) > Low (1)                                                               |
| **Detection Coverage**         | 15%    | Gap (10) > Partial (5) > Covered (1)                                                                          |

**Why attribution gets higher weight:** Nation-state actors are persistent and sophisticated; ransomware groups are financially motivated and widespread. Attribution confidence affects urgency.

**Why detection gap scoring:** Higher score for gaps alerts customers to vulnerabilities Chariot cannot yet detect, driving capability development.

### 4.2 Generate Priority Rankings

Output top N CVEs (default: 5) ranked by combined score:

```
Priority 1: CVE-YYYY-0001 (Score: 9.2)
  - Nation-state APT28 (Russia) - HIGH confidence
  - Campaign: Winter Vivern targeting government
  - Federal deadline: 14 days
  - Detection: GAP (no template)

Priority 2: CVE-YYYY-0002 (Score: 8.7)
  - Ransomware: LockBit 3.0 - HIGH confidence
  - Campaign: Mass exploitation of edge devices
  - Federal deadline: 21 days
  - Detection: COVERED (verified template)
```

**See:** [references/prioritization-algorithm.md](references/prioritization-algorithm.md)

---

## Phase 5: Report Generation

**Objective:** Generate customer-facing output in standardized format.

### 5.1 Key Takeaways (5 Bullets)

Format: `> **Bold Title:** Single sentence explanation with supporting data.`

**Required focus:** Weaponization speed, threat actor patterns, sector targeting, patching priorities, detection coverage.

**See:** [references/report-format-specifications.md](references/report-format-specifications.md) for detailed examples and formatting guidance.

### 5.2 Priority Patching Recommendations Table

**Format:** Table with Priority, CVE, Product, Threat Actor, Confidence, Detection Status

**Columns:** Priority | CVE (hyperlinked) | Product | Threat Actor | Confidence | Detection Status (tentative)

**Note:** Detection status is tentative. Refined in Phase 2 (customer exposure) and Phase 3 (remediation).

**See:** [references/report-format-specifications.md](references/report-format-specifications.md) and [references/detection-status-system.md](references/detection-status-system.md) for examples and status definitions

### 5.3 Threat Actor Attribution Details

For each CVE with HIGH confidence attribution, include attribution card:

```markdown
### CVE-2025-55182: React Server Components RCE

**Threat Actor:** APT28 (Fancy Bear)
**Country:** Russia
**Attribution Confidence:** HIGH
**Campaign:** Winter Vivern
**First Observed:** Jan 1, 2025 (48 hours after disclosure)
**Target Sectors:** Government (US, EU), Defense contractors
**Exploitation Method:** Spearphishing with malicious RSC payloads
**Source:** Microsoft Threat Intelligence Center - "APT28 Campaign Analysis" - Jan 3, 2025

**Business Impact:** HIGH - Common framework in customer web applications
**Recommended Action:** Immediate patching + WAF rules for RSC endpoints
```

### 5.4 Detection Gap Section

**For CVEs without nuclei templates:**

```markdown
## Detection Gaps Identified

The following vulnerabilities are actively exploited but **not yet detectable** by Chariot:

### 1. CVE-2025-55182 - React Server Components RCE

- **Threat Actor:** APT28 (Russia) - Nation-state
- **Confidence:** HIGH
- **Exploitation:** Active since Jan 1, 2025
- **Customer Impact:** HIGH (React/Next.js widely used)
- **Recommendation:** Create nuclei template (estimated 2-4 hours)
- **Priority:** CRITICAL - Nation-state threat + no current detection

### 2. CVE-2024-XXXXX - ...

**Total Detection Gaps:** 2 of 5 CVEs (40% coverage gap)
**Capability Development Needed:** Prioritize CVE-2025-55182 (nation-state + customer exposure)
```

**See:** [references/report-format-specifications.md](references/report-format-specifications.md)

### 5.5 Output Location

**Standalone mode (default):**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
TIMEFRAME="${DAYS:-45}"
OUTPUT_DIR="$ROOT/.claude/.output/threat-intelligence/${TIMESTAMP}-kev-${TIMEFRAME}day-report"
mkdir -p "$OUTPUT_DIR"
# Write REPORT.md to OUTPUT_DIR
# Write ATTRIBUTION-SOURCES.md with all citations
```

**Orchestrated mode (if invoked by another skill):**

If parent skill provides `OUTPUT_DIR`, use that location instead.

---

## Validation Checklist

Before marking workflow complete:

- [ ] KEV research executed for specified timeframe (Phase 1)
- [ ] Top N CVEs extracted from KEV catalog
- [ ] Attribution research completed for all CVEs (Phase 2)
- [ ] Threat actors identified with confidence levels
- [ ] Source citations documented for all attributions
- [ ] Nuclei template search completed for all CVEs (Phase 3)
- [ ] Detection coverage status documented (Covered/Partial/Gap)
- [ ] Priority matrix calculated with attribution confidence (Phase 4)
- [ ] CVEs ranked by combined score
- [ ] Key Takeaways formatted (exactly 5 bullets) (Phase 5)
- [ ] Priority Patching Table generated with attribution + confidence
- [ ] Detection gaps identified with business impact
- [ ] REPORT.md written to OUTPUT_DIR
- [ ] ATTRIBUTION-SOURCES.md written with citations
- [ ] All TodoWrite items marked complete

---

## Common Rationalizations (DO NOT SKIP)

| Rationalization                                     | Why It's Wrong                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| "I'll just manually search KEV"                     | researching-cisa-kev already automates this with initial attribution                                         |
| "Attribution takes too long"                        | WebSearch queries take <30 seconds per CVE, critical for prioritization                                      |
| "KEV Notes field has attribution"                   | Often missing or incomplete; Phase 2 enriches with Tier 2 sources                                            |
| "Nuclei search takes too long"                      | grep across 12K files takes <5 seconds                                                                       |
| "Customer doesn't need detection status"            | Transparency on gaps builds trust and drives capability development                                          |
| "5 bullets is arbitrary"                            | Standardized format enables comparison across reports                                                        |
| "I'll skip confidence levels"                       | Attribution without confidence misleads customers on urgency                                                 |
| "I'll skip prioritization, just list CVEs"          | Random order wastes customer time reviewing irrelevant threats                                               |
| "Stakeholder requested N items instead of 5"        | Report parameters are standardized for comparison across time; customize presentation, not research workflow |
| "I already manually gathered KEV/attribution data"  | Sunk cost fallacy; automated workflow ensures consistency and prevents missed datapoints                     |
| "No time for TodoWrite tracking"                    | TodoWrite takes 30 seconds, prevents hours of rework from skipped phases                                     |
| "I remember which templates exist, can skip search" | Memory is unreliable; templates change; verification is mandatory even when "known"                          |
| "Customize weights for this customer's context"     | Weights are fixed; if factor doesn't apply (no federal deadline), it scores low naturally                    |

---

## Integration

### Called By

- `/threat-report` command (when created)
- Manual invocation for ad-hoc reporting
- Scheduled automation (future enhancement)

### Requires (invoke before starting)

| Skill                  | When    | Purpose                                                      |
| ---------------------- | ------- | ------------------------------------------------------------ |
| `researching-cisa-kev` | Phase 1 | Retrieve KEV vulnerabilities with initial exploitation notes |

### Calls (during execution)

| Skill                    | Phase              | Purpose                                                     |
| ------------------------ | ------------------ | ----------------------------------------------------------- |
| `researching-cisa-kev`   | Phase 1            | Automate KEV catalog research and initial threat context    |
| `researching-perplexity` | Phase 2 (optional) | Synthesized threat intelligence when WebSearch insufficient |

### Pairs With (conditional)

| Skill                                  | Trigger                   | Purpose                                                                                                             |
| -------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `writing-nuclei-templates`             | When detection gaps found | Create templates for missing CVEs                                                                                   |
| `orchestrating-capability-development` | When multiple gaps        | Batch capability development                                                                                        |
| `orchestrating-research` (LIBRARY)     | Complex attribution       | Full multi-source research orchestration - `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")` |

---

## References

- [Attribution Research Methodology](references/attribution-research-methodology.md) - WebSearch query patterns, source prioritization, confidence scoring
- [Detection Coverage Analysis](references/detection-coverage-analysis.md) - Template search methodology and coverage definitions
- [Prioritization Algorithm](references/prioritization-algorithm.md) - Scoring weights, attribution impact, ranking logic
- [Report Format Specifications](references/report-format-specifications.md) - Output templates and presentation guidelines
- [Nuclei Template Locations](references/nuclei-template-locations.md) - Repository structure and search patterns
- [Threat Actor Attribution](references/threat-actor-attribution.md) - APT/ransomware group identification and tracking

## Related Skills

| Skill                                  | Purpose                                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `researching-cisa-kev`                 | Core KEV research this skill delegates to                                                                      |
| `researching-perplexity`               | Synthesized threat intelligence for attribution                                                                |
| `orchestrating-research` (LIBRARY)     | Multi-source research orchestration - `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")` |
| `writing-nuclei-templates`             | Create detection capabilities for gaps                                                                         |
| `orchestrating-capability-development` | Full capability development workflow                                                                           |

---

## Changelog

See `.history/CHANGELOG` for version history.
