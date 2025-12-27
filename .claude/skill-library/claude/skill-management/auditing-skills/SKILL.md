---
name: auditing-skills
description: Use when validating skill compliance - 21-phase audit with fix workflow integration
allowed-tools: Bash, Read, Grep, TodoWrite, AskUserQuestion
---

# Auditing Skills

**Comprehensive validation of skill files for structural compliance and quality.**

> **You MUST use TodoWrite** to track audit progress for all audits to ensure no phases are skipped.

---

## What This Skill Does

Audits skills across **21 validation phases** (+ 3 sub-phases) organized by fix type. See [Phase Categorization](../../../../skills/managing-skills/references/patterns/phase-categorization.md) for complete breakdown.

**Phase categories (three-tier fix model):**
- **Deterministic (8 phases):** 2, 5, 7, 14a-c, 14g, 18 - CLI auto-fix, one correct answer
- **Hybrid (5 phases):** 4, 6, 10, 12, 19 - CLI + Claude reasoning for ambiguous cases
- **Claude-Automated (6 phases):** 1, 3, 11, 13, 17, 21 - Claude applies without human input
- **Human-Required (3 phases):** 8, 9, 20 - genuine human judgment needed
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

| Command                                 | Purpose                              | Time     |
| --------------------------------------- | ------------------------------------ | -------- |
| `npm run audit -- <name>`               | Full 21-phase audit (single skill)   | 2-3 min  |
| `npm run audit -- <name> --agents-data` | Output JSON for agent analysis       | 1 min    |
| `npm run audit`                         | Full 21-phase audit (all skills)     | 5-10 min |

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

**See:** [Repository Root Navigation](references/patterns/repo-root-detection.md)

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

**Two-step workflow:**

```bash
# 1. Detection (audit)
npm run audit -- <skill-name>

# 2. Remediation (fixing-skills)
# Invoke fixing-skills skill via Read tool
Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md")
```

**Or use the fixing-skills CLI for deterministic fixes only:**

```bash
npm run -w @chariot/fixing-skills fix -- <skill-name>
```

**fixing-skills handles all fix types:**

- Phase 1: Description format (Claude-automated)
- Phase 3: Line count >500 (Claude-automated)
- Phase 4: Broken links (hybrid - path correction or content creation)
- Phase 6: Missing scripts (hybrid - opt-in only)
- Phase 10: Phantom references (hybrid - fuzzy matching)
- Phase 11: cd command patterns (Claude-automated)
- Phase 12: CLI error handling (hybrid - exit codes + messages)
- Phase 13: TodoWrite enforcement (Claude-automated)
- Phase 19: Broken gateway paths (hybrid - Claude-primary)

**What requires human judgment:**

- Phase 8: TypeScript compilation errors
- Phase 9: Bash scripts migration
- Phase 20: Coverage gaps (use `syncing-gateways`)

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

Evaluate the skill against these 6 criteria (full details in [Post-Audit Semantic Review](#post-audit-semantic-review) section below):

1. **Description Quality (CSO)** - Does description include key trigger terms for discovery?
2. **Skill Categorization** - Is this frontend/backend/testing/security/tooling/claude?
3. **Gateway Membership** - Should this skill be listed in a gateway? Is it in the correct gateway(s)?
4. **Tool Appropriateness** - Are allowed-tools appropriate for the skill's purpose?
5. **Content Density** - If >500 lines, is the length justified?
6. **External Documentation** - Do library skills link to official docs?

### Output Format

**⛔ CRITICAL: Output semantic findings as JSON ONLY. Do NOT output tables or prose.**

The CLI handles all formatting via the shared formatter from `formatting-skill-output` skill. Your role is to provide structured data, not formatted output.

After evaluating the 6 criteria, write findings to a temporary JSON file:

```bash
TMPFILE=/tmp/semantic-findings-${SKILL_NAME}.json
cat > $TMPFILE << 'EOF'
{
  "findings": [
    {
      "severity": "WARNING",
      "criterion": "Gateway Membership",
      "issue": "Frontend skill missing from gateway-frontend",
      "recommendation": "Add to gateway-frontend routing table"
    }
  ]
}
EOF
```

**If no semantic issues found:**

```bash
cat > $TMPFILE << 'EOF'
{
  "findings": []
}
EOF
```

**Severity levels:**
- **CRITICAL** - Blocks discoverability or causes functional issues (missing gateway, wrong categorization)
- **WARNING** - Impacts usability or maintainability (description quality, tool appropriateness)
- **INFO** - Suggestions for improvement (content density, documentation links)

**Criterion naming:** Use the checklist item name exactly (e.g., "Gateway Membership", "Description Quality", "Tool Appropriateness")

### Combined Output

After writing JSON file, invoke CLI to merge and format:

```bash
npm run -w @chariot/auditing-skills audit -- ${SKILL_NAME} --merge-semantic $TMPFILE
```

**The CLI outputs ONE combined deterministic table. Do NOT output completion message yourself.**

### ⛔ CRITICAL: Output Termination Protocol

**ABSOLUTE RULE**: After the CLI renders the combined table above, your response is COMPLETE.

**Do NOT add ANY text after the CLI command output:**
- ❌ No summary ("Audit complete", "Found X issues")
- ❌ No bullet points or recommendations
- ❌ No prose or commentary
- ❌ No "Here are the findings..."
- ❌ NOTHING

### Output Contract

| Role | Responsibility |
|------|----------------|
| ✅ **You provide** | Semantic findings as JSON |
| ✅ **CLI provides** | Formatted combined table (structural + semantic) |
| ❌ **You do NOT provide** | Any text after CLI runs |

**Violation of this contract = task failure.**

**Why this matters**: Deterministic output requires same input → identical output every time. Claude prose is non-deterministic. The CLI formatter solves this. Your work is done when the CLI completes.

⛔ **END OF TASK** - Stop here.

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

| Selection | Action |
|-----------|--------|
| **Full fixing workflow** | Invoke `fixing-skills` skill with skill name as context |
| **Deterministic only** | Run `npm run -w @chariot/fixing-skills fix -- <skill-name>` |
| **Show categorization** | Display table from [Phase Categorization](../../../../skills/managing-skills/references/patterns/phase-categorization.md) |
| **Skip** | Exit with summary, no action |

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
- **Phase 3**: Word count (< 500 lines HARD LIMIT)
- **Phase 4**: Broken links (auto-fixed with placeholders)
- **Phase 5**: File organization (SKILL.md + references/ + scripts/)
- **Phase 8**: TypeScript structure (must compile, all tests pass)
- **Phase 10**: Reference audit (all referenced skills/agents exist)
- **Phase 13**: State externalization (TodoWrite for multi-step workflows)
- **Phase 14g**: Prettier table formatting (auto-fix via `prettier --write`)

**Table Formatting (Phase 14g):**
Validates markdown tables are formatted with Prettier. See centralized requirements: [Table Formatting](../../../../skills/managing-skills/references/table-formatting.md)

---

## Fix Workflow

### 1. Run Audit

```bash
npm run audit -- <skill-name>
```

### 2. Identify Issues

Review failures and warnings in output.

### 3. Fix Deterministic Issues

```bash
npm run -w @chariot/fixing-skills fix -- <skill-name>
```

**Fixes phases:** 2, 4, 5, 6, 7, 10, 12, 14g (deterministic only)

**For hybrid/Claude-automated phases:** Use `fixing-skills` skill

### 4. Manually Fix Semantic Issues

**Phase 1 (Description):** Rewrite to meet format requirements

**Phase 3 (Line count):** Extract to references/

```bash
# Move detailed content
vim {skill-path}/references/detailed-workflow.md
# Update SKILL.md with link
```

**Phase 8 (TypeScript):** Fix compilation errors

```bash
cd {skill-path}/scripts
npm run build  # See errors
# Fix errors in src/
```

**Phase 9 (Bash migration):** Rewrite bash scripts in TypeScript

**Phase 11 (cd commands):** Update to REPO_ROOT pattern

```bash
# ❌ WRONG
cd /absolute/path && command

# ✅ CORRECT (see repo-root-detection.md for pattern)
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/relative/path" && command
```

**Phase 13 (TodoWrite):** Add TodoWrite mandate to skill

### 5. Re-run Audit

```bash
npm run audit -- <skill-name>
```

**Repeat until:** ✅ All phases pass

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

## Post-Audit Semantic Review

**After structural audit completes, perform semantic review to catch issues code cannot detect.**

Semantic review checklist includes:
1. **Description Quality (CSO)** - Discovery optimization
2. **Skill Categorization** - Frontend/backend/testing/security/tooling
3. **Gateway Membership** - Is skill in appropriate gateway?
4. **Tool Appropriateness** - Are allowed-tools appropriate for purpose?
5. **Content Density** - Is >500 line count justified?
6. **External Documentation Links** - Do library skills have official docs links?

**For complete semantic review workflow, see:** `.claude/skills/managing-skills/references/audit-phases.md` (Post-Audit Semantic Review section)

**For library skill patterns, see:** [references/library-skill-patterns.md](references/library-skill-patterns.md)

---

## Related Skills

- `creating-skills` - Create new skills (invokes audit after creation)
- `updating-skills` - Update existing skills (invokes audit for compliance)
- `fixing-skills` - Fix audit issues systematically
