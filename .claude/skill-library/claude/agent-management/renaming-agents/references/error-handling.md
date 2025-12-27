# Error Handling

Reference file for renaming-agents - error handling and recovery procedures.

---

## Error 1: Source Not Found

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

---

## Error 2: Target Conflict

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

---

## Error 3: File Move Failed

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

---

## Error 4: Reference Update Failed

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

---

## Error 5: Integrity Check Fails

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

## Recovery Procedures

### Partial Rename Recovery

If rename fails mid-way:

1. **Check current state:**

   ```bash
   # Was file moved?
   ls .claude/agents/{category}/{old-name}.md
   ls .claude/agents/{category}/{new-name}.md
   ```

2. **If file was moved but references not updated:**
   - Continue updating references manually
   - Use `replace_all` in Edit tool

3. **If file was NOT moved but frontmatter changed:**
   - Revert frontmatter:

   ```typescript
   Edit({
     file_path: ".claude/agents/{category}/{old-name}.md",
     old_string: "name: new-name",
     new_string: "name: old-name",
   });
   ```

4. **Complete cleanup:**
   - Run integrity check
   - Verify no partial changes remain
