---
name: threat-report
description: Generate comprehensive threat intelligence report with customer impact analysis and automated CVE research for detection gaps
argument-hint: [--days N] [--top N] [--vertical Industry] [--account customer] [--skip-research]
allowed-tools: Read, Write, Bash, TodoWrite, AskUserQuestion, WebSearch, WebFetch
---

<command-name>/threat-report</command-name>

# Threat Intelligence Report with Customer Impact

**End-to-end threat intelligence workflow: KEV research → Customer impact → Detection gap remediation.**

## Purpose

Generate customer-facing threat intelligence reports that:
1. Research actively exploited CVEs from CISA KEV catalog
2. Assess customer-specific asset exposure
3. Automate detection capability development for gaps

## Usage

```bash
/threat-report
/threat-report --days 45 --vertical Healthcare --account customer-x
/threat-report --top 10 --vertical Financial
```

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--days` | 45 | KEV catalog timeframe (1-180 days) |
| `--top` | 5 | Number of top CVEs to analyze |
| `--vertical` | All | Industry vertical: Healthcare, Financial, Government, Manufacturing, Energy, Technology, All |
| `--account` | (prompt) | Customer/account identifier for impact analysis |
| `--skip-research` | false | Skip CVE Researcher job creation for gaps |

## Workflow

### Phase 1: Threat Intelligence Research

**Invokes:** `generating-threat-intelligence-reports`

**Input:**
- Timeframe: `--days` parameter
- Top N: `--top` parameter
- Industry Vertical: `--vertical` parameter

**Output:**
- REPORT.md with top CVEs
- Attribution data with threat actors
- Detection status (COVERED/GAP) for each CVE

### Phase 2: Customer Impact Analysis

**Invokes:** `analyzing-cve-customer-impact`

**For each CVE in report** (ALL CVEs, not just gaps):

**Input:**
- CVE IDs: All CVEs from Phase 1 report
- Customer/Account: `--account` parameter (or prompt if not provided)

**Output:**
- IMPACT.md with asset exposure analysis
- List of affected assets per CVE
- Priority scoring by exposure + criticality

### Phase 3: Detection Gap Remediation

**Invokes:** `orchestrating-cve-research-jobs`

**For CVEs with detection gaps only** (no nuclei template or PR):

**Input:**
- CVE IDs: Only GAP CVEs from Phase 1 (no template AND no PR)
- Create PRs: true
- Create Linear tickets: true

**Output:**
- RESEARCH-JOBS.md with job tracking
- PR links for nuclei templates
- Linear tickets for capability development

**Skip conditions (BOTH must be checked):**
1. **User flag:** `--skip-research=true` (user explicitly disabled research)
2. **No gaps:** Zero GAP CVEs found in Phase 1 (all CVEs have templates or PRs)

**CRITICAL: Customer exposure is NOT a skip condition.**
- Phase 3 executes for GAP CVEs **regardless of customer asset exposure**
- Rationale: Build detection capabilities for the ecosystem, not just one customer
- Even if current customer has zero vulnerable assets, future customers may need detection

**Example scenarios:**
- ✅ **Execute:** GAP CVE found + Nielsen has 0 assets → CREATE research job (build for future)
- ✅ **Execute:** GAP CVE found + Nielsen has 5 assets → CREATE research job (urgent remediation)
- ❌ **Skip:** All CVEs have templates/PRs → No research needed
- ❌ **Skip:** `--skip-research=true` → User explicitly disabled

## Output Structure

```
.claude/.output/threat-report/{timestamp}-{customer}/
├── REPORT.md              # Threat intelligence report (Phase 1) - Tentative status
├── ATTRIBUTION-SOURCES.md # Source citations (Phase 1)
├── IMPACT.md             # Customer impact analysis (Phase 2) - Refined status by exposure
├── RESEARCH-JOBS.md      # CVE research tracking (Phase 3) - Final status with remediation
└── MANIFEST.yaml         # Workflow metadata
```

## Progressive Detection Status

**Status evolves through phases:**

| Phase | Status | Example |
|-------|--------|---------|
| Phase 1 | Tentative (COVERED/GAP) | ❌ GAP (needs refinement) |
| Phase 2 | Refined by exposure | ❌ GAP (🔴 CRITICAL - 3 assets exposed) |
| Phase 3 | Updated with remediation | 🔶 IN DEVELOPMENT (🟠 - job running) |

**Final statuses:**
- ✅ **COVERED** (🟢): Template exists, customer safe
- ⚠️ **COVERED-EXPOSED** (🟡): Template exists, customer has vulnerable assets
- 🔶 **IN DEVELOPMENT** (🟠): Gap + research job triggered + customer exposed
- 🔶 **IN DEV-NO EXPOSURE** (🟢): Gap + research job triggered + customer safe
- ❌ **GAP** (🔴): No template, no research (if --skip-research used)

## Example Output

**Command:**
```bash
/threat-report --days 45 --vertical Healthcare --account acme-health
```

**REPORT.md snippet:**
```markdown
# Threat Intelligence Report: 45-Day CISA KEV Analysis

**Industry Focus:** Healthcare
**CVEs Analyzed:** 8 | **Top Priority:** 5

## Key Takeaways

> **Healthcare Under Siege:** 3 of 5 top CVEs specifically target healthcare infrastructure...

## Priority Patching Recommendations

| Priority | CVE | Product | Threat Actor | Detection Status |
|----------|-----|---------|--------------|------------------|
| CRITICAL | CVE-2025-12345 | Epic EHR | APT29 (Russia) | **GAP** |
| HIGH | CVE-2025-23456 | Cerner | LockBit 3.0 | COVERED |
```

**IMPACT.md snippet:**
```markdown
# CVE Customer Impact Assessment

**Customer:** acme-health
**Vulnerable Assets:** 7 of 245 assets

## Critical Findings

### CVE-2025-12345: Epic EHR Zero-Day

**Affected Assets:**
- ehr-prod.acme-health.com (Internet-facing, CRITICAL)
- ehr-backup.acme-health.internal (Internal, HIGH)

**Recommendation:** Immediate patching within 24 hours (active APT29 exploitation)
```

**RESEARCH-JOBS.md snippet:**
```markdown
# CVE Research Job Tracking

**Jobs Created:** 2 (for detection gaps)

| CVE | Job Status | PR Created | Linear Ticket |
|-----|-----------|-----------|---------------|
| CVE-2025-12345 | COMPLETED | [PR #5678](https://github.com/...) | [CHAR-123](https://linear.app/...) |
```

## Implementation

```yaml
# Phase execution sequence
Phase 1: Threat Intelligence Research (ALWAYS)
  └─> generating-threat-intelligence-reports
       Input: days, top, vertical
       Output: REPORT.md with CVEs + gaps

Phase 2: Customer Impact Analysis (ALWAYS)
  └─> analyzing-cve-customer-impact
       Input: ALL CVE IDs from Phase 1, account
       Output: IMPACT.md with affected assets

Phase 3: Detection Gap Remediation (CONDITIONAL)
  └─> orchestrating-cve-research-jobs
       Input: GAP CVE IDs only from Phase 1 (no template AND no PR)
       Output: RESEARCH-JOBS.md with PR/ticket tracking
       Skip if: --skip-research=true OR zero GAP CVEs

       CRITICAL: Execute Phase 3 even if customer has zero vulnerable assets
       Rationale: Build detection for ecosystem, not just one customer
```

## Skill Invocation

**Invoke skills using Read tool:**

```bash
# Phase 1: Threat Intelligence
Read(".claude/skill-library/research/generating-threat-intelligence-reports/SKILL.md")
# Execute with parameters: days={days}, top={top}, vertical={vertical}

# Phase 2: Customer Impact (for ALL CVEs)
Read(".claude/skill-library/research/analyzing-cve-customer-impact/SKILL.md")
# Execute with parameters: cve_ids={all_cves}, account={account}

# Phase 3: CVE Research (for GAP CVEs only)
if gaps_exist and not skip_research:
    Read(".claude/skill-library/research/orchestrating-cve-research-jobs/SKILL.md")
    # Execute with parameters: cve_ids={gap_cves}
```

## Progress Tracking

**TodoWrite items:**

```
1. "Execute Phase 1: Threat Intelligence Research"
2. "Execute Phase 2: Customer Impact Analysis for ALL CVEs"
3. "Execute Phase 3: CVE Research Jobs for GAPs" (conditional)
4. "Consolidate outputs and generate MANIFEST.yaml"
```

## Error Handling

**Phase 1 fails:**
- STOP workflow
- Report error to user
- Do not proceed to Phase 2

**Phase 2 fails:**
- Complete Phase 1 output (REPORT.md still valid)
- Log customer impact analysis error
- Ask user: "Continue to Phase 3 (CVE research) or stop?"

**Phase 3 fails:**
- Complete Phase 1 + 2 outputs (valid without research jobs)
- Log research job creation errors
- Provide manual fallback instructions

## Common Rationalizations (DO NOT SKIP PHASE 3)

| Rationalization | Why It's Wrong |
|----------------|----------------|
| "Customer has zero vulnerable assets, skip Phase 3" | **CRITICAL ERROR:** Phase 3 builds detection for ecosystem, not one customer. Future customers may need this detection. |
| "Only 1 GAP CVE, not worth research job" | Even single GAP CVEs justify research—active KEV exploitation means it affects the ecosystem |
| "Customer exposure should determine Phase 3" | **WRONG:** Phase 3 is conditional on --skip-research flag and GAP existence, NOT customer exposure |
| "Nielsen doesn't use SonicWall, skip CVE-2025-40602 research" | Other customers may use SonicWall—build detection regardless of one customer's stack |
| "Phase 2 showed no impact, Phase 3 unnecessary" | Phase 2 assesses THIS customer. Phase 3 builds for ALL customers. Independent concerns. |
| "Most CVEs are IN DEVELOPMENT, only skip pure GAPs" | IN DEVELOPMENT (PR exists) ≠ GAP. GAP = no template AND no PR. Check both. |

**Correct logic:**
```python
# Phase 3 execution decision
skip_research_flag = user_params.get('skip_research', False)
gap_cves = [cve for cve in phase1_cves if not has_template(cve) and not has_pr(cve)]

if skip_research_flag:
    skip_phase_3("User explicitly disabled via --skip-research=true")
elif len(gap_cves) == 0:
    skip_phase_3("No GAP CVEs found (all have templates or PRs)")
else:
    execute_phase_3(gap_cves)  # EXECUTE regardless of customer exposure
```

**NEVER add customer exposure to this logic.**

## Related Commands

- `/research` - General research orchestration
- `/capability` - Capability development workflow

## Changelog

- 2026-01-13: Added explicit Phase 3 skip logic and Common Rationalizations section
- 2026-01-12: Initial implementation with 3-phase workflow
