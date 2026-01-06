# Common Audit Failure Patterns

**Quick fixes for frequently encountered audit failures.**

---

## "Description too long"

**Symptom:** Phase 1 warning, description >120 chars

**Fix:** Compress description, remove filler words

```yaml
# Before (140 chars)
description: Use when you need to create a new skill from scratch - this skill guides you through the complete TDD workflow with validation

# After (98 chars)
description: Use when creating skills - guides through TDD workflow (RED-GREEN-REFACTOR) with validation
```

---

## "SKILL.md too long"

**Symptom:** Phase 3 failure, >500 lines

**Fix:** Progressive disclosure - extract to references/

```markdown
# In SKILL.md (summary only)

## Workflow

### Recommended Todo List

**Create these todos at start** (28 phases + CLI + consolidate + fix + re-audit = 31 steps):

1. Run CLI audit | 2-29. Phases 1-28 | 30. Consolidate | 31. Fix & re-audit

**Why mandatory:** 28 phases are easy to skip. TodoWrite prevents oversight.

---

### Workflow Steps

1. Phase 1: Setup
2. Phase 2: Implementation
3. Phase 3: Validation

See [Detailed Workflow](references/workflow.md) for step-by-step instructions.

# In references/workflow.md (full details)

# Detailed Workflow

## Phase 1: Setup

[Complete instructions...]
```

---

## "Broken references"

**Symptom:** Phase 4 failure, links to missing files

**Fix:** Run fixing-skills CLI or create referenced files

```bash
npm run -w @chariot/fixing-skills fix -- <skill-name>
```

---

## "Phantom skill reference"

**Symptom:** Phase 10 failure, references non-existent skill

**Fix:** Either remove reference or create the skill

```markdown
# References non-existent skill

See the `magic-skill` skill for details.

# Option 1: Remove reference

# Option 2: Create magic-skill
```

---

## "TypeScript compilation errors"

**Symptom:** Phase 8 failure, `tsc` reports errors

**Fix:** Resolve TypeScript errors in scripts/src/

```bash
cd {skill-path}/scripts
npm run build  # See errors
# Fix errors in src/
```

---

## "Missing repository root pattern"

**Symptom:** Phase 11 warning, cd commands don't use proper repository root detection

**Fix:** Update to portable pattern

```bash
# WRONG
cd /absolute/path && command

# CORRECT (see repo-root-detection.md for pattern)
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT/relative/path" && command
```

---

## Related

- [Line Count Limits](.claude/skills/managing-skills/references/patterns/line-count-limits.md) - Extraction strategy
- [Repo Root Detection](.claude/skills/managing-skills/references/patterns/repo-root-detection.md) - cd pattern
