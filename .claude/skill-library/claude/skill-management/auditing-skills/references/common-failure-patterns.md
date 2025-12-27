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

**Create these todos at start** (21 phases + CLI + consolidate + fix + re-audit = 24 steps):

1. Run CLI audit | 2-13. Phases 1-12 | 14-17. Gateway phases (if applicable) | 18. Consolidate | 19. Fix & re-audit

**Why mandatory:** 21 phases are easy to skip. TodoWrite prevents oversight.

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

## "Missing cd REPO_ROOT pattern"

**Symptom:** Phase 11 warning, cd commands don't use REPO_ROOT

**Fix:** Update to portable pattern

```bash
# WRONG
cd /absolute/path && command

# CORRECT (see repo-root-detection.md for pattern)
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/relative/path" && command
```

---

## Related

- [Line Count Limits](../../../../skills/managing-skills/references/patterns/line-count-limits.md) - Extraction strategy
- [Phase 01 Description](../../../../skills/managing-skills/references/phase-01-description.md) - Format requirements
- [Repo Root Detection](../../../../skills/managing-skills/references/patterns/repo-root-detection.md) - cd pattern
