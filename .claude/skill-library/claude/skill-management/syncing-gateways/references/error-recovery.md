# Error Recovery

**Handling edge cases and failures during gateway synchronization.**

## Discovery Failures

### No Library Skills Found

**Symptom:**

```
Discovery phase found 0 library skills
```

**Causes:**

1. `.claude/skill-library/` directory doesn't exist
2. No `SKILL.md` files in library structure
3. Permission issues preventing file access
4. Running from wrong directory

**Recovery:**

1. Verify current working directory: `pwd`
2. Check if library exists: `ls -la .claude/skill-library/`
3. Manually find skills: `find .claude/skill-library -name "SKILL.md" 2>&1`
4. If permission issues, check file permissions: `ls -l .claude/skill-library/`

**Resolution:**

- If library doesn't exist: User error, library not initialized
- If no skills: Valid state, nothing to sync
- If permission issues: Fix permissions or run with appropriate user

### Orphaned Skills (No Gateway Match)

**Symptom:**

```
WARNING: Skill 'experimental-skill' at .claude/skill-library/experimental/... does not match any gateway pattern
```

**Causes:**

1. New category not yet mapped to gateway
2. Skill in wrong location
3. Experimental/work-in-progress skill

**Recovery:**

1. Check category path against mapping rules (see gateway-mapping.md)
2. If intentional (experimental): No action needed
3. If unintentional: Move skill to proper category

**Resolution:**

- Report orphaned skills to user
- Do NOT add to any gateway (requires manual decision)
- Suggest proper category based on skill content

## Gateway Read Failures

### Gateway File Not Found

**Symptom:**

```
ERROR: Gateway file not found: .claude/skills/gateway-unknown/SKILL.md
```

**Causes:**

1. Typo in gateway name
2. Gateway hasn't been created yet
3. Gateway was deleted

**Recovery:**

1. List available gateways: `ls .claude/skills/ | grep gateway-`
2. Verify gateway name spelling
3. Check if gateway exists in core skills

**Resolution:**

- If typo: Correct gateway name and retry
- If missing: User needs to create gateway first (use creating-skills)
- STOP sync operation for this gateway

### Malformed Gateway File

**Symptom:**

```
ERROR: Cannot parse routing table in gateway-frontend
```

**Causes:**

1. Table header missing or incorrect
2. Table separator malformed
3. Non-standard table format
4. File corruption

**Recovery:**

1. Read gateway file manually: `cat .claude/skills/gateway-frontend/SKILL.md`
2. Look for routing table section
3. Verify table format (see routing-table-format.md)

**Resolution:**

- SKIP this gateway (do not attempt auto-fix)
- Report to user for manual intervention
- Suggest loading `auditing-skills` workflow to identify issues:
  `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")`

### Permission Denied

**Symptom:**

```
ERROR: Permission denied reading .claude/skills/gateway-frontend/SKILL.md
```

**Causes:**

1. File permissions too restrictive
2. Running as wrong user
3. File locked by another process

**Recovery:**

1. Check permissions: `ls -l .claude/skills/gateway-frontend/SKILL.md`
2. Check current user: `whoami`
3. Check for locks: `lsof .claude/skills/gateway-frontend/SKILL.md`

**Resolution:**

- Fix permissions: `chmod 644 .claude/skills/gateway-frontend/SKILL.md`
- Run as appropriate user
- Close processes locking the file

## Comparison Failures

### Path Verification Timeout

**Symptom:**

```
WARNING: Path verification timed out for 5 skills
```

**Causes:**

1. Slow filesystem (network drive, slow disk)
2. Too many paths to verify
3. System under heavy load

**Recovery:**

1. Verify filesystem performance: `time ls .claude/skill-library/ > /dev/null`
2. Check system load: `uptime` or `top`

**Resolution:**

- Retry with smaller batch (use Single Gateway workflow mode)
- Increase timeout threshold (if implementing timeout logic)
- Continue with verified paths, report unverified separately

### Duplicate Path Detection

**Symptom:**

```
WARNING: Path appears in multiple gateways:
  - gateway-frontend: frontend-testing
  - gateway-testing: frontend-testing
```

**Causes:**

1. Skill manually added to multiple gateways
2. Previous sync error created duplicates
3. Category ambiguity (testing for frontend components)

**Recovery:**

1. Check both gateway routing tables
2. Verify skill category from path
3. Determine primary gateway based on leftmost path segment

**Resolution:**

- Remove duplicate from secondary gateway
- Use path-based mapping as source of truth
- Report to user which duplicate was removed

## Application Failures

### Edit Tool Failure

**Symptom:**

```
ERROR: Edit failed for gateway-frontend
Error: old_string not found in file
```

**Causes:**

1. Table format changed since read
2. File modified by another process
3. Incorrect old_string extraction
4. Encoding issues

**Recovery:**

1. Re-read gateway file to get current state
2. Compare with expected old_string
3. Check for unexpected formatting differences

**Resolution:**

- ROLLBACK changes (don't leave gateway in inconsistent state)
- Re-run comparison phase with fresh read
- If persistent, report malformed table to user
- Suggest manual edit or audit/fix workflow

### Partial Update Success

**Symptom:**

```
SUCCESS: Updated 6 of 8 gateways
FAILED: gateway-frontend, gateway-backend
```

**Causes:**

1. Permission issues on specific gateways
2. Malformed tables in failed gateways
3. File locks

**Recovery:**

1. Identify which gateways succeeded
2. Check error messages for failed gateways
3. Verify failed gateway file status

**Resolution:**

- Report partial success to user
- Provide details on which gateways failed and why
- Suggest fixing failed gateways individually using Single Gateway workflow
- DO NOT consider sync complete

### Verification Failure

**Symptom:**

```
ERROR: Post-edit verification failed for gateway-frontend
Expected 15 entries, found 14
```

**Causes:**

1. Edit tool didn't apply all changes
2. Sorting error during table generation
3. Deduplication removed intended entry

**Recovery:**

1. Re-read gateway file
2. Compare actual vs expected entries
3. Identify missing or extra entries

**Resolution:**

- ROLLBACK edit (restore previous version)
- Debug table generation logic
- Manual inspection required
- DO NOT proceed with other gateways until resolved

## State Recovery

### Mid-Sync Interruption

**Symptom:**

```
Sync interrupted after updating 3 of 8 gateways
```

**Causes:**

1. User cancellation (Ctrl+C)
2. System crash
3. Network interruption (if on network filesystem)

**Recovery:**

1. Check which gateways were updated (look for recent edits)
2. Verify updated gateways for correctness
3. Determine which gateways still need updating

**Resolution:**

- Re-run sync from beginning (discovery is fast, safe to redo)
- Comparison phase will handle already-updated gateways correctly
- No manual state management needed (stateless operation)

### Inconsistent Gateway State

**Symptom:**

```
Some gateways updated, others not, library skills changed during sync
```

**Causes:**

1. Library skills added/deleted during sync operation
2. Concurrent sync operations
3. Manual gateway edits during sync

**Recovery:**

1. Complete current sync operation
2. Re-run discovery to capture latest library state
3. Re-run sync to bring all gateways up to date

**Resolution:**

- Warn user about concurrent modifications
- Suggest running sync again to capture all changes
- Document in changelog when sync was last successful

## Validation Failures

### Broken Paths After Sync

**Symptom:**

```
Post-sync validation found 3 broken paths in gateway-frontend
```

**Causes:**

1. Race condition (skills deleted during sync)
2. Bug in path construction
3. Filesystem inconsistency

**Recovery:**

1. Verify paths manually: `test -f [path] && echo exists`
2. Check when paths were last valid
3. Confirm library structure unchanged

**Resolution:**

- Remove broken paths immediately (run cleanup)
- Investigate root cause (bug vs timing)
- Re-run sync to ensure consistency

### Format Violations

**Symptom:**

```
Post-sync validation found format violations:
  - gateway-backend row 5: Missing backticks in path
  - gateway-testing row 3: Path doesn't start with .claude/
```

**Causes:**

1. Bug in table generation logic
2. Manual edit during sync
3. Encoding issue

**Recovery:**

1. Read affected gateways
2. Identify specific format violations
3. Check table generation code

**Resolution:**

- Fix immediately with corrective edit
- Update table generation logic to prevent recurrence
- Run audit to verify all gateways

## Best Practices

### Before Sync

1. **Backup gateway files** (or use git to track changes)
2. **Verify no concurrent operations** (no other Claude instances editing gateways)
3. **Check filesystem health** (no errors, reasonable performance)

### During Sync

1. **Monitor progress** (watch for warnings/errors)
2. **Don't interrupt** unless absolutely necessary
3. **Don't modify files** being synced

### After Sync

1. **Verify changes** (read updated gateways)
2. **Test gateway routing** (try loading a library skill)
3. **Run audit** on all gateways to confirm compliance
4. **Commit changes** to version control

### Recovery Protocol

If sync fails:

1. **STOP** - Don't continue with partial state
2. **ASSESS** - Read error messages, identify root cause
3. **ROLLBACK** - Restore previous version if needed (use git)
4. **FIX** - Address root cause (permissions, malformed files, etc.)
5. **RETRY** - Re-run sync from beginning
6. **VERIFY** - Confirm success with audit and manual inspection
