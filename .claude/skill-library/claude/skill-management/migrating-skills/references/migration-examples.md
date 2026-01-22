# Migration Examples and Procedures

## Migration Examples

These examples demonstrate the complete migration process for both promotion to Core and demotion to Library.

### Example 1: Promote to Core

**Scenario:** `updating-skills` used in every session, promote to Core

**Before:**

```plaintext
.claude/skill-library/claude/skill-management/updating-skills/
```

**After:**

```plaintext
.claude/skills/updating-skills/
```

**Updates:**

- Remove from `gateway-claude` (now auto-discovered)
- Update `/skill-manager` command path
- Update other skills that reference it

### Example 2: Demote to Library

**Scenario:** `specialty-skill` rarely used, free Core slot

**Before:**

```plaintext
.claude/skills/specialty-skill/
```

**After:**

```plaintext
.claude/skill-library/operations/specialty-skill/
```

**Updates:**

- Add to `gateway-operations`
- Update commands to use library path
- Update skills that reference it

## Impact Analysis

Before migrating, show user the impact:

```plaintext
Migration Impact for '{skill-name}':

Direction: {Core → Library | Library → Core}
Source: {current-path}
Target: {new-path}

Changes required:
- Gateway: {add/remove/update}
- Commands: {count} files to update
- Skills: {count} references to update

Token budget impact:
- Core → Library: Frees ~100 chars from discovery budget
- Library → Core: Consumes ~100 chars from discovery budget

Continue with migration?
```

## Rollback

If migration fails:

**Move directory back:**

```bash
mv {target-path} {source-path}
```

**Revert file edits:**

```typescript
Edit({
  file_path: "{file}",
  old_string: "{new-path}",
  new_string: "{old-path}",
});
```
