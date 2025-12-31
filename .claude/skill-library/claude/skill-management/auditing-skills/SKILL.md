---
name: auditing-skills
description: Use when validating skill compliance - 23-phase audit with fix workflow integration
allowed-tools: Bash, Read, Grep, TodoWrite, AskUserQuestion
---

# Auditing Skills

**Comprehensive validation of skill files for structural compliance and quality.**

> **You MUST use TodoWrite** to track audit progress for all audits to ensure no phases are skipped.

---

## What This Skill Does

Audits skills across **23 validation phases** (+ 4 sub-phases) organized by fix type. See [Phase Categorization](../../../../skills/managing-skills/references/patterns/phase-categorization.md) for complete breakdown.

**Phase categories (three-tier fix model):**

- **Deterministic (8 phases):** 2, 5, 6, 7, 12, 14a, 16, 18 - CLI auto-fix, one correct answer
- **Hybrid (3 phases):** 4, 10, 19 - CLI + Claude reasoning for ambiguous cases
- **Claude-Automated (8 phases):** 1, 3, 11, 13, 15, 17, 21, 22 - Claude applies without human input
- **Human-Required (3 phases):** 8, 9, 20 - genuine human judgment needed
- **Validation-Only (3 phases):** 14b, 14c, 14d - detect issues but no auto-fix (error-prone)
- **Gateway-only (4 phases):** 17-20 - apply only to `gateway-*` skills

**Why this matters:** Structural issues prevent skills from loading correctly. Progressive disclosure keeps skills under 500 lines. Semantic issues impact maintainability and usability. Gateway phases ensure the two-tier skill system functions correctly.

---

## When to Use

- After editing any skill file
- Before committing skill changes
- When debugging skill loading issues
- As part of create/update workflows (automatic)

**Automatically invoked by:**

- `creating-skills` (Phase 8: GREEN - run audit)
- `updating-skills` (Phase 7: Compliance checks)

---

## Quick Reference

| Command                                 | Purpose                            | Time     |
| --------------------------------------- | ---------------------------------- | -------- |
| `npm run audit -- <name>`               | Full 23-phase audit (single skill) | 2-3 min  |
| `npm run audit -- <name> --agents-data` | Output JSON for agent analysis     | 1 min    |
| `npm run audit`                         | Full 23-phase audit (all skills)   | 5-10 min |

**Phase categories:** See [Phase Categorization](../../../../skills/managing-skills/references/patterns/phase-categorization.md) for complete breakdown.

**Compliance Contract:**
This skill validates against the [Skill Compliance Contract](../../../../skills/managing-skills/references/skill-compliance-contract.md).

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any audit operation:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
```

**See:** [Repository Root Navigation](../../../../skills/managing-skills/references/patterns/repo-root-detection.md)

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## How to Use

### Audit Single Skill

**Setup (from anywhere in the repo):**

See [Repo Root Detection](../../../../skills/managing-skills/references/patterns/repo-root-detection.md) for the full pattern details.

```bash
# Get repo root (works from super-repo or any submodule)
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude"
```

**Note:** Using `test -z` for compatibility with Claude Code's Bash tool.

**Execute:**

```bash
npm run audit -- <skill-name>
```

> **Note:** This uses workspace shortcuts from `.claude/` root. Ensure you've run `npm install` in `.claude/` first.

**Example:**

```bash
npm run audit -- creating-skills
```

### Audit All Skills

**Execute:**

```bash
npm run audit
```

**What it does:** Recursively checks all SKILL.md files in:

- `.claude/skills/` (core)
- `.claude/skill-library/` (library)

### Fixing Issues

After audit identifies issues, use the `fixing-skills` skill to orchestrate remediation.

```bash
# Deterministic fixes only (fast)
npm run -w @chariot/fixing-skills fix -- <skill-name>

# Full workflow (deterministic + Claude-automated + hybrid)
Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")
```

**See:** [fixing-skills](../fixing-skills/SKILL.md) for fix categories and human-required phases.

---

## Interpreting Results

**⚠️ CRITICAL: DO NOT REFORMAT SCRIPT OUTPUT**

The CLI produces deterministic table output with all structural validation results.

After running the audit CLI, the structural findings appear in Bash output. **Do NOT display any completion message yet.**

**What NOT to do:**

- ❌ Do NOT reformat or summarize the script's table output
- ❌ Do NOT extract information from Bash output and recreate it
- ❌ Do NOT say "Key Issues Identified" or list specific script findings
- ❌ Do NOT display "✅ Audit complete" or any completion message at this point

**Why:** The script produces deterministic output. The audit is NOT complete until semantic review is also performed.

**NEXT STEP:** Proceed immediately to "Performing Semantic Review" section below. Do NOT output anything else.

See [Audit Output Examples](../../../../skills/managing-skills/references/examples/audit-output-examples.md) for complete output formats.

**Quick reference:**

- **✅ Success (Exit 0):** All phases passed, ready to commit
- **⚠️ Warnings (Exit 0):** Passed with non-blocking issues, review recommended
- **❌ Failure (Exit 1):** Critical issues, must fix before committing

---

## Performing Semantic Review

**MANDATORY: After displaying script output, you MUST perform semantic review for ALL audits.**

This applies even if the script passed with zero warnings. Semantic review catches issues that code cannot detect.

### Semantic Review Checklist

Evaluate the skill against these 7 criteria (full details in [Post-Audit Semantic Review](#post-audit-semantic-review) section below):

1. **Description Quality (CSO)** - MANDATORY detailed assessment (see section below)
2. **Skill Categorization** - Is this frontend/backend/testing/security/tooling/claude?
3. **Gateway Membership** - Should this skill be listed in a gateway? Is it in the correct gateway(s)?
4. **Tool Appropriateness** - Are allowed-tools appropriate for the skill's purpose?
5. **Content Density** - If >500 lines, is the length justified?
6. **External Documentation** - Do library skills link to official docs?
7. **Phase Numbering Hygiene** - Are major phases numbered sequentially (no fractional phases)?

### Description Quality Assessment (MANDATORY)

**You MUST evaluate every skill's description against 5 criteria:** Accuracy, Completeness, Specificity, Discoverability, Honesty.

**See:** [Description Quality Assessment](references/description-quality-assessment.md) for the full framework, examples, and JSON output format.

**This is NOT optional.** A skill with poor description = invisible skill.

### Phase Numbering Hygiene Assessment

**Check for fractional major phase numbers** (e.g., Phase 3.5, Phase 5.4) in headings.

**Scan:** SKILL.md and all files under `references/` directory

**Pattern:** `## Phase X.Y` or `## Step X.Y` where X and Y are digits (in headings, not sub-steps)

**Acceptable:** Sub-steps within phases (e.g., `### Step 7.1` under `## Step 7`) represent decomposition, not insertion

**Flag as WARNING:** Fractional major phases should be renumbered sequentially (Phase 3.5→4, Phase 4→5, etc.)

**See:** [Phase Numbering Hygiene](references/phase-numbering-hygiene.md) for detection logic, examples, and output format.

### Output Format

**⛔ CRITICAL: Output semantic findings as JSON ONLY. Do NOT output tables or prose.**

Write findings to JSON file, then invoke CLI to merge:

```bash
npm run -w @chariot/auditing-skills audit -- ${SKILL_NAME} --merge-semantic $TMPFILE
```

**See:** [Semantic Review Output](references/semantic-review-output.md) for JSON format, severity levels, and output contract.

**⚠️ AUDIT IS INCOMPLETE** if you skip Description Quality Assessment.

⛔ **END OF TASK** - After CLI renders combined table, your response is COMPLETE. Add NOTHING.

---

## Post-Audit Actions

**After semantic review completes and combined findings are displayed (script + semantic), prompt user for next steps.**

This applies when either script issues OR semantic issues were found.

Use AskUserQuestion:

```
Question: The audit found fixable issues. How would you like to proceed?
Header: Next steps
Options:
  - Run full fixing workflow (Recommended) - Deterministic + Claude-automated + hybrid fixes with prompts for ambiguous cases
  - Apply deterministic fixes only - Fast, safe (phases 2, 5, 7, 14a-c, 18)
  - Show fix categorization - See which issues are auto-fixable vs need reasoning
  - Skip - I'll fix manually
```

**Based on selection:**

| Selection                | Action                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Full fixing workflow** | Invoke `fixing-skills` skill with skill name as context                                                                   |
| **Deterministic only**   | Run `npm run -w @chariot/fixing-skills fix -- <skill-name>`                                                               |
| **Show categorization**  | Display table from [Phase Categorization](../../../../skills/managing-skills/references/patterns/phase-categorization.md) |
| **Skip**                 | Exit with summary, no action                                                                                              |

**Example invocation for full workflow:**

```
skill: "fixing-skills"
# Context: Audit found issues in <skill-name>
# fixing-skills will orchestrate: deterministic → Claude-automated → hybrid → report human-required
```

**When NOT to prompt:**

- **✅ Success** - Script passed AND semantic review found no issues

---

## Phase Details

**For detailed phase explanations**, see [Phase Details Reference](references/phase-details.md).

**Key phases:**

- **Phase 1**: Description format (starts with "Use when", no block scalars)
- **Phase 3**: Line count (< 500 lines HARD LIMIT)
- **Phase 4**: Broken links (auto-fixed with placeholders)
- **Phase 5**: File organization (SKILL.md + references/ + scripts/)
- **Phase 8**: TypeScript structure (must compile, all tests pass)
- **Phase 10**: Reference audit (all referenced skills/agents exist)
- **Phase 13**: State externalization (TodoWrite for multi-step workflows)
- **Phase 14a**: Prettier table formatting (auto-fix via `prettier --write`)
- **Phase 14b**: Code block quality (validation-only - language detection is error-prone)
- **Phase 14c**: Header hierarchy (validation-only - restructuring headers risks breaking content)
- **Phase 22**: Context7 staleness (warns when context7 documentation is >30 days old)

**Table Formatting (Phase 14a):**
Validates markdown tables are formatted with Prettier. See centralized requirements: [Table Formatting](../../../../skills/managing-skills/references/table-formatting.md)

---

## Fix Workflow

**For fixing issues found by audit**, use the `fixing-skills` skill.

**Quick command (deterministic fixes only):**

```bash
npm run -w @chariot/fixing-skills fix -- <skill-name>
```

**Full workflow:** See [fixing-skills](../fixing-skills/SKILL.md) for comprehensive remediation.

---

## Common Failure Patterns

**Quick fixes for frequently encountered audit failures.**

See [Common Failure Patterns](references/common-failure-patterns.md) for detailed solutions:

- Description too long (Phase 1)
- SKILL.md too long (Phase 3)
- Broken references (Phase 4)
- Phantom skill references (Phase 10)
- TypeScript compilation errors (Phase 8)
- Missing REPO_ROOT pattern (Phase 11)

---

## Related Skills

- `creating-skills` - Create new skills (invokes audit after creation)
- `updating-skills` - Update existing skills (invokes audit for compliance)
- `fixing-skills` - Fix audit issues systematically
