# Phase Details Reference

Detailed explanations of key audit phases.

## Phase 1: Description Format

See [Description Format](../../../../../skills/managing-skills/references/phase-01-description.md) for complete requirements.

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

## Phase 3: Line Count (Critical)

See [Line Count Limits](../../../../../skills/managing-skills/references/patterns/line-count-limits.md) for complete thresholds, validation script, and extraction strategy.

**Quick reference:** <350 safe, 350-450 caution, 450-500 warning, >500 FAIL (must extract).

## Phase 4: Broken Links

**Checks:** All markdown links resolve to actual files

**Auto-fix:** Creates placeholder files in references/ directory

## Phase 5: File Organization

See [File Organization](../../../../../skills/managing-skills/references/file-organization.md) for complete requirements.

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

## Phase 6: Script Organization (If scripts/ exists)

**Required:**

- `scripts/src/` directory with TypeScript files
- `scripts/package.json` with dependencies
- `scripts/tsconfig.json` with compiler options

## Phase 8: TypeScript Structure (If scripts/ exists)

**Checks:**

- `tsc` compiles without errors
- `vitest` types resolve
- All tests pass (100%)

**Why:** Broken TypeScript = broken skill functionality

## Phase 10: Reference Audit

**Checks:** All referenced skills/agents exist

**Example failure:**

```markdown
See the `non-existent-skill` skill for details.
```

**Auto-fix:** Removes phantom references or suggests corrections

## Phase 13: State Externalization

**Checks:** Multi-step skills use TodoWrite for tracking

**Why:** Mental tracking = steps get skipped

**Pattern:**

```markdown
**IMPORTANT**: Use TodoWrite to track phases.

1. Phase 1: Task description
2. Phase 2: Another task
```

## Phase 14d: Prose Phase References

**Checks:** Prose phase references match canonical phase list

**What it detects:**

- Stale references like "Phase 4 (implementation)" when Phase 4 is now "Architecture"
- Missing phase numbers referenced in text
- Name hints that don't match the canonical phase name

**Example failure:**

```markdown
Return to Phase 4 (implementation) to fix.
```

When Phase 4 is actually "Architecture" (implementation moved to Phase 5).

**Why:** After phase renumbering (adding/removing phases), prose references become stale while markdown links get caught by Phase 4 (Broken Links).

**Severity:** WARNING (doesn't break functionality)

**Fix:** Validation-Only - requires semantic understanding to fix correctly

**Exclusions:**

- `.history/CHANGELOG` files (historical)
- Code blocks (examples)
- Cross-skill references

## Related

- [Complete Phase List](../../../../../skills/managing-skills/references/audit-phases.md)
- [Phase Categorization](../../../../../skills/managing-skills/references/patterns/phase-categorization.md)
