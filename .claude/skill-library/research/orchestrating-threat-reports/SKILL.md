---
name: orchestrating-threat-reports
description: Use when generating threat intelligence reports with customer impact analysis - coordinates KEV research, asset exposure assessment, detection gap remediation, and quality validation in 4 phases with agent spawning
allowed-tools: Read, Write, Bash, TodoWrite, AskUserQuestion, WebSearch, WebFetch, Task
---

# Threat Intelligence Report with Customer Impact

**End-to-end threat intelligence workflow: KEV research → Customer impact → Detection gap remediation → Quality validation.**

## Purpose

Generate customer-facing threat intelligence reports that:
1. Research actively exploited CVEs from CISA KEV catalog
2. Assess customer-specific asset exposure
3. Automate detection capability development for gaps
4. Validate detection quality through reviewer and tester agents

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

**Agent:** Spawns `research-agent` via Task tool

**Skill:** `generating-threat-intelligence-reports`

**Input:**
- Timeframe: `--days` parameter
- Top N: `--top` parameter
- Industry Vertical: `--vertical` parameter

**Output:**
- REPORT.md with top CVEs
- Attribution data with threat actors
- Detection status (COVERED/GAP) for each CVE

**Execution:**
```typescript
Task({
  subagent_type: "general-purpose",
  description: "Research CISA KEV threats",
  prompt: `Read and execute .claude/skill-library/research/generating-threat-intelligence-reports/SKILL.md

Parameters:
  - days: ${days}
  - top: ${top}
  - vertical: ${vertical}

Output: Write to ${OUTPUT_DIR}/REPORT.md`
})
```

### Phase 2: Customer Impact Analysis

**Agent:** Spawns `customer-impact-agent` via Task tool

**Skill:** `analyzing-cve-customer-impact`

**For each CVE in report** (ALL CVEs, not just gaps):

**Input:**
- CVE IDs: All CVEs from Phase 1 report
- Customer/Account: `--account` parameter (or prompt if not provided)

**Output:**
- IMPACT.md with asset exposure analysis
- List of affected assets per CVE
- Priority scoring by exposure + criticality

**Execution:**
```typescript
Task({
  subagent_type: "general-purpose",
  description: "Analyze customer CVE impact",
  prompt: `Read and execute .claude/skill-library/research/analyzing-cve-customer-impact/SKILL.md

Parameters:
  - cve_ids: ${all_cves}
  - account: ${account}

Output: Write to ${OUTPUT_DIR}/IMPACT.md`
})
```

### Phase 3: Detection Gap Remediation

**Agent:** Spawns `cve-research-orchestrator-agent` via Task tool

**Skill:** `orchestrating-cve-research-jobs`

**For CVEs with detection gaps only** (no nuclei template or PR):

**Input:**
- CVE IDs: Only GAP CVEs from Phase 1 (no template AND no PR)
- Create PRs: true
- Create Linear tickets: true

**Output:**
- RESEARCH-JOBS.md with job tracking
- PR links for nuclei templates
- Linear tickets for capability development

**Execution:**
```typescript
Task({
  subagent_type: "general-purpose",
  description: "Orchestrate CVE research jobs",
  prompt: `Read and execute .claude/skill-library/research/orchestrating-cve-research-jobs/SKILL.md

Parameters:
  - cve_ids: ${gap_cves}
  - create_prs: true
  - create_linear_tickets: true

Output: Write to ${OUTPUT_DIR}/RESEARCH-JOBS.md`
})
```

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

### Phase 4: Quality Validation (CONDITIONAL)

**Agents:** Spawns `capability-reviewer` + `capability-tester` in parallel via Task tool

**Skip condition:** Phase 3 did not create research jobs (no PRs generated)

**Purpose:** Validate detection quality for newly created nuclei templates/capabilities

**Input:**
- PR links from Phase 3 RESEARCH-JOBS.md
- Nuclei template files from PRs
- Test data for validation

**Output:**
- QUALITY-REPORT.md with review and test results
- Verdict: APPROVED / CHANGES_REQUIRED / ESCALATE

**Execution:**
```typescript
// Spawn reviewer and tester in parallel
Task({
  subagent_type: "capability-reviewer",
  description: "Review nuclei templates",
  prompt: `Review nuclei templates from PRs: ${pr_links}

Validate:
  - Detection accuracy
  - False positive rate
  - YAML syntax
  - Metadata completeness

Output: Write review to ${OUTPUT_DIR}/QUALITY-REPORT.md (Reviewer section)`
})

Task({
  subagent_type: "capability-tester",
  description: "Test nuclei templates",
  prompt: `Test nuclei templates from PRs: ${pr_links}

Execute:
  - Unit tests (syntax validation)
  - Integration tests (detection accuracy)
  - Performance tests (scan time)

Output: Write test results to ${OUTPUT_DIR}/QUALITY-REPORT.md (Tester section)`
})
```

**Quality gate:**
- Wait for both agents to complete
- Both must return **APPROVED** verdict
- If CHANGES_REQUIRED: Fix issues → Re-run Phase 4
- If ESCALATE: Manual review required → Notify user

## Output Structure

```
.claude/.output/threat-report/{timestamp}-{customer}/
├── REPORT.md              # Threat intelligence report (Phase 1) - Tentative status
├── ATTRIBUTION-SOURCES.md # Source citations (Phase 1)
├── IMPACT.md             # Customer impact analysis (Phase 2) - Refined status by exposure
├── RESEARCH-JOBS.md      # CVE research tracking (Phase 3) - Final status with remediation
├── QUALITY-REPORT.md     # Quality validation results (Phase 4) - Review + Test verdict
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
# Phase execution sequence (agent-based orchestration)
Phase 1: Threat Intelligence Research (ALWAYS)
  └─> Task(subagent_type: "general-purpose", skill: generating-threat-intelligence-reports)
       Input: days, top, vertical
       Output: REPORT.md with CVEs + gaps

Phase 2: Customer Impact Analysis (ALWAYS)
  └─> Task(subagent_type: "general-purpose", skill: analyzing-cve-customer-impact)
       Input: ALL CVE IDs from Phase 1, account
       Output: IMPACT.md with affected assets

Phase 3: Detection Gap Remediation (CONDITIONAL)
  └─> Task(subagent_type: "general-purpose", skill: orchestrating-cve-research-jobs)
       Input: GAP CVE IDs only from Phase 1 (no template AND no PR)
       Output: RESEARCH-JOBS.md with PR/ticket tracking
       Skip if: --skip-research=true OR zero GAP CVEs

       CRITICAL: Execute Phase 3 even if customer has zero vulnerable assets
       Rationale: Build detection for ecosystem, not just one customer

Phase 4: Quality Validation (CONDITIONAL)
  └─> Task(subagent_type: "capability-reviewer") + Task(subagent_type: "capability-tester") [PARALLEL]
       Input: PR links from Phase 3
       Output: QUALITY-REPORT.md with verdict
       Skip if: Phase 3 did not create research jobs (no PRs)

       Quality Gate: Both agents must return APPROVED before completion
```

## Agent Spawning Pattern

**Orchestrator spawns agents via Task tool. Agents load and execute skills.**

```typescript
// Phase 1: Spawn research agent
Task({
  subagent_type: "general-purpose",
  description: "Research CISA KEV threats",
  prompt: `Read and execute .claude/skill-library/research/generating-threat-intelligence-reports/SKILL.md

Parameters: days=${days}, top=${top}, vertical=${vertical}
Output: ${OUTPUT_DIR}/REPORT.md`
})

// Phase 2: Spawn customer impact agent
Task({
  subagent_type: "general-purpose",
  description: "Analyze customer CVE impact",
  prompt: `Read and execute .claude/skill-library/research/analyzing-cve-customer-impact/SKILL.md

Parameters: cve_ids=${all_cves}, account=${account}
Output: ${OUTPUT_DIR}/IMPACT.md`
})

// Phase 3: Spawn CVE research orchestrator agent (if gaps exist)
if (gaps_exist && !skip_research) {
  Task({
    subagent_type: "general-purpose",
    description: "Orchestrate CVE research jobs",
    prompt: `Read and execute .claude/skill-library/research/orchestrating-cve-research-jobs/SKILL.md

Parameters: cve_ids=${gap_cves}, create_prs=true, create_linear_tickets=true
Output: ${OUTPUT_DIR}/RESEARCH-JOBS.md`
  })
}

// Phase 4: Spawn quality gate agents in parallel (if research jobs created)
if (research_jobs_created) {
  Task({
    subagent_type: "capability-reviewer",
    description: "Review nuclei templates",
    prompt: `Review PRs: ${pr_links}
Output: ${OUTPUT_DIR}/QUALITY-REPORT.md (Reviewer section)`
  })

  Task({
    subagent_type: "capability-tester",
    description: "Test nuclei templates",
    prompt: `Test PRs: ${pr_links}
Output: ${OUTPUT_DIR}/QUALITY-REPORT.md (Tester section)`
  })
}
```

## Progress Tracking

**TodoWrite items:**

```yaml
TodoWrite:
  - content: "Execute Phase 1: Threat Intelligence Research"
    activeForm: "Executing Phase 1: Threat Intelligence Research"
    status: "pending"
  - content: "Execute Phase 2: Customer Impact Analysis for ALL CVEs"
    activeForm: "Executing Phase 2: Customer Impact Analysis"
    status: "pending"
  - content: "Execute Phase 3: CVE Research Jobs for GAPs"
    activeForm: "Executing Phase 3: CVE Research Jobs"
    status: "pending"
  - content: "Execute Phase 4: Quality Validation"
    activeForm: "Executing Phase 4: Quality Validation"
    status: "pending"
  - content: "Consolidate outputs and generate MANIFEST.yaml"
    activeForm: "Consolidating outputs and generating MANIFEST.yaml"
    status: "pending"
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
- Skip Phase 4 (no PRs to validate)
- Provide manual fallback instructions

**Phase 4 fails:**
- **Reviewer returns CHANGES_REQUIRED:**
  - Fix issues in nuclei templates
  - Re-run Phase 4 (max 2 retries)
  - If still fails: Escalate to manual review

- **Tester returns CHANGES_REQUIRED:**
  - Analyze test failures
  - Fix detection logic
  - Re-run Phase 4 (max 2 retries)
  - If still fails: Escalate to manual review

- **Either agent returns ESCALATE:**
  - STOP workflow
  - Notify user of critical quality issue
  - Provide manual review instructions

- **Complete Phase 1-3 outputs remain valid** (quality gate is separate concern)

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

## Integration

### Called By

- `/threat-report` command (CORE) - User-facing slash command

### Requires (invoke before starting)

None - Entry point orchestration skill

### Calls (during execution)

| Skill | Phase/Step | Purpose |
|-------|-----------|---------|
| `generating-threat-intelligence-reports` (LIBRARY) | Phase 1 | Research CISA KEV catalog - `Read(".claude/skill-library/research/generating-threat-intelligence-reports/SKILL.md")` |
| `analyzing-cve-customer-impact` (LIBRARY) | Phase 2 | Assess customer asset exposure - `Read(".claude/skill-library/research/analyzing-cve-customer-impact/SKILL.md")` |
| `orchestrating-cve-research-jobs` (LIBRARY) | Phase 3 | Trigger capability development for gaps - `Read(".claude/skill-library/research/orchestrating-cve-research-jobs/SKILL.md")` |

### Pairs With (conditional)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `orchestrating-research` (LIBRARY) | General research needs | Multi-source research with synthesis |
| `orchestrating-capability-development` (LIBRARY) | Building detection capabilities | Complete capability development workflow |

## Related Skills

- `orchestrating-research` (LIBRARY) - General research orchestration
- `generating-threat-intelligence-reports` (LIBRARY) - Phase 1 KEV research
- `analyzing-cve-customer-impact` (LIBRARY) - Phase 2 customer impact
- `orchestrating-cve-research-jobs` (LIBRARY) - Phase 3 capability development

## Changelog

- 2026-01-22: Added Phase 4 quality validation gates + agent spawning pattern (platform compliance)
- 2026-01-22: Refactored from command to library skill (Router Pattern compliance)
- 2026-01-13: Added explicit Phase 3 skip logic and Common Rationalizations section
- 2026-01-12: Initial implementation with 3-phase workflow
