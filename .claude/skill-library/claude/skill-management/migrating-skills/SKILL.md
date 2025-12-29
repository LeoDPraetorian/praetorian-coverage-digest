---
name: migrating-skills
description: Use when moving skills between core and library - safe migration with gateway and dependency updates
allowed-tools: Read, Edit, Bash, Grep, TodoWrite, AskUserQuestion
---

# Migrating Skills

**Safe skill migration between core ↔ library with comprehensive updates.**

> **You MUST use TodoWrite** before starting to track all 7 steps. Missing steps can break skill discovery.

---

## What This Skill Does

Safely migrates skills by:

1. ✅ Validating source skill exists
2. ✅ Determining target location
3. ✅ Moving directory to target
4. ✅ Updating gateway references
5. ✅ Updating command references
6. ✅ Updating invocation syntax (skill: vs Read)
7. ✅ Verifying no broken references

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

| Factor          | Promote to Core     | Keep/Move to Library  |
| --------------- | ------------------- | --------------------- |
| Usage frequency | Every session       | Occasional            |
| Scope           | Universal           | Domain-specific       |
| Discovery       | Need auto-discovery | On-demand via gateway |
| Core slots      | Available           | Full (need to free)   |

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any migrate operation:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
```

**See:** [Repository Root Navigation](../../../../skills/managing-skills/references/patterns/repo-root-detection.md)

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## Workflow

Follow these 7 steps to safely migrate a skill between core and library locations. Each step is critical to prevent broken references and discovery failures.

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

```plaintext
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

### Step 4: Update Gateway References (Automated)

**Why gateways need updating:**

- **Promoting to Core (Library → Core):** The library gateway entry now points to a non-existent path (skill moved out of library) - becomes a "broken path" that needs removal
- **Demoting to Library (Core → Library):** The skill now exists in library but isn't in any gateway routing table - becomes an "orphaned skill" that needs addition

**How to update (automated):**

Use `syncing-gateways` skill to automatically detect and fix gateway inconsistencies:

```typescript
Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md");
```

**What syncing-gateways does:**

1. **Library → Core migration:**
   - Detects old gateway entry has broken path (skill no longer in library)
   - Automatically removes stale entry from gateway
   - Skill becomes auto-discovered via core

2. **Core → Library migration:**
   - Detects new skill exists in library but not in gateway
   - Maps skill to appropriate gateway based on path pattern:
     - `development/frontend/*` → `gateway-frontend`
     - `development/backend/*` → `gateway-backend`
     - `testing/*` → `gateway-testing`
     - `security/*` → `gateway-security`
     - etc.
   - Automatically adds skill to correct gateway routing table

**Run sync after migration:**

After completing Step 3 (Move Directory), execute the `syncing-gateways` workflow to update all affected gateways automatically. This ensures gateway routing tables stay consistent with actual skill locations.

### Step 5: Update Command References

**Find command references:**

```typescript
Grep({
  pattern: "{skill-name}",
  path: ".claude/commands",
  output_mode: "files_with_matches",
});
```

**Update each:**

```typescript
// If promoting to Core
Edit({
  file_path: "{command}",
  old_string: ".claude/skill-library/{cat}/{skill-name}",
  new_string: ".claude/skills/{skill-name}",
});

// If demoting to Library
Edit({
  file_path: "{command}",
  old_string: ".claude/skills/{skill-name}",
  new_string: ".claude/skill-library/{cat}/{skill-name}",
});
```

### Step 6: Update Invocation Syntax

**Critical:** Skill invocation method changes based on location (two-tier system).

**If demoting to Library (Core → Library):**

Find all `skill:` references and change to `Read()`:

```typescript
// Find skill: invocations
Grep({
  pattern: "skill:\\s*[\"']?{skill-name}[\"']?",
  path: ".claude",
  output_mode: "content",
});
```

Update each reference:

```typescript
Edit({
  file_path: "{file-with-reference}",
  old_string: 'skill: "{skill-name}"',
  new_string: 'Read(".claude/skill-library/{cat}/{skill-name}/SKILL.md")',
});
```

**If promoting to Core (Library → Core):**

Find all `Read()` references and change to `skill:`:

```typescript
// Find Read() invocations
Grep({
  pattern: "Read\\([\"'].*/skill-library/.*/{skill-name}/SKILL\\.md[\"']\\)",
  path: ".claude",
  output_mode: "content",
});
```

Update each reference:

```typescript
Edit({
  file_path: "{file-with-reference}",
  old_string: 'Read(".claude/skill-library/{cat}/{skill-name}/SKILL.md")',
  new_string: 'skill: "{skill-name}"',
});
```

**Why this matters:**

- Core skills: Accessible via `skill:` (Skill tool)
- Library skills: Must use `Read()` (Read tool with full path)
- Wrong invocation method = skill fails after migration

### Step 7: Verify Integrity

**Search for old path:**

```typescript
Grep({
  pattern: "{old-path}",
  path: ".claude",
  output_mode: "files_with_matches",
});
```

**Expected:** Zero matches (or only documentation/changelog)

**Test skill access:**

```typescript
// Core skill
skill: "{skill-name}"; // Should work

// Library skill
Read(".claude/skill-library/{cat}/{skill-name}/SKILL.md"); // Should work
```

---

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

---

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

---

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

---

## Related Skills

- `syncing-gateways` - Automate gateway routing table updates after migration
- `renaming-skills` - Rename skills (different operation)
- `creating-skills` - Create new skills
