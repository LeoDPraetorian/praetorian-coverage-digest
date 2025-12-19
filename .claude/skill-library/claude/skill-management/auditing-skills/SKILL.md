---
name: auditing-skills
description: Use when validating skill compliance - guides through 16-phase audit with structural and semantic checks
allowed-tools: Bash, Read, Grep, TodoWrite
---

# Auditing Skills

**Comprehensive validation of skill files for structural compliance and quality.**

> **You MUST use TodoWrite** to track audit progress when checking multiple skills.

---

## What This Skill Does

Audits skills across **16 validation phases**:

### Structural Phases (Auto-Fixable)
1. **Description format** - "Use when" trigger, <120 chars, no block scalars
2. **Allowed-tools field** - Comma-separated, valid tool names
3. **Word count** - SKILL.md <500 lines (progressive disclosure)
4. **Broken links** - All references/ and examples/ paths resolve
5. **File organization** - SKILL.md + references/ + examples/ structure
6. **Script organization** - scripts/ with src/, package.json, tsconfig.json
7. **Output directory pattern** - .output/ for CLI outputs, .local/ for temp data
10. **Reference audit** - All SKILL.md references resolve to actual files
12. **CLI error handling** - Scripts exit with proper codes, user-friendly errors

### Semantic Phases (Manual Review)
8. **TypeScript structure** - tsc compiles, vitest types resolve, 100% test pass
9. **Bash-to-TypeScript migration** - No bash scripts (except POSIX-portable wrappers)
11. **Command example audit** - cd commands use portable REPO_ROOT pattern
13. **State externalization** - TodoWrite mandate for multi-step operations

**Why this matters:** Structural issues prevent skills from loading correctly. Progressive disclosure keeps skills under 500 lines. Semantic issues impact maintainability and usability.

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

| Command | Purpose | Time |
|---------|---------|------|
| `npm run audit -- <name>` | Full 16-phase audit (single skill) | 2-3 min |
| `npm run audit` | Full 16-phase audit (all skills) | 5-10 min |
| `npm run audit -- <name> --fix` | Auto-fix deterministic issues | 3-5 min |

**Auto-fixable phases:** 2, 4, 5, 6, 7, 10, 12 (deterministic transformations)
**Manual phases:** 1, 3, 8, 9, 11, 13 (require semantic decisions)

---

## How to Use

### Audit Single Skill

**Setup:**
```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude/skill-library/claude/skill-management/auditing-skills/scripts"
```

**Execute:**
```bash
npm run audit -- <skill-name>
```

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

### Auto-Fix Issues

**Execute:**
```bash
npm run audit -- <skill-name> --fix
```

**What it fixes:**
- Phase 2: Malformed allowed-tools field
- Phase 4: Broken reference links
- Phase 5: Missing directory structure
- Phase 6: Missing script files
- Phase 7: Missing .output/.local directories
- Phase 10: Phantom skill references
- Phase 12: CLI error handling patterns

**What it won't fix (manual):**
- Phase 1: Description format (needs semantic rewrite)
- Phase 3: Line count >500 (needs progressive disclosure restructuring)
- Phase 8: TypeScript compilation errors
- Phase 9: Bash scripts (needs rewrite in TypeScript)
- Phase 11: cd command patterns
- Phase 13: TodoWrite enforcement

---

## Interpreting Results

### ✅ Success (Exit Code 0)

```
✅ Audit passed
  Skill: creating-skills
  Location: .claude/skills/creating-skills
  16/16 phases passed
  No issues found
```

**Action:** Skill is ready to commit.

### ⚠️ Warnings (Exit Code 0)

```
⚠️ Audit passed with warnings
  Skill: updating-skills
  Location: .claude/skill-library/claude/skill-management/updating-skills
  15/16 phases passed

  Phase 1 (Description Format): WARNING
    Description is 127 characters (target: <120)
    Consider shortening for better discovery
```

**Action:** Review warnings, fix if feasible, but not blocking.

### ❌ Failure (Exit Code 1)

```
✗ Audit failed
  Skill: my-broken-skill
  Location: .claude/skills/my-broken-skill
  12/16 phases passed

  Phase 3 (Word Count): FAILURE
    SKILL.md has 687 lines (limit: 500)
    Extract content to references/ directory
    See: .claude/skills/managing-skills/references/progressive-disclosure.md

  Phase 4 (Broken Links): FAILURE
    2 broken references found:
      - [Workflow](references/workflow.md) → File not found
      - [Examples](references/examples.md) → File not found

  Phase 10 (Reference Audit): FAILURE
    1 phantom skill reference found:
      - Line 45: References "non-existent-skill" that doesn't exist

  Run with --fix to auto-fix phases 4 and 10
  Phase 3 requires manual restructuring
```

**Action:** Fix critical issues before committing.

---

## Phase Details

### Phase 1: Description Format

**Checks:**
- ✅ Starts with "Use when"
- ✅ No block scalars (`|` or `>`)
- ✅ <120 characters (warning if >120, <1024)
- ✅ Third-person voice

**Common failures:**
```yaml
# ❌ WRONG: Block scalar
description: |
  Use when creating skills

# ❌ WRONG: First person
description: I help you create skills

# ✅ CORRECT: Single-line, third-person
description: Use when creating skills - guides through TDD workflow
```

### Phase 3: Word Count (Critical)

**Thresholds** (unified across all skill management):

| Lines | Status | Action |
|-------|--------|--------|
| < 350 | ✅ Pass | No action needed |
| 350-450 | ⚠️ Warning | Consider extraction for next update |
| 450-500 | ⚠️ Warning | Plan extraction before adding content |
| > 500 | ❌ Fail | MUST extract to references/ |

**Why:** Attention degradation beyond 500 lines. Skills should use progressive disclosure pattern.

**Fix:** Extract detailed content to `references/` directory:
```markdown
## Detailed Workflow

See [Workflow Reference](references/workflow.md) for step-by-step instructions.
```

### Phase 4: Broken Links

**Checks:** All markdown links resolve to actual files

**Auto-fix:** Creates placeholder files in references/ directory

### Phase 5: File Organization

**Required structure:**
```
skill-name/
├── SKILL.md
├── references/
│   └── (reference files)
├── examples/
│   └── (example files)
└── scripts/ (optional)
    ├── src/
    ├── package.json
    └── tsconfig.json
```

### Phase 6: Script Organization (If scripts/ exists)

**Required:**
- `scripts/src/` directory with TypeScript files
- `scripts/package.json` with dependencies
- `scripts/tsconfig.json` with compiler options

### Phase 8: TypeScript Structure (If scripts/ exists)

**Checks:**
- `tsc` compiles without errors
- `vitest` types resolve
- All tests pass (100%)

**Why:** Broken TypeScript = broken skill functionality

### Phase 10: Reference Audit

**Checks:** All referenced skills/agents exist

**Example failure:**
```markdown
See the `non-existent-skill` skill for details.
```

**Auto-fix:** Removes phantom references or suggests corrections

### Phase 13: State Externalization

**Checks:** Multi-step skills use TodoWrite for tracking

**Why:** Mental tracking = steps get skipped

**Pattern:**
```markdown
**IMPORTANT**: Use TodoWrite to track phases.

1. Phase 1: Task description
2. Phase 2: Another task
```

---

## Fix Workflow

### 1. Run Audit

```bash
npm run audit -- <skill-name>
```

### 2. Identify Issues

Review failures and warnings in output.

### 3. Auto-Fix Deterministic Issues

```bash
npm run audit -- <skill-name> --fix
```

**Fixes phases:** 2, 4, 5, 6, 7, 10, 12

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

# ✅ CORRECT
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

### "Description too long"

**Symptom:** Phase 1 warning, description >120 chars

**Fix:** Compress description, remove filler words
```yaml
# Before (140 chars)
description: Use when you need to create a new skill from scratch - this skill guides you through the complete TDD workflow with validation

# After (98 chars)
description: Use when creating skills - guides through TDD workflow (RED-GREEN-REFACTOR) with validation
```

### "SKILL.md too long"

**Symptom:** Phase 3 failure, >500 lines

**Fix:** Progressive disclosure - extract to references/
```markdown
# In SKILL.md (summary only)
## Workflow

1. Phase 1: Setup
2. Phase 2: Implementation
3. Phase 3: Validation

See [Detailed Workflow](references/workflow.md) for step-by-step instructions.

# In references/workflow.md (full details)
# Detailed Workflow

## Phase 1: Setup
[Complete instructions...]
```

### "Broken references"

**Symptom:** Phase 4 failure, links to missing files

**Fix:** Run auto-fix or create referenced files
```bash
npm run audit -- <skill-name> --fix
```

### "Phantom skill reference"

**Symptom:** Phase 10 failure, references non-existent skill

**Fix:** Either remove reference or create the skill
```markdown
# ❌ References non-existent skill
See the `magic-skill` skill for details.

# ✅ Option 1: Remove reference
# ✅ Option 2: Create magic-skill
```

---

## Related Skills

- `creating-skills` - Create new skills (invokes audit after creation)
- `updating-skills` - Update existing skills (invokes audit for compliance)
- `fixing-skills` - Fix audit issues systematically
