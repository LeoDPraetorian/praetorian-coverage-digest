---
name: renaming-skills
description: Use when renaming existing skills - safe renaming with reference updates across gateways and commands
allowed-tools: Read, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Renaming Skills

**Safe skill renaming with comprehensive reference tracking and validation.**

> **IMPORTANT**: Use TodoWrite to track the 7-step rename process. Missing a step can leave broken references.

---

## What This Skill Does

Safely renames skills by:
1. ✅ Validating old skill exists (core or library)
2. ✅ Validating new name available (no conflicts)
3. ✅ Updating frontmatter name field
4. ✅ Renaming the directory
5. ✅ Finding ALL references (gateways, commands, other skills)
6. ✅ Updating each reference (Edit tool)
7. ✅ Verifying no broken references remain

**Critical:** This is an atomic operation - all steps must succeed or rollback.

---

## When to Use

- Standardizing skill names to follow conventions
- Fixing naming inconsistencies
- Reorganizing skill structure
- Consolidating similar skills

**NOT for:**
- Changing skill behavior (use `updating-skills`)
- Creating new skills (use `creating-skills`)
- Moving skills between core ↔ library (use `migrating-skills`)

---

## Quick Reference - 7-Step Safe Rename

| Step | Action | Tool | Verification |
|------|--------|------|--------------|
| 1 | Validate source exists | Bash, Read | Directory exists, valid skill |
| 2 | Validate target available | Bash | No conflicts |
| 3 | Update frontmatter | Edit | Name field updated |
| 4 | Move directory | Bash | New dir exists, old gone |
| 5 | Find references | Grep | List all matches |
| 6 | Update references | Edit | All updated |
| 7 | Verify integrity | Grep | Zero matches for old name |

---

## Complete Workflow

Copy this checklist and track with TodoWrite:

```
Rename Progress:
- [ ] Step 1: Validate source skill exists
- [ ] Step 2: Validate target name available
- [ ] Step 3: Confirm with user (show impact)
- [ ] Step 4: Update frontmatter name
- [ ] Step 5: Move/rename directory
- [ ] Step 6: Find all references
- [ ] Step 7: Update each reference with Edit
- [ ] Step 8: Verify integrity (no old name remains)
- [ ] Step 9: Report success with summary
```

---

## Step-by-Step Instructions

### Step 1: Validate Source Exists

**Check skill exists in core:**
```bash
ls .claude/skills/<old-skill-name>
```

**Check skill exists in library:**
```bash
find .claude/skill-library -name "<old-skill-name>" -type d
```

**Read to validate:**
```bash
Read .claude/skills/<old-skill-name>/SKILL.md
# OR
Read .claude/skill-library/{category}/<old-skill-name>/SKILL.md
```

**Validation checks:**
- [ ] Directory exists
- [ ] Has SKILL.md file
- [ ] Has frontmatter (between `---` markers)
- [ ] Frontmatter has `name:` field
- [ ] Name field matches directory name (or note mismatch to fix)

**If validation fails:**
```
Error: "Skill '<old-skill-name>' not found or invalid"
→ Stop. Verify skill name and location.
```

---

### Step 2: Validate Target Available

**Check core doesn't have target:**
```bash
ls .claude/skills/<new-skill-name> 2>/dev/null
```

**Check library doesn't have target:**
```bash
find .claude/skill-library -name "<new-skill-name>" -type d
```

**Both should return empty/error** (good - name available)

**If target exists:**
```
Error: "Skill '<new-skill-name>' already exists"
→ Stop. Choose different name or delete existing skill first.
```

---

### Step 3: Confirm with User

**Use AskUserQuestion to show impact:**

```
Question: Rename skill '<old-skill-name>' to '<new-skill-name>'?

This will update:
- Frontmatter name field
- Directory name
- References in gateways (gateway-*)
- References in commands (/skill-manager, etc.)
- References in other skills

Continue?

Options:
- Yes - proceed with rename
- No - cancel operation
- Show me what will change (dry-run)
```

**If user selects "Show me what will change":**
- Run Step 5 (find references) but don't apply
- Display all files that would be modified
- Ask again with "Yes/No" options only

**If user selects "No":**
→ Stop. Operation cancelled.

---

### Step 4: Update Frontmatter

**Read current SKILL.md:**
```bash
Read {skill-path}/SKILL.md
```

**Update name field:**
```typescript
Edit {
  file_path: "{skill-path}/SKILL.md",
  old_string: "name: <old-skill-name>",
  new_string: "name: <new-skill-name>"
}
```

**Verify update:**
```bash
grep "^name:" {skill-path}/SKILL.md
# Should show: name: <new-skill-name>
```

---

### Step 5: Move Directory

**Core skill:**
```bash
mv .claude/skills/<old-skill-name> .claude/skills/<new-skill-name>
```

**Library skill:**
```bash
mv .claude/skill-library/{category}/<old-skill-name> \
   .claude/skill-library/{category}/<new-skill-name>
```

**Verify move:**
```bash
# Old should NOT exist
ls {old-path}  # Should error

# New should exist
ls {new-path}  # Should succeed
```

---

### Step 6: Find All References

**Search strategy:** Find all references to old skill name

**In gateways:**
```bash
Grep {
  pattern: "<old-skill-name>",
  path: ".claude/skills/gateway-*",
  output_mode: "files_with_matches"
}
```

**In commands:**
```bash
Grep {
  pattern: "<old-skill-name>",
  path: ".claude/commands",
  output_mode: "files_with_matches"
}
```

**In other skills (core):**
```bash
Grep {
  pattern: "<old-skill-name>",
  path: ".claude/skills",
  output_mode: "files_with_matches"
}
```

**In other skills (library):**
```bash
Grep {
  pattern: "<old-skill-name>",
  path: ".claude/skill-library",
  output_mode: "files_with_matches"
}
```

**Compile list:**
```
Files with references:
- .claude/skills/gateway-claude/SKILL.md
- .claude/commands/skill-manager.md
- .claude/skills/skill-manager/SKILL.md
- (list all matches)
```

---

### Step 7: Update Each Reference

For each file found, update references:

**Pattern 1: Skill invocation**
```typescript
Edit {
  file_path: "{file}",
  old_string: 'skill: "<old-skill-name>"',
  new_string: 'skill: "<new-skill-name>"'
}
```

**Pattern 2: File path references**
```typescript
Edit {
  file_path: "{file}",
  old_string: ".claude/skills/<old-skill-name>/SKILL.md",
  new_string: ".claude/skills/<new-skill-name>/SKILL.md"
}

// Library path
Edit {
  file_path: "{file}",
  old_string: ".claude/skill-library/{cat}/<old-skill-name>/SKILL.md",
  new_string: ".claude/skill-library/{cat}/<new-skill-name>/SKILL.md"
}
```

**Pattern 3: Natural language references**
```typescript
Edit {
  file_path: "{file}",
  old_string: "the `<old-skill-name>` skill",
  new_string: "the `<new-skill-name>` skill"
}

Edit {
  file_path: "{file}",
  old_string: "`<old-skill-name>`",
  new_string: "`<new-skill-name>`"
}
```

**Pattern 4: Frontmatter skills list**
```typescript
Edit {
  file_path: "{file}",
  old_string: "skills: ..., <old-skill-name>, ...",
  new_string: "skills: ..., <new-skill-name>, ..."
}
```

**Track updates:**
```
Updated references:
✅ .claude/skills/gateway-claude/SKILL.md (2 occurrences)
✅ .claude/commands/skill-manager.md (1 occurrence)
✅ .claude/skills/skill-manager/SKILL.md (3 occurrences)
```

---

### Step 8: Verify Integrity

**Search for any remaining old name references:**

```bash
Grep {
  pattern: "<old-skill-name>",
  path: ".claude",
  output_mode: "files_with_matches"
}
```

**Expected result:** Zero matches (empty output)

**If matches found:**
```
⚠️ Warning: References still exist:
- {file1}
- {file2}

Review these files manually. May be:
- Comments or documentation (safe to ignore)
- Missed references (need to update)
- Changelog entries (safe to ignore)
```

**Ask user:**
```
Question: Found {count} files still mentioning old name. Review needed?

Options:
- Show me the files
- Ignore (likely documentation/changelog)
- Update these too
```

---

### Step 9: Report Success

**Summary output:**

```
✅ Skill renamed successfully

Old name: <old-skill-name>
New name: <new-skill-name>
Location: {core or library path}

Changes made:
- ✅ Updated frontmatter name field
- ✅ Renamed directory
- ✅ Updated {count} references across {file-count} files:
  - Gateway files: {count}
  - Command files: {count}
  - Skill files: {count}

Verification:
- ✅ No broken references found
- ✅ Old directory removed
- ✅ New directory exists with all files

The skill is ready to use with its new name.
```

---

## Common Rename Scenarios

### Scenario 1: Standardizing Convention

**Before:** `my_skill` (underscore)
**After:** `my-skill` (kebab-case)

**Why:** Skill names must use kebab-case for consistency

**Fix:**
1. Rename directory
2. Update frontmatter
3. Update all references
4. Verify

### Scenario 2: Clarifying Purpose

**Before:** `helper-skill`
**After:** `frontend-helper-skill`

**Why:** Name too generic, add domain prefix

**Fix:**
1. Rename with domain prefix
2. Update description for clarity
3. Update references
4. May need to update gateway routing

### Scenario 3: Consolidating Duplicates

**Before:** `skill-audit` + `skill-check`
**After:** `skill-audit` (keep one, delete other)

**Process:**
1. Identify which to keep
2. Merge unique content from deleted skill
3. Delete redundant skill directory
4. Update all references to point to kept skill

---

## Rollback Procedure

**If rename fails mid-operation:**

### If failed at Step 4 (frontmatter update):
```bash
# Revert frontmatter
Edit {
  file_path: "{skill-path}/SKILL.md",
  old_string: "name: <new-skill-name>",
  new_string: "name: <old-skill-name>"
}
```

### If failed at Step 5 (directory move):
```bash
# Move back
mv {new-path} {old-path}
```

### If failed at Step 7 (reference updates):
```bash
# Revert each updated file
Edit {
  file_path: "{file}",
  old_string: "<new-skill-name>",
  new_string: "<old-skill-name>"
}

# Move directory back
mv {new-path} {old-path}
```

**Always verify rollback:**
```bash
# Check old name exists again
ls {old-path}

# Check no new name exists
ls {new-path}  # Should error
```

---

## Related Skills

- `creating-skills` - Create new skills
- `updating-skills` - Update existing skills
- `migrating-skills` - Move skills between core ↔ library
