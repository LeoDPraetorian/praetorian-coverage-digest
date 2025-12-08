---
name: renaming-agents
description: Use when renaming agents safely - validates source/target, updates filename and frontmatter, finds and updates all references across commands/skills/agents, verifies integrity.
allowed-tools: Read, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Renaming Agents

**Safe agent renaming with comprehensive reference tracking and validation.**

> **IMPORTANT**: Use TodoWrite to track the 7-step rename process. Missing a step can leave broken references.

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
- Consolidating similar agents

**NOT for:**
- Changing agent behavior (use `updating-agents`)
- Creating new agents (use `creating-agents`)
- Moving agents between categories (manual operation)

---

## Quick Reference - 7-Step Safe Rename

| Step | Action | Tool | Verification |
|------|--------|------|--------------|
| 1 | Validate source exists | Bash, Read | File exists, valid agent |
| 2 | Validate target available | Bash | No conflicts |
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
- [ ] Step 6: Find all references
- [ ] Step 7: Update each reference with Edit
- [ ] Step 8: Verify integrity (no old name remains)
- [ ] Step 9: Report success with summary
```

---

## Step-by-Step Instructions

### Step 1: Validate Source Exists

**Check agent exists:**
```bash
# Use Glob to find agent across all categories
Glob pattern: ".claude/agents/**/<old-agent-name>.md"
```

**Verify it's valid:**
```bash
Read .claude/agents/{category}/{old-agent-name}.md
```

**Validation checks:**
- [ ] File exists
- [ ] Has frontmatter (between `---` markers)
- [ ] Frontmatter has `name:` field
- [ ] Name field matches filename (or note mismatch to fix)

**If validation fails:**
```
Error: "Agent '<old-agent-name>' not found or invalid"
Suggestion: "Use `searching-agents` to find correct agent name"
→ STOP, do not proceed
```

### Step 2: Validate Target Available

**Check new name doesn't exist:**
```bash
Glob pattern: ".claude/agents/**/<new-agent-name>.md"
```

**Validation checks:**
- [ ] No file found with new name
- [ ] New name follows kebab-case convention
- [ ] New name doesn't conflict with existing agents

**If conflict detected:**
```
Error: "Agent '<new-agent-name>' already exists at {path}"
Suggestion: "Choose a different name or delete existing agent first"
→ STOP, do not proceed
```

**Name validation:**
- Must use lowercase letters, numbers, hyphens only
- Must be descriptive and clear
- Should follow category conventions

### Step 3: Confirm with User

**Show impact before proceeding:**

Use AskUserQuestion:
```
"Rename agent: <old-name> → <new-name>?

This will update:
- Filename: {old-path} → {new-path}
- Frontmatter: name field
- References: {count} files need updates

Files to update:
- {list of files with reference count}

Proceed with rename?"

Options:
  - Yes, rename and update all references
  - No, cancel operation
```

**If user selects No:**
→ STOP, report "Rename cancelled by user"

### Step 4: Update Frontmatter Name

**Read current frontmatter:**
```bash
Read .claude/agents/{category}/{old-agent-name}.md
```

**Find name field:**
```yaml
---
name: old-agent-name  # ← This line
description: ...
---
```

**Update with Edit:**
```typescript
Edit({
  file_path: ".claude/agents/{category}/{old-agent-name}.md",
  old_string: "name: old-agent-name",
  new_string: "name: new-agent-name"
})
```

**Verify:**
- [ ] Edit succeeded
- [ ] Re-read file to confirm name updated

### Step 5: Move/Rename File

**Execute rename:**
```bash
cd .claude/agents/{category}
mv old-agent-name.md new-agent-name.md
```

**Verify:**
```bash
# New file exists
ls .claude/agents/{category}/new-agent-name.md

# Old file gone
ls .claude/agents/{category}/old-agent-name.md  # Should fail
```

**If move fails:**
```
Error: "Failed to rename file"
Cause: Permissions, file system error
Action: Rollback frontmatter change, report error
```

### Step 6: Find All References

**Search comprehensively:**
```bash
# Use Grep with word boundaries to avoid substring matches
Grep(
  pattern: "\\bold-agent-name\\b",
  path: ".claude/",
  output_mode: "files_with_matches"
)
```

**Search locations:**
- `.claude/commands/` - Command examples
- `.claude/skills/` - Skill workflows and examples
- `.claude/agents/` - Other agents that reference this one
- `.claude/*.md` - Documentation files

**Exclude:**
- `.claude/agents/{category}/new-agent-name.md` (the renamed agent itself - already updated)
- Archived files

**Record findings:**
```
Found references in:
1. .claude/skills/agent-manager/SKILL.md (3 references)
2. .claude/agents/orchestrator/frontend-orchestrator.md (2 references)
3. .claude/skills/creating-agents/examples/complex.md (1 reference)

Total: 6 references across 3 files
```

### Step 7: Update Each Reference

**For each file with references:**

1. **Read file to see context:**
   ```bash
   Read {file-path}
   ```

2. **Identify exact matches:**
   Use Grep to see context:
   ```bash
   Grep(
     pattern: "\\bold-agent-name\\b",
     path: "{file-path}",
     output_mode: "content",
     -B: 1, -A: 1
   )
   ```

3. **Update with Edit (use replace_all):**
   ```typescript
   Edit({
     file_path: "{file-path}",
     old_string: "old-agent-name",
     new_string: "new-agent-name",
     replace_all: true  // ← Update ALL occurrences in file
   })
   ```

4. **Verify update:**
   - Re-grep to confirm no old name remains in file
   - Mark file as updated in progress tracking

**Common reference patterns:**

| Pattern | Example | Update Method |
|---------|---------|---------------|
| Table cell | `\| old-name \| desc \|` | replace_all |
| List item | `- old-name does X` | replace_all |
| Prose | `Use old-name for Y` | replace_all |
| Code | `Task("old-name", ...)` | replace_all |
| Backticks | `` `old-name` `` | replace_all |

**Why replace_all:**
- Agents often referenced multiple times in one file
- Safer than multiple individual replacements
- Atomic operation - all instances updated together

### Step 8: Verify Integrity

**Final verification - NO old name should remain:**

```bash
Grep(
  pattern: "\\bold-agent-name\\b",
  path: ".claude/",
  output_mode: "files_with_matches"
)
```

**Expected result:** No matches found

**If matches found:**
```
⚠️ Incomplete rename - old name still exists:
- {file1} ({count} matches)
- {file2} ({count} matches)

Action:
- Review missed files
- Update manually
- Re-verify integrity
```

**If clean:**
```
✅ Integrity verified
- No references to old name found
- All updates successful
- Rename complete
```

### Step 9: Report Success

**Summary format:**
```
✅ Successfully renamed: old-agent-name → new-agent-name

Changes:
  - Frontmatter: name field updated
  - File: old-agent-name.md → new-agent-name.md
  - References: {count} updated across {file-count} files

Updated files:
  1. .claude/skills/agent-manager/SKILL.md (3 refs)
  2. .claude/agents/orchestrator/frontend-orchestrator.md (2 refs)
  3. .claude/skills/creating-agents/examples/complex.md (1 ref)

Verification:
  - Grep found 0 references to old name ✅
  - All references point to new name ✅
  - Ready to commit ✅
```

---

## Examples

### Example 1: Simple Rename

```
User: "Rename test-agent to testing-agent"

You (following 7-step workflow):

1. Validate source:
   Glob: .claude/agents/**/test-agent.md
   Found: .claude/agents/development/test-agent.md ✅

2. Validate target:
   Glob: .claude/agents/**/testing-agent.md
   Not found ✅ (good - no conflict)

3. Confirm with user:
   AskUserQuestion:
   "Rename test-agent → testing-agent?
    Found 0 references to update.
    Proceed?"

   User: Yes

4. Update frontmatter:
   Edit(old: "name: test-agent",
        new: "name: testing-agent")
   ✅

5. Move file:
   mv test-agent.md testing-agent.md
   ✅

6. Find references:
   Grep -rw "test-agent" .claude/
   Result: No references found (new agent)

7. Verify integrity:
   Grep -rw "test-agent" .claude/
   Result: 0 matches ✅

8. Report:
   "✅ Renamed test-agent → testing-agent
    No references to update (new agent)
    Ready to commit"
```

### Example 2: Rename with References

```
User: "Rename react-developer to frontend-react-developer"

You:

1. Validate source: ✅ Found
2. Validate target: ✅ Available

3. Find references (preview):
   Grep -rw "react-developer" .claude/

   Found in:
   - agent-manager/SKILL.md (5 matches)
   - frontend-orchestrator.md (3 matches)
   - creating-agents/examples/complex.md (1 match)
   - 7 other files

   Total: 25 references across 10 files

4. Confirm with user:
   "Rename react-developer → frontend-react-developer?
    Will update 25 references in 10 files.
    Proceed?"

   User: Yes

5. Update frontmatter: ✅
6. Move file: ✅

7. Update references (each file):
   File 1: agent-manager/SKILL.md
     Grep → found 5 matches
     Edit(replace_all: true) → updated all 5

   File 2: frontend-orchestrator.md
     Grep → found 3 matches
     Edit(replace_all: true) → updated all 3

   [Continue for all 10 files...]

8. Verify integrity:
   Grep -rw "react-developer" .claude/
   Result: 0 matches ✅

9. Report:
   "✅ Renamed react-developer → frontend-react-developer
    Updated 25 references across 10 files
    Verification: Complete ✅"
```

### Example 3: Conflict Detection

```
User: "Rename test-engineer to testing-engineer"

You:

1. Validate source:
   Glob: .claude/agents/**/test-engineer.md
   Found: ✅

2. Validate target:
   Glob: .claude/agents/**/testing-engineer.md
   Found: .claude/agents/testing/testing-engineer.md ❌

3. Report conflict:
   "❌ Cannot rename: Conflict detected

    Source: test-engineer (exists ✅)
    Target: testing-engineer (ALREADY EXISTS ❌)

    Existing agent:
      Path: .claude/agents/testing/testing-engineer.md
      Type: testing

    Options:
    1. Choose different name (test-specialist, test-expert)
    2. Delete existing testing-engineer first (if duplicate)
    3. Consolidate both agents into one

    Rename cancelled."

→ STOP, do not proceed with rename
```

### Example 4: Dry Run (Preview Only)

```
User: "Show me what would change if I rename go-developer to backend-go-developer"

You:

1. Validate both names: ✅
2. Find references:
   Grep -rw "go-developer" .claude/

   Found in 8 files:
   - agent-manager/SKILL.md (2 refs)
   - backend-orchestrator.md (4 refs)
   - go-architect.md (1 ref)
   - creating-agents/templates/development.md (1 ref)
   - 4 other files

   Total: 15 references

3. Preview changes:
   "Preview: Rename go-developer → backend-go-developer

    Will update:
    ┌─────────────────────────────────────────┬──────┐
    │ File                                     │ Refs │
    ├─────────────────────────────────────────┼──────┤
    │ agent-manager/SKILL.md                   │ 2    │
    │ backend-orchestrator.md                  │ 4    │
    │ go-architect.md                          │ 1    │
    │ creating-agents/templates/development.md │ 1    │
    │ [4 other files]                          │ 7    │
    └─────────────────────────────────────────┴──────┘

    Total: 15 references in 8 files

    Apply this rename? (use AskUserQuestion)"

4. Wait for user decision (don't apply yet)
```

---

## Reference Patterns

### Where Agents Are Referenced

| Location | Pattern Example | Context |
|----------|-----------------|---------|
| **Agent tables** | `\| frontend-developer \| desc \|` | Orchestrator delegation tables |
| **Task calls** | `Task("frontend-developer", ...)` | Agent spawning code |
| **Recommendations** | `Recommend: frontend-developer` | Escalation protocols |
| **Examples** | See `frontend-developer` for... | Documentation |
| **Lists** | `- frontend-developer handles X` | Capability lists |
| **Prose** | The frontend-developer agent... | Explanatory text |

### Search Strategy

**Use word boundaries to avoid false matches:**

```bash
# CORRECT: Word boundaries
Grep pattern: "\\bfrontend-developer\\b"

# Matches:
- "frontend-developer" ✅
- "Use frontend-developer for..." ✅
- "| frontend-developer |" ✅

# Doesn't match:
- "frontend-developer-v2" ✗ (different agent)
- "non-frontend-developer" ✗ (compound word)
```

**Why this matters:**
- Prevents false positives
- Ensures exact agent name matches
- Avoids breaking unrelated content

---

## Error Handling

### Error 1: Source Not Found

```
Validation fails at Step 1

Error message:
"❌ Source agent not found: '<old-name>'

Checked locations:
- .claude/agents/architecture/
- .claude/agents/development/
- .claude/agents/testing/
[... all categories ...]

Suggestion:
- Use `searching-agents` to find agent
- Check spelling of agent name
- Agent may have been deleted"

Action: STOP, do not proceed
```

### Error 2: Target Conflict

```
Validation fails at Step 2

Error message:
"❌ Target name conflict: '<new-name>' already exists

Existing agent:
  Path: .claude/agents/{category}/{new-name}.md
  Created: {date}

Options:
1. Choose different target name
2. Delete existing agent (if duplicate)
3. Merge both agents

Rename cancelled."

Action: STOP, do not proceed
```

### Error 3: File Move Failed

```
Bash mv command fails at Step 5

Error message:
"❌ Failed to rename file

Source: {old-path}
Target: {new-path}
Error: {bash error}

Rollback:
- Reverting frontmatter name change
- Edit: name: new-name → name: old-name

Status: Rolled back, agent unchanged"

Action: Rollback changes, report error
```

### Error 4: Reference Update Failed

```
Edit tool fails during Step 7

Error message:
"⚠️ Failed to update reference in {file-path}

Issue: old_string not found
Cause: File content may have changed

Current progress:
- Updated 3/10 files successfully
- Failed on file 4

Action required:
- Manual review of {file-path}
- Update reference manually
- Continue with remaining files"

Action: Continue with other files, report partial success
```

### Error 5: Integrity Check Fails

```
Grep finds old name after updates (Step 8)

Warning message:
"⚠️ Incomplete rename - old name still exists:

Files with old name:
- {file1} ({count} matches) - Line {numbers}
- {file2} ({count} matches) - Line {numbers}

Possible causes:
1. File was updated after reference search
2. Reference pattern not detected by word boundary
3. Content changed during rename process

Action:
- Review listed files
- Update references manually
- Re-run integrity check"

Action: Report incomplete, provide manual steps
```

---

## Advanced Scenarios

### Scenario 1: Rename with Category Change

```
User: "Rename and move go-developer from development/ to architecture/"

You:
"⚠️ This requires TWO operations:

1. Rename: go-developer → go-architect (semantic change)
2. Move: development/ → architecture/ (category change)

Recommendation:
- Use this skill to rename: go-developer → go-architect
- Manually move file to architecture/ after
- OR keep in development/ if architecture role isn't primary

Proceed with rename only (no category move)?"
```

**Note:** This skill handles rename only, not category moves. Category moves are manual.

### Scenario 2: Rename with Consolidation

```
User: "Rename old-agent to existing-agent (consolidate functionality)"

You:
1. Detect conflict: existing-agent already exists
2. Ask: "Consolidation detected. Options:

   A. Merge functionality into existing-agent (manual)
   B. Delete old-agent without rename (manual)
   C. Choose different target name (continue rename)

   Which approach?"

3. If user chooses A or B:
   → Explain this is manual operation
   → This skill only handles straightforward renames

4. If user chooses C:
   → Ask for new target name
   → Continue with rename workflow
```

---

## Integration Patterns

### Used Standalone

```
User: "Rename agent X to Y"

Direct invocation:
skill: "renaming-agents"
```

### Used with Other Skills

**After auditing (if name needs fixing):**
```
Audit → Name mismatch detected
  ↓
Options:
A. Fix frontmatter (use fixing-agents)
B. Rename file (use renaming-agents)
```

**During consolidation:**
```
1. Create new consolidated agent (creating-agents)
2. Rename old agents with prefix (renaming-agents)
3. Update references gradually
4. Archive old agents
```

---

## Checklist Before Renaming

Before starting rename, verify:

- [ ] Old agent name is correct (search first if unsure)
- [ ] New name follows conventions (kebab-case, descriptive)
- [ ] No conflict with existing agents
- [ ] Ready to update all references (can't be partial)
- [ ] Have tested rename workflow (if first time)

**If any checkbox is unchecked, reconsider or prepare first.**

---

## Common Pitfalls

### Pitfall 1: Substring Matches

**Problem:**
```bash
# Searching for "test" finds:
- test-engineer ✅ (want to rename this)
- testing-agent-skills ✗ (don't want to change)
- backend-unit-test-engineer ✗ (don't want to change)
```

**Solution:** Use word boundaries in Grep:
```bash
Grep pattern: "\\btest\\b"  # ← Word boundaries

# Now matches only:
- "test" as standalone word
- "test-engineer" contains "test" as word ✅
```

### Pitfall 2: Case Sensitivity

**Problem:**
```
References might vary:
- Frontend-Developer (capitalized)
- frontend-developer (standard)
- FRONTEND_DEVELOPER (constant)
```

**Solution:**
- Search case-insensitive first: `grep -riw "agent-name"`
- Review each match for context
- Preserve original case when updating

**Note:** Agent names should be lowercase kebab-case by convention, but check.

### Pitfall 3: Partial References

**Problem:**
```
Found: "For frontend work, use frontend-developer or backend-developer"

If renaming frontend-developer → react-developer, need to update:
  "For frontend work, use react-developer or backend-developer"
```

**Solution:** `replace_all` handles this correctly when used per-file.

### Pitfall 4: Comments vs Active Code

**Problem:**
```
# Archived agent references (in .archived/ or comments)
# Old: use frontend-developer
# New: use react-developer
```

**Solution:**
- Search excludes `.archived/` directories
- Comments in active files DO get updated (keeps docs accurate)
- If intentionally preserving old name in comment, manual review

---

## See Also

- `searching-agents` - Find agents before renaming
- `auditing-agents` - Validate after rename
- `creating-agents` - Create agents with correct names from start
- `agent-manager` - Routes rename operations to this skill
