# Detailed Rename Workflow

**Complete step-by-step guide for safe skill renaming operations.**

## Step 1: Validate Source Exists

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

```text
Error: "Skill '<old-skill-name>' not found or invalid"
→ Stop. Verify skill name and location.
```

## Step 2: Validate Target Available

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

```text
Error: "Skill '<new-skill-name>' already exists"
→ Stop. Choose different name or delete existing skill first.
```

## Step 3: Confirm with User

**Use AskUserQuestion to show impact:**

```text
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

## Step 4: Update Frontmatter

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

## Step 5: Move Directory

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

## Step 6: Find All References

**Search strategy:** Find all references to old skill name

**Note:** Gateway references are tracked here but updated separately in Step 8 using `syncing-gateways` for proper table formatting and sorting.

**In gateways (for tracking only):**

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

```text
Files with references:
- .claude/skills/gateway-claude/SKILL.md
- .claude/commands/skill-manager.md
- .claude/skills/skill-manager/SKILL.md
- (list all matches)
```

## Step 7: Update Non-Gateway References

For each non-gateway file found (commands, other skills), update references:

**Note:** Gateways are handled in Step 8 by `syncing-gateways` skill.

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

```text
Updated non-gateway references:
✅ .claude/commands/skill-manager.md (1 occurrence)
✅ .claude/skills/using-skills/SKILL.md (2 occurrences)
✅ .claude/skill-library/.../other-skill/SKILL.md (3 occurrences)

Note: Gateway references will be updated in Step 8.
```

## Step 8: Sync Gateway Tables

**Use `syncing-gateways` skill for proper structural validation.**

After updating non-gateway references, gateway routing tables need to be synced to:

1. Update skill name references with proper formatting
2. Maintain alphabetical sorting
3. Ensure Prettier-compliant table structure

**Read the syncing-gateways skill:**

```typescript
Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md");
```

**Execute the gateway sync workflow:**

The `syncing-gateways` skill will:

- Detect old skill name in gateway routing tables
- Update to new skill name
- Re-sort tables alphabetically
- Validate table formatting
- Fix any structural issues

**Why this matters:**

Using regex/Edit directly on gateway tables can:

- Break table alignment
- Lose alphabetical sorting
- Create formatting inconsistencies
- Miss multi-line routing entries

The `syncing-gateways` skill ensures gateway tables remain structurally sound.

## Step 9: Verify Integrity

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

```text
⚠️ Warning: References still exist:
- {file1}
- {file2}

Review these files manually. May be:
- Comments or documentation (safe to ignore)
- Missed references (need to update)
- Changelog entries (safe to ignore)
```

**Ask user:**

```text
Question: Found {count} files still mentioning old name. Review needed?

Options:
- Show me the files
- Ignore (likely documentation/changelog)
- Update these too
```

## Step 10: Report Success

**Summary output:**

```text
✅ Skill renamed successfully

Old name: <old-skill-name>
New name: <new-skill-name>
Location: {core or library path}

Changes made:
- ✅ Updated frontmatter name field
- ✅ Renamed directory
- ✅ Updated non-gateway references (commands, skills): {count} files
- ✅ Synced gateway routing tables (formatted, sorted)

Verification:
- ✅ No broken references found
- ✅ Gateway tables structurally valid
- ✅ Old directory removed
- ✅ New directory exists with all files

The skill is ready to use with its new name.
```
