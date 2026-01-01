---
name: fixing-skills
description: Use when audit failed - fixes compliance errors (TypeScript, broken links, phantom refs, line count, tables)
allowed-tools: Read, Edit, Write, Bash, AskUserQuestion, TodoWrite, Skill
---

# Fixing Skills

**Intelligent compliance remediation using three-tier fix orchestration.**

> **You MUST use TodoWrite** to track fix progress when handling multiple issues.

**Three-tier fix model:**

- **Deterministic**: TypeScript CLI auto-fix (phases 2, 5, 6, 7, 12, 14a, 16, 18)
- **Hybrid**: CLI + Claude reasoning (phases 4, 10, 19)
- **Claude-Automated**: Claude reasoning only (phases 1, 3, 11, 13, 15, 17, 21, 22)
- **Validation-Only**: No auto-fix available (phases 14b-d)
- **Human-Required**: Interactive guidance (phases 8, 9, 20)

**Note:** Phase 14a (table formatting) is the only Phase 14 audit phase with TypeScript auto-fix. Phases 14b-d are validation-only (code block quality, header hierarchy, prose phase references).

See [Phase Categorization](../../../../skills/managing-skills/references/patterns/phase-categorization.md) for complete breakdown.

---

## Quick Reference

| Category         | Phases                                        | Handler          | User Interaction        |
| ---------------- | --------------------------------------------- | ---------------- | ----------------------- |
| Deterministic    | 2, 5, 6, 7, 12, 14a, 16, 18                   | CLI `--fix`      | None (auto-apply)       |
| Hybrid           | 4, 10, 19                                     | CLI + Claude     | Confirm ambiguous cases |
| Claude-Automated | 1, 3, 11, 13, 15, 17, 21, 22, Semantic Crit 7 | Claude reasoning | None (Claude applies)   |
| Validation-Only  | 14b-d                                         | Manual only      | Report issues, no fix   |
| Human-Required   | 8, 9, 20                                      | Interactive      | Full user guidance      |

**Compliance Target:**
Fixes restore compliance with the [Skill Compliance Contract](../../../../skills/managing-skills/references/skill-compliance-contract.md).

---

## Workflow Overview

```
1. Run Audit          → Get issues list
2. Create Backup      → Protect against mistakes
3. Categorize Issues  → Route to correct handler
4. Apply Fixes:
   a. Deterministic   → CLI auto-fix (no confirmation)
   b. Claude-Automated→ Claude applies (no confirmation)
   c. Hybrid          → Claude + confirm ambiguous cases
   d. Human-Required  → Full interactive guidance
5. Re-Audit           → Verify all fixes worked
6. Update Changelog   → Document changes
```

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any fix operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**See:** [Repository Root Navigation](../../../../skills/managing-skills/references/patterns/repo-root-detection.md)

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## Step 1: Run Audit

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT/.claude" && npm run audit -- {skill-name}
```

**Capture output for issue categorization.**

---

## Step 2: Create Backup

**🚨 MANDATORY** - See [Backup Strategy](../../../../skills/managing-skills/references/patterns/backup-strategy.md).

```bash
mkdir -p {skill-path}/.local
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
cp {skill-path}/SKILL.md {skill-path}/.local/${TIMESTAMP}-pre-fix.bak
```

---

## Step 3: Categorize Issues

Based on audit output, group issues by handler:

```
Issues found:
  Deterministic:      Phase 2 (allowed-tools), Phase 5 (directories)
  Claude-Automated:   Phase 1 (description), Phase 3 (line count)
  Hybrid:             Phase 10 (phantom ref)
  Human-Required:     Phase 8 (TypeScript errors)
```

---

## Step 4a: Apply Deterministic Fixes (fixing-skills CLI)

**Phases: 2, 4, 5, 6, 7, 10, 12, 14a, 16, 18**
For table formatting (14a) fixes: `prettier --write` - see [Table Formatting](../../../../skills/managing-skills/references/table-formatting.md)

```bash
npm run -w @chariot/fixing-skills fix -- {skill-name}
```

**No confirmation needed.** These are mechanical transformations with one correct answer.

---

## Step 4b: Apply Claude-Automated Fixes

**Phases: 1, 3, 11, 13, 15, 17, 21**

Claude applies these fixes directly using Edit tool. No human confirmation needed - these require semantic understanding but have clear correct outcomes.

**Covered phases:**

- Phase 1: Description format
- Phase 3: Line count >500
- Phase 11: cd commands
- Phase 13: TodoWrite missing
- Phase 15: Orphan detection
- Phase 17: Gateway structure
- Phase 21: Line number references
- **Semantic Criterion 7: Phase Numbering Hygiene** (fractional phase renumbering)

**Additional procedures:** Section organization, visual readability, example quality

### Phase Numbering Hygiene Fix (Semantic Criterion 7)

**When detected:** Fractional major phase numbers (Phase 3.5, Phase 5.4) found during semantic review

**Fix procedure:**

1. **Identify all major phases** - Scan SKILL.md and references/ for `## Phase X` or `## Step X` headings
2. **Create renumbering map** - Example:
   ```
   Current: Phase 1, 2, 3, 3.5, 4, 5
   Map:     Phase 3.5 → Phase 4
            Phase 4   → Phase 5
            Phase 5   → Phase 6
   Target:  Phase 1, 2, 3, 4, 5, 6
   ```
3. **Update phase headings** - Use Edit tool to renumber ALL major phase headings sequentially in SKILL.md and references/
4. **Update markdown links** - Find and update links to phase files:
   - `[Phase 4](phase-4-file.md)` → `[Phase 5](phase-5-file.md)`
   - Update in both SKILL.md and all reference files
5. **Update prose references** (NEW) - For ALL files in skill directory (SKILL.md + references/*):
   - Find prose patterns using renumbering map:
     - `Phase X (` → `Phase Y (` (e.g., "Phase 4 (implementation)" → "Phase 5 (implementation)")
     - `Phase X:` → `Phase Y:`
     - `Phase X output` → `Phase Y output`
     - `to Phase X` → `to Phase Y`
     - `from Phase X` → `from Phase Y`
     - `return to Phase X` → `return to Phase Y` (case-insensitive)
   - Preserve descriptive text: "Phase 4 (implementation)" → "Phase 5 (implementation)" keeps "(implementation)"
   - Apply to ALL files: troubleshooting.md, progress-persistence.md, agent-handoffs.md, phase-X.md files, etc.
   - **Exclusions**: Skip .history/CHANGELOG (historical), code blocks (external examples)
6. **Verify name hints match** (NEW) - After renumbering:
   - Validate prose hints against actual phase names
   - Example: "Phase 5 (Implementation)" - verify Phase 5 IS implementation phase
   - If mismatch detected, flag for manual review
7. **Update external references** (optional):
   - Search for external references: `grep -r "skill-name.*Phase [0-9]" .claude/`
   - Report as INFO: "External reference found in {file}:{line} - manual review recommended"
   - Do NOT auto-modify external files

**Example transformation:**

```markdown
# Before

## Phase 3: Validation

## Phase 3.5: Additional Check ← Fractional phase

## Phase 4: Implementation

Return to Phase 3.5 for validation details.
See [Phase 4](phase-4-impl.md) for implementation.

# After

## Phase 3: Validation

## Phase 4: Additional Check ← Renumbered from 3.5

## Phase 5: Implementation ← Renumbered from 4

Return to Phase 4 for validation details. ← Prose reference updated
See [Phase 5](phase-5-impl.md) for implementation. ← Link updated
```

**Distinguish from sub-steps:** Do NOT renumber sub-steps like `### Step 7.1` under `## Step 7` - these represent decomposition, not insertion.

See [Detailed Fix Procedures](references/fix-procedures.md) for complete process steps.

---

## Step 4c: Apply Hybrid Fixes

**Phases: 4, 6, 10, 12, 19**

These have deterministic parts that Claude handles automatically, but ambiguous cases require user confirmation.

**Covered phases:**

- Phase 4: Broken links (auto-correct if file exists, prompt if missing)
- Phase 6: Missing scripts (opt-in via prompt)
- Phase 10: Phantom references (auto-replace from deprecation registry, fuzzy match otherwise)
- Phase 12: CLI error handling (auto-correct exit codes, generate contextual messages)
- Phase 19: Broken gateway paths (fuzzy match with user confirmation)

**Additional procedures:** Example quality assessment

See [Detailed Fix Procedures](references/fix-procedures.md) for complete hybrid workflows and AskUserQuestion patterns.

---

## Step 4d: Guide Human-Required Fixes

**Phases: 8, 9, 20**

These require genuine human judgment. Provide interactive guidance.

**Covered phases:**

- Phase 8: TypeScript errors (explain and guide fixes)
- Phase 9: Bash scripts (explain TypeScript migration)
- Phase 20: Coverage gaps (defer to syncing-gateways skill)

See [Detailed Fix Procedures](references/fix-procedures.md) for guidance protocols.

---

## Step 4e: Validation-Only Phases (No Auto-Fix)

**Phases: 14b-d**

These phases detect issues but cannot auto-fix due to requiring semantic understanding and manual review.

**Covered phases:**

- Phase 14b: Code block quality (missing/mismatched language tags, long lines)
- Phase 14c: Header hierarchy (empty headers, incorrect nesting)
- Phase 14d: Prose phase references (stale phase numbers after renumbering)

See [Detailed Fix Procedures](references/fix-procedures.md) for manual remediation steps.

---

## Step 5: Re-Audit

```bash
npm run audit -- {skill-name}
```

**Expected:** All phases pass. If failures remain, return to Step 3.

---

## Step 6: Update Changelog

See [Changelog Format](../../../../skills/managing-skills/references/patterns/changelog-format.md).

```bash
mkdir -p {skill-path}/.history
```

Document fixes applied with method (CLI, Claude, Hybrid, Manual).

---

## Common Scenarios

### Scenario 1: New Skill Cleanup

**Typical issues:** Phase 1 (description), Phase 5 (directories), Phase 4 (broken links)
**Fix order:** CLI (5) → Claude-Auto (1) → Hybrid (4)

### Scenario 2: Over-Long Skill

**Typical issues:** Phase 3 (>500 lines)
**Fix:** Claude-Auto (3) - Extract sections to references/

### Scenario 3: Legacy Skill Migration

**Typical issues:** Phase 9 (bash), Phase 11 (cd paths), Phase 13 (no TodoWrite)
**Fix order:** Claude-Auto (11, 13) → Human (9)

### Scenario 4: Visual/Style Cleanup

**Typical issues:** Phase 14a (tables), Phase 14b (code blocks), Phase 14c (headers)
**Fix order:** CLI (14a) → Manual review (14b-c) → Semantic review (readability)

### Scenario 5: Orphan Library Skill

**Typical issues:** Phase 15 (no gateway or agent reference)
**Fix:** Claude-Auto (15) - Add to appropriate gateway or agent

---

## Related Skills

- `creating-skills` - Create new skills (uses this for final cleanup)
- `updating-skills` - Update existing skills (uses this for compliance)
- `auditing-skills` - Validate skills (identifies issues to fix)
