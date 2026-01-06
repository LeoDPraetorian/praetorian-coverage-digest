---
name: fixing-skills
description: Use when audit failed - fixes compliance errors (TypeScript, broken links, phantom refs, line count, tables)
allowed-tools: Read, Edit, Write, Bash, AskUserQuestion, TodoWrite, Skill
---

# Fixing Skills

**Intelligent compliance remediation using three-tier fix orchestration.**

> **You MUST use TodoWrite** to track fix progress when handling multiple issues.

**Three-tier fix model:**

- **Deterministic**: Mechanical transformations (phases 2, 5, 6, 7, 12, 14, 19, 21)
- **Hybrid**: Claude reasoning + confirmation (phases 4, 10, 22)
- **Claude-Automated**: Claude reasoning only (phases 1, 3, 11, 13, 18, 20, 24, 25, 26)
- **Validation-Only**: No auto-fix available (phases 15, 16, 17)
- **Human-Required**: Interactive guidance (phases 8, 9, 23)

**Note:** Phase 14 (table formatting) applies prettier formatting. Phases 15-17 are validation-only (code block quality, header hierarchy, prose phase references).

See [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md) for complete breakdown.

---

## Quick Reference

| Category         | Phases                                       | Handler          | User Interaction        |
| ---------------- | -------------------------------------------- | ---------------- | ----------------------- |
| Deterministic    | 2, 5, 6, 7, 12, 14, 19, 21                   | Claude applies   | None (auto-apply)       |
| Hybrid           | 4, 10, 22                                    | Claude reasoning | Confirm ambiguous cases |
| Claude-Automated | 1, 3, 11, 13, 18, 20, 24, 25, 26, 28, Crit 7 | Claude reasoning | None (Claude applies)   |
| Validation-Only  | 15, 16, 17                                   | Manual only      | Report issues, no fix   |
| Human-Required   | 8, 9, 23                                     | Interactive      | Full user guidance      |

**Compliance Target:**
Fixes restore compliance with the [Skill Compliance Contract](.claude/skills/managing-skills/references/skill-compliance-contract.md).

---

## Rationalization Prevention

Skill fixing seems mechanical but has shortcuts that leave issues unresolved. Complete all steps fully.

**Reference**: See [shared rationalization prevention](../../../../skills/using-skills/references/rationalization-prevention.md) for:

- Statistical evidence (technical debt ~10% fix rate, 'later' ~5% completion)
- Phrase detection patterns ('close enough', 'just this once', 'I'll fix it later')
- Override protocol (requires AskUserQuestion with explicit risk disclosure)

### Skill Fixing Rationalizations

See [references/rationalization-table.md](references/rationalization-table.md) for domain-specific rationalizations.

**Key principle**: If you detect rationalization phrases in your thinking, STOP. Return to the current step. Complete it fully before proceeding.

---

## Workflow Overview

```
1. Run Audit          → Get issues list
2. Create Backup      → Protect against mistakes
3. Categorize Issues  → Route to correct handler
4. Apply Fixes:
   a. Deterministic   → Claude applies (no confirmation)
   b. Claude-Automated→ Claude applies (no confirmation)
   c. Hybrid          → Claude + confirm ambiguous cases
   d. Human-Required  → Full interactive guidance
5. Verify Fixes       → Check changes resolve issues
6. Update Changelog   → Document changes
```

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any fix operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**See:** [Repository Root Navigation](.claude/skills/managing-skills/references/patterns/repo-root-detection.md)

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Statistical evidence**: ~25% of fix failures are caused by wrong working directory. The 2-second navigation check prevents 10+ minutes of debugging 'file not found' errors.

**Cannot proceed without navigating to repo root** ✅

---

## Step 1: Run Audit

Invoke the auditing-skills skill to get issues list:

```
Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")
# Then audit the target skill
```

**Capture findings for issue categorization.**

---

## Step 2: Create Backup

**🚨 MANDATORY** - See [Backup Strategy](.claude/skills/managing-skills/references/patterns/backup-strategy.md).

**Statistical evidence**: ~20% of fix attempts require rollback due to unintended side effects. Backups take 2 seconds and save hours of reconstruction.

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

## Step 4a: Apply Deterministic Fixes

**Phases: 2, 5, 6, 7, 12, 14, 19, 21**

Claude applies these fixes directly using Edit tool. No confirmation needed - these are mechanical transformations with one correct answer.

**For table formatting (Phase 14):** Apply prettier formatting - see [Table Formatting](.claude/skills/managing-skills/references/table-formatting.md)

---

## Step 4b: Apply Claude-Automated Fixes

**Phases: 1, 3, 11, 13, 18, 20, 24, 25, 26, 28**

Claude applies these fixes directly using Edit tool. No human confirmation needed - these require semantic understanding but have clear correct outcomes.

**Covered phases:**

- Phase 1: Description format
- Phase 3: Line count >500
- Phase 11: cd commands
- Phase 13: TodoWrite missing
- Phase 18: Orphan detection
- Phase 20: Gateway structure
- Phase 24: Line number references
- Phase 25: Context7 staleness
- Phase 26: Reference content quality (see [Phase 26 Fix Procedure](#phase-26-fix-procedure) below)
- Phase 28: Integration section (see [Phase 28 Fix Procedure](#phase-28-fix-procedure) below)
- **Semantic Criterion 7: Phase Numbering Hygiene** (fractional phase renumbering)

**Additional procedures:** Section organization, visual readability, example quality

### Phase 26 Fix Procedure

**When detected:** Genuine stubs (empty/incomplete reference files) found during semantic review

**🚨 CRITICAL: Never use training data to populate missing content. Always invoke orchestrating-research.**

**Fix procedure:**

1. **Identify genuine stubs** - Phase 26 flags files that are truly incomplete (not templates, not anti-pattern examples, not redirects)

2. **Ask user about research** - Use AskUserQuestion to confirm research approach:
   - Option A: 'Yes, invoke orchestrating-research (Recommended)'
   - Option B: 'No, user will provide content directly'

3. **If user selects 'Yes' - Set up continuation state BEFORE invoking research:**

   a. Write remaining fix phases to TodoWrite:

   ```
   TodoWrite([
     { content: 'Phase 26: Research for stub content', status: 'in_progress', activeForm: 'Researching stub content' },
     { content: 'Populate incomplete reference files', status: 'pending', activeForm: 'Populating reference files' },
     { content: 'Step 5: Verify fixes', status: 'pending', activeForm: 'Verifying fixes' },
     { content: 'Step 6: Update changelog', status: 'pending', activeForm: 'Updating changelog' }
   ])
   ```

   b. Invoke orchestrating-research:

   ```
   skill: 'orchestrating-research'
   ```

   c. When orchestrating-research returns with 'WORKFLOW_CONTINUATION_REQUIRED':
   - Mark research todo as complete
   - Read ${OUTPUT_DIR}/SYNTHESIS.md
   - Extract patterns, code examples, and citations
   - Continue immediately with 'Populate incomplete reference files' todo
   - Populate the stub files with verified content (NOT placeholder text)
   - Continue through Step 5 (Verify) and Step 6 (Changelog)

   **Do NOT:**
   - Report 'Research complete!' and stop
   - Summarize findings and wait for user to say 'continue'
   - Generate content from training data
   - Create TODO comments or stub content

4. **If user selects 'No'** - Wait for user to provide content, then apply it to the incomplete files and continue with Step 5.

**Why research is mandatory for stubs:** Using training data produces outdated or incorrect content. Research ensures skills contain verified, current information from authoritative sources.

**See:** [Phase 26 Semantic Review](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-26-semantic-review.md)

### Phase 28 Fix Procedure

**When detected:** Missing or incomplete Integration section

**Fix procedure:**

1. **Analyze skill content** - Find all skill references:
   - `skill: "X"` invocations
   - `Read(".../X/SKILL.md")` invocations
   - Prose references to skills

2. **Determine Called By** - Search for what invokes this skill:

   ```bash
   # Search for skills that reference this skill
   grep -r "skill-name" .claude/skills/ .claude/skill-library/ .claude/commands/ --include="*.md"
   ```

3. **Determine Requires** - Find prerequisites:
   - Look for "MUST invoke X first" patterns
   - Look for "REQUIRED SUB-SKILL" directives
   - Identify skills invoked at start (Phase 0, Step 0)

4. **Determine Calls** - Find invoked skills:
   - `skill: "X"` → Calls section
   - `Read(".../X/SKILL.md")` → Calls section
   - Note which phase/step invokes each

5. **Determine Pairs With** - Find conditional relationships:
   - "If X then invoke Y" patterns
   - Optional complementary skills

6. **Generate Integration section**:

   ```markdown
   ## Integration

   ### Called By

   - [Results from step 2]

   ### Requires (invoke before starting)

   | Skill                 | When | Purpose |
   | --------------------- | ---- | ------- |
   | [Results from step 3] |

   ### Calls (during execution)

   | Skill                 | Phase/Step | Purpose |
   | --------------------- | ---------- | ------- |
   | [Results from step 4] |

   ### Pairs With (conditional)

   | Skill                 | Trigger | Purpose |
   | --------------------- | ------- | ------- |
   | [Results from step 5] |
   ```

7. **Insert Integration section**:
   - If "Related Skills" exists: Insert Integration BEFORE it
   - If no "Related Skills": Insert before "References" or at end
   - Optionally consolidate/remove "Related Skills" if redundant

**Migration from Related Skills:**

If skill has "## Related Skills" but no "## Integration":

1. Generate Integration section from analysis
2. Insert Integration section
3. If Related Skills is now redundant (all info in Integration), remove it
4. If Related Skills has additional info, keep it below Integration

**See:** [Phase 28 details](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details.md#phase-28-integration-section)

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
5. **Update prose references** (NEW) - For ALL files in skill directory (SKILL.md + references/\*):
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

See [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md) for complete process steps.

---

## Step 4c: Apply Hybrid Fixes

**Phases: 4, 10, 22**

These have deterministic parts that Claude handles automatically, but ambiguous cases require user confirmation.

**Covered phases:**

- Phase 4: Broken links (auto-correct if file exists, prompt if missing)
- Phase 10: Phantom references (auto-replace from deprecation registry, fuzzy match otherwise)
- Phase 22: Broken gateway paths (fuzzy match with user confirmation)

**Additional procedures:** Example quality assessment

See [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md) for complete hybrid workflows and AskUserQuestion patterns.

---

## Step 4d: Guide Human-Required Fixes

**Phases: 8, 9, 23**

These require genuine human judgment. Provide interactive guidance.

**Covered phases:**

- Phase 8: TypeScript errors (explain and guide fixes)
- Phase 9: Bash scripts (explain TypeScript migration)
- Phase 23: Coverage gaps (defer to syncing-gateways skill)

See [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md) for guidance protocols.

---

## Step 4e: Validation-Only Phases (No Auto-Fix)

**Phases: 15, 16, 17**

These phases detect issues but cannot auto-fix due to requiring semantic understanding and manual review.

**Covered phases:**

- Phase 15: Code block quality (missing/mismatched language tags, long lines)
- Phase 16: Header hierarchy (empty headers, incorrect nesting)
- Phase 17: Prose phase references (stale phase numbers after renumbering)

See [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md) for manual remediation steps.

---

## Step 5: Verify Fixes

Re-run audit to verify all issues are resolved:

```
Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")
# Then re-audit the target skill
```

**Statistical evidence**: Fix attempts that skip verification have ~30% incomplete fix rate (some issues remain or new issues introduced). Re-audit takes 30 seconds and catches regressions.

**Expected:** All phases pass. If failures remain, return to Step 3.

---

## Step 6: Update Changelog

See [Changelog Format](.claude/skills/managing-skills/references/patterns/changelog-format.md).

```bash
mkdir -p {skill-path}/.history
```

Document fixes applied with method (Deterministic, Claude-Automated, Hybrid, Manual).

---

## Common Scenarios

### Scenario 1: New Skill Cleanup

**Typical issues:** Phase 1 (description), Phase 5 (directories), Phase 4 (broken links)
**Fix order:** Deterministic (5) → Claude-Auto (1) → Hybrid (4)

### Scenario 2: Over-Long Skill

**Typical issues:** Phase 3 (>500 lines)
**Fix:** Claude-Auto (3) - Extract sections to references/

### Scenario 3: Legacy Skill Migration

**Typical issues:** Phase 9 (bash), Phase 11 (cd paths), Phase 13 (no TodoWrite)
**Fix order:** Claude-Auto (11, 13) → Human (9)

### Scenario 4: Visual/Style Cleanup

**Typical issues:** Phase 14 (tables), Phase 15 (code blocks), Phase 16 (headers)
**Fix order:** Deterministic (14) → Manual review (15-16) → Semantic review (readability)

### Scenario 5: Orphan Library Skill

**Typical issues:** Phase 18 (no gateway or agent reference)
**Fix:** Claude-Auto (18) - Add to appropriate gateway or agent

---

## Related Skills

- `creating-skills` - Create new skills (uses this for final cleanup)
- `updating-skills` - Update existing skills (uses this for compliance)
- `auditing-skills` - Validate skills (identifies issues to fix)
