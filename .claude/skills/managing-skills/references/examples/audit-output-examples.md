# Audit Output Examples

**Single source of truth for audit CLI output formats.**

This file is referenced by:

- `auditing-skills` - Interpreting audit results
- `fixing-skills` - Understanding what to fix

---

## Audit Results

### Success (Exit Code 0)

All phases passed, no issues found:

```
✅ Audit passed
  Skill: creating-skills
  Location: .claude/skill-library/claude/skill-management/creating-skills
  22/22 phases passed
  No issues found
```

**Action:** Skill is ready to commit.

### Warnings (Exit Code 0)

Passed with non-blocking warnings:

```
⚠️ Audit passed with warnings
  Skill: updating-skills
  Location: .claude/skill-library/claude/skill-management/updating-skills
  21/22 phases passed

  Phase 1 (Description Format): WARNING
    Description is 127 characters (target: <120)
    Consider shortening for better discovery
```

**Action:** Review warnings, fix if feasible, but not blocking.

### Failure (Exit Code 1)

One or more phases failed:

```
✗ Audit failed
  Skill: my-broken-skill
  Location: .claude/skills/my-broken-skill
  18/22 phases passed

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

## Fix Summary Output

After applying fixes with `fixing-skills`:

```
Fix Summary for {skill-name}:

Auto-fixes applied:
✅ Phase 4: Created 2 missing reference files
✅ Phase 10: Removed 1 phantom skill reference

Manual fixes completed:
✅ Phase 1: Rewrote description (now 98 chars)
✅ Phase 3: Extracted workflow to references/ (now 347 lines)

Final audit: ✅ 22/22 phases passed

The skill is now compliant and ready to commit.
```

---

## Dry-Run Output

Preview fixes without applying (`--dry-run` mode):

```
Dry-run for {skill-name}:

Would fix:
1. Phase 4: Create references/workflow.md (empty placeholder)
2. Phase 10: Remove line 87 "See non-existent-skill"
3. Phase 1: Change description to:
   Before: "This skill helps you when you need to create new skills..." (72 chars)
   After: "Use when creating skills - TDD workflow, templates" (54 chars)

Apply these 3 fixes? [Yes/No/Preview each]
```

---

## Gateway-Specific Output

For `gateway-*` skills, all 22 phases are run (including gateway-specific phases 17-20):

```
✅ Audit passed
  Skill: gateway-frontend
  Location: .claude/skills/gateway-frontend
  22/22 phases passed
  No issues found
```

Gateway failure example:

```
✗ Audit failed
  Skill: gateway-backend
  Location: .claude/skills/gateway-backend
  20/22 phases passed

  Phase 18 (Routing Table Format): FAILURE
    3 entries use skill names instead of full paths:
      - "using-dynamodb" → should be ".claude/skill-library/..."

  Phase 19 (Path Resolution): FAILURE
    1 broken path found:
      - .claude/skill-library/development/backend/using-old-lib/SKILL.md

  Run with --fix to auto-fix phases 18 and 19
```

---

## Related

- [Phase Categorization](../patterns/phase-categorization.md) - Which phases are auto-fixable
- [Skill Compliance Contract](../skill-compliance-contract.md) - All requirements
