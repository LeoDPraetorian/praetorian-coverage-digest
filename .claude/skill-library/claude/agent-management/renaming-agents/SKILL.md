---
name: renaming-agents
description: Use when renaming agents safely - validates source/target, updates filename and frontmatter, finds and updates all references across commands/skills/agents, verifies integrity.
allowed-tools: Read, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Renaming Agents

**Safe agent renaming with comprehensive reference tracking and validation.**

> **MANDATORY**: You MUST use TodoWrite to track the 7-step rename process. Missing a step can leave broken references.

---

## What This Skill Does

Safely renames agents by:
1. ✅ Validating old agent exists
2. ✅ Validating new name available (no conflicts)
3. ✅ Updating frontmatter name field
4. ✅ Renaming the file
5. ✅ Finding ALL references (grep with word boundaries)
6. ✅ Updating each reference (Edit tool)
7. ✅ Verifying no broken references remain

**Critical:** This is an atomic operation - all steps must succeed or rollback.

---

## When to Use

- Standardizing agent names to follow conventions
- Fixing naming inconsistencies
- Reorganizing agent structure

**NOT for:**
- Changing agent behavior (use `updating-agents`)
- Creating new agents (use `creating-agents`)
- Moving agents between categories (manual operation)

---

## Quick Reference - 7-Step Safe Rename

| Step | Action | Tool | Verification |
|------|--------|------|--------------|
| 1 | Validate source exists | Glob, Read | File exists, valid agent |
| 2 | Validate target available | Glob | No conflicts |
| 3 | Update frontmatter | Edit | Name field updated |
| 4 | Move file | Bash | New file exists, old gone |
| 5 | Find references | Grep | List all matches |
| 6 | Update references | Edit | All updated |
| 7 | Verify integrity | Grep | Zero matches for old name |

---

## Complete Workflow

Copy this checklist and track with TodoWrite:

```
Rename Progress:
- [ ] Step 1: Validate source agent exists
- [ ] Step 2: Validate target name available
- [ ] Step 3: Confirm with user (show impact)
- [ ] Step 4: Update frontmatter name
- [ ] Step 5: Move/rename file
- [ ] Step 6: Find and update all references
- [ ] Step 7: Verify integrity (no old name remains)
- [ ] Step 8: Report success with summary
```

---

## Step-by-Step Instructions

### Step 1: Validate Source Exists

```bash
# Use Glob to find agent across all categories
Glob pattern: ".claude/agents/**/{old-agent-name}.md"
```

**Validation checks:**
- [ ] File exists
- [ ] Has frontmatter (between `---` markers)
- [ ] Frontmatter has `name:` field

**If validation fails:** STOP, report "Agent not found", suggest `searching-agents`

### Step 2: Validate Target Available

```bash
Glob pattern: ".claude/agents/**/{new-agent-name}.md"
```

**Validation checks:**
- [ ] No file found with new name
- [ ] New name follows kebab-case convention

**If conflict detected:** STOP, report conflict, offer alternatives

### Step 3: Confirm with User

Use AskUserQuestion to show impact:

```
"Rename agent: {old-name} → {new-name}?

This will update:
- Filename: {old-path} → {new-path}
- Frontmatter: name field
- References: {count} files need updates

Proceed with rename?"
```

### Step 4: Update Frontmatter Name

```typescript
Edit({
  file_path: ".claude/agents/{category}/{old-agent-name}.md",
  old_string: "name: old-agent-name",
  new_string: "name: new-agent-name"
})
```

### Step 5: Move/Rename File

```bash
cd .claude/agents/{category}
mv old-agent-name.md new-agent-name.md
```

**Verify:**
- New file exists
- Old file gone

### Step 6: Find and Update All References

**Find references (use word boundaries):**
```bash
Grep(
  pattern: "\\bold-agent-name\\b",
  path: ".claude/",
  output_mode: "files_with_matches"
)
```

**Update each file with references:**
```typescript
Edit({
  file_path: "{file-path}",
  old_string: "old-agent-name",
  new_string: "new-agent-name",
  replace_all: true  // Update ALL occurrences
})
```

**Search locations:**
- `.claude/commands/` - Command examples
- `.claude/skills/` - Skill workflows
- `.claude/agents/` - Other agents

### Step 7: Verify Integrity

**Final check - NO old name should remain:**

```bash
Grep(
  pattern: "\\bold-agent-name\\b",
  path: ".claude/",
  output_mode: "files_with_matches"
)
```

**Expected:** No matches found

**If matches found:** Report incomplete, provide manual steps

### Step 8: Report Success

```
✅ Successfully renamed: old-agent-name → new-agent-name

Changes:
  - Frontmatter: name field updated
  - File: old-agent-name.md → new-agent-name.md
  - References: {count} updated across {file-count} files

Verification:
  - Grep found 0 references to old name ✅
  - Ready to commit ✅
```

---

## Quick Example

```
User: "Rename test-agent to testing-agent"

You:
1. Glob: .claude/agents/**/test-agent.md → Found ✅
2. Glob: .claude/agents/**/testing-agent.md → Not found ✅
3. AskUserQuestion: "Proceed?" → Yes
4. Edit: "name: test-agent" → "name: testing-agent" ✅
5. Bash: mv test-agent.md testing-agent.md ✅
6. Grep: Find references → 0 found
7. Grep: Verify → 0 matches for old name ✅
8. Report: "✅ Renamed successfully"
```

**For complete detailed examples, read:**
```
Read references/rename-examples.md
```

---

## Error Handling

### Source Not Found
→ STOP, suggest `searching-agents`

### Target Conflict
→ STOP, offer alternatives or deletion

### File Move Failed
→ Rollback frontmatter change, report error

### Reference Update Failed
→ Continue with other files, report partial success

### Integrity Check Fails
→ Report remaining references, provide manual steps

**For detailed error handling procedures, read:**
```
Read references/error-handling.md
```

---

## Common Pitfalls

1. **Substring matches** - Always use word boundaries (`\\b`)
2. **Case sensitivity** - Search case-insensitive first
3. **Partial references** - Use `replace_all` per file
4. **Archived content** - Exclude `.archived/` directories

**For detailed patterns and pitfalls, read:**
```
Read references/patterns-and-pitfalls.md
```

---

## Checklist Before Renaming

- [ ] Old agent name is correct
- [ ] New name follows conventions (kebab-case)
- [ ] No conflict with existing agents
- [ ] Ready to update all references

---

## See Also

- `searching-agents` - Find agents before renaming
- `auditing-agents` - Validate after rename
- `creating-agents` - Create agents with correct names
- `agent-manager` - Routes rename operations

**Reference files:**
- `references/rename-examples.md` - Complete examples
- `references/error-handling.md` - Error recovery
- `references/patterns-and-pitfalls.md` - Search patterns
