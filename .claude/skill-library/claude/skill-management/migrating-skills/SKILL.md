---
name: migrating-skills
description: Use when moving skills between core and library - safe migration with gateway and dependency updates
allowed-tools: Read, Edit, Bash, Grep, TodoWrite, AskUserQuestion
---

# Migrating Skills

**Safe skill migration between core ↔ library with comprehensive updates.**

> **IMPORTANT**: Use TodoWrite to track the 6-step migration. Missing steps can break skill discovery.

---

## What This Skill Does

Safely migrates skills by:
1. ✅ Validating source skill exists
2. ✅ Determining target location
3. ✅ Moving directory to target
4. ✅ Updating gateway references
5. ✅ Updating command references
6. ✅ Verifying no broken references

**Critical:** Core ↔ Library migration impacts skill discovery (token budget vs on-demand).

---

## When to Use

**Promote to Core (Library → Core):**
- Skill used frequently across projects
- High-value universal skill
- Core has available slots (<25 skills)

**Demote to Library (Core → Library):**
- Skill rarely used
- Domain-specific (not universal)
- Freeing Core slots for higher-priority skills

**NOT for:**
- Renaming skills (use `renaming-skills`)
- Creating skills (use `creating-skills`)
- Moving within library categories (manual `mv`)

---

## Migration Decision Matrix

| Factor | Promote to Core | Keep/Move to Library |
|--------|----------------|---------------------|
| Usage frequency | Every session | Occasional |
| Scope | Universal | Domain-specific |
| Discovery | Need auto-discovery | On-demand via gateway |
| Core slots | Available | Full (need to free) |

---

## Workflow

### Step 1: Validate Source

**Check skill exists:**
```bash
# Core
ls .claude/skills/{skill-name}

# Library
find .claude/skill-library -name "{skill-name}" -type d
```

**Determine current location:**
- Record full path
- Note category if library skill

### Step 2: Determine Target

**If promoting to Core:**
```bash
# Check Core has space (<25 skills)
ls .claude/skills/ | wc -l

# Target: .claude/skills/{skill-name}
```

**If demoting to Library:**
```
Question: Which library category?
Options:
  - claude/skill-management
  - development/frontend
  - development/backend
  - testing
  - operations

# Target: .claude/skill-library/{category}/{skill-name}
```

### Step 3: Move Directory

**Create target if needed:**
```bash
mkdir -p {target-parent-dir}
```

**Move skill:**
```bash
mv {source-path} {target-path}
```

**Verify move:**
```bash
ls {target-path}  # Should exist
ls {source-path}  # Should error
```

### Step 4: Update Gateway References

**If promoting to Core:**
- Remove from library gateway (if referenced)
- Skill now auto-discovered, no gateway needed

**If demoting to Library:**
- Add to appropriate gateway skill
- Update gateway routing table:

```markdown
| Operation | Skill |
|-----------|-------|
| {op} | `.claude/skill-library/{cat}/{skill-name}/SKILL.md` |
```

### Step 5: Update Command References

**Find command references:**
```bash
Grep {
  pattern: "{skill-name}",
  path: ".claude/commands",
  output_mode: "files_with_matches"
}
```

**Update each:**
```typescript
// If promoting to Core
Edit {
  file_path: "{command}",
  old_string: ".claude/skill-library/{cat}/{skill-name}",
  new_string: ".claude/skills/{skill-name}"
}

// If demoting to Library
Edit {
  file_path: "{command}",
  old_string: ".claude/skills/{skill-name}",
  new_string: ".claude/skill-library/{cat}/{skill-name}"
}
```

### Step 6: Verify Integrity

**Search for old path:**
```bash
Grep {
  pattern: "{old-path}",
  path: ".claude",
  output_mode: "files_with_matches"
}
```

**Expected:** Zero matches (or only documentation/changelog)

**Test skill access:**
```
# Core skill
skill: "{skill-name}"  # Should work

# Library skill
Read .claude/skill-library/{cat}/{skill-name}/SKILL.md  # Should work
```

---

## Migration Examples

### Example 1: Promote to Core

**Scenario:** `updating-skills` used in every session, promote to Core

**Before:**
```
.claude/skill-library/claude/skill-management/updating-skills/
```

**After:**
```
.claude/skills/updating-skills/
```

**Updates:**
- Remove from `gateway-claude` (now auto-discovered)
- Update `/skill-manager` command path
- Update other skills that reference it

### Example 2: Demote to Library

**Scenario:** `specialty-skill` rarely used, free Core slot

**Before:**
```
.claude/skills/specialty-skill/
```

**After:**
```
.claude/skill-library/operations/specialty-skill/
```

**Updates:**
- Add to `gateway-operations`
- Update commands to use library path
- Update skills that reference it

---

## Impact Analysis

Before migrating, show user the impact:

```
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

---

## Rollback

If migration fails:

```bash
# Move back
mv {target-path} {source-path}

# Revert all file edits
Edit {
  file_path: "{file}",
  old_string: "{new-path}",
  new_string: "{old-path}"
}
```

---

## Related Skills

- `renaming-skills` - Rename skills (different operation)
- `creating-skills` - Create new skills
