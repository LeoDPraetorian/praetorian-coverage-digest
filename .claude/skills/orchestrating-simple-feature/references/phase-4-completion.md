# Phase 4: Completion

Final verification before marking the simple feature complete and ready for PR.

## Purpose

Ensure the implemented feature meets quality standards by:

- Verifying all tasks completed
- Confirming code quality
- Running final checks
- Documenting completion

## Workflow

### Step 1: Invoke Verifying-Before-Completion Skill

```
skill: "verifying-before-completion"
```

The verifying-before-completion skill runs comprehensive checks:

- All plan tasks completed
- Build passes
- Tests pass
- Code quality verified
- No obvious bugs introduced

### Step 2: Final Verification Checklist

Run these checks before marking complete:

```bash
# 1. Build verification
npm run build  # Frontend
go build ./... # Backend

# 2. Test verification
npm test       # Frontend
go test ./...  # Backend

# 3. Lint verification
npm run lint   # Frontend
go vet ./...   # Backend

# 4. Code count verification
git diff --stat HEAD
# Verify total lines < 100

# 5. Pattern compliance check
# Review changed files against existing patterns
```

### Step 3: Completion Report

Create completion report in feature directory:

```markdown
# Completion Report: {Feature Name}

## Summary

{What was implemented in 2-3 sentences}

## Implementation Stats

- **Actual lines of code**: {count} (limit: 100)
- **Files modified**: {count} (limit: 5)
- **Time taken**: {duration}

## Verification Results

- ✅ Build passes
- ✅ All tests pass
- ✅ Lint clean
- ✅ Follows existing patterns
- ✅ Handles edge cases from brainstorming

## Files Modified

- `path/to/file1.ts` - {what changed}
- `path/to/file2.ts` - {what changed}

## Edge Cases Handled

- {edge case 1} - {how handled}
- {edge case 2} - {how handled}

## Ready for PR

This feature is ready for standard PR review. No special considerations needed.

## Manual Testing Recommended

{Optional: suggest manual testing steps if applicable}
```

### Step 4: Final Quality Gates

**Before marking complete, verify:**

| Gate                          | Status | Required |
| ----------------------------- | ------ | -------- |
| All tasks from plan completed | ✅/❌  | ✅       |
| Build passes                  | ✅/❌  | ✅       |
| Existing tests pass           | ✅/❌  | ✅       |
| Lint clean                    | ✅/❌  | ✅       |
| Code < 100 lines              | ✅/❌  | ✅       |
| Follows existing patterns     | ✅/❌  | ✅       |
| Edge cases handled            | ✅/❌  | ✅       |
| No obvious bugs               | ✅/❌  | ✅       |

**If ANY gate fails:**

1. Document the failure
2. Fix the specific issue
3. Re-run verification
4. Do NOT mark complete until all gates pass

### Step 5: Update Final Progress

Update MANIFEST.yaml:

```yaml
status: completed
completed_at: "2026-01-06T11:00:00Z"

phases_completed:
  - name: brainstorming
    completed_at: "2026-01-06T10:15:00Z"
  - name: planning
    completed_at: "2026-01-06T10:25:00Z"
  - name: implementation
    completed_at: "2026-01-06T10:45:00Z"
  - name: completion
    completed_at: "2026-01-06T11:00:00Z"

final_stats:
  total_duration_minutes: 45
  actual_lines: 42
  files_modified: 2

artifacts:
  - design.md
  - implementation-plan.md
  - implementation-notes.md
  - completion.md
```

### Step 6: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 4: Completion" as completed
```

### Step 7: Inform User

Provide clear completion summary:

```
✅ Simple feature implementation complete!

Feature: {name}
Scope: {actual_lines} lines across {file_count} files
Duration: {minutes} minutes

Verification:
✅ Build passes
✅ Tests pass
✅ Lint clean
✅ Follows existing patterns

Output directory: .claude/.output/features/{feature-id}/

Ready for PR! Standard review process applies.
```

## Exit Criteria

✅ Feature is complete when:

- All quality gates pass (✅✅✅✅✅✅✅✅)
- Completion report created
- MANIFEST.yaml finalized
- TodoWrite all phases marked complete
- User informed of completion

❌ Do NOT mark complete if:

- Any quality gate fails
- Bugs detected during verification
- Edge cases not handled
- Code doesn't follow patterns

## Common Issues

### "Tests pass locally but might fail in CI"

**Solution**: If simple feature, local tests are sufficient. CI failures will be caught in PR review.

### "Should I write new tests for this feature?"

**Answer**: Simple features should follow existing tested patterns. If you need NEW test infrastructure:
- This isn't a simple feature
- Escalate to orchestrating-feature-development for proper test planning phase

### "Found a bug during completion verification"

**Solution**:

1. Mark completion phase as blocked
2. Fix the bug
3. Re-run all verification steps
4. Only then mark complete

### "User wants to add 'just one more thing'"

**Answer**: Scope changes require re-planning:

1. Assess if addition keeps feature < 100 lines
2. If yes: Go back to Phase 1 (Brainstorming) with addition
3. If no: Mark current feature complete, start NEW simple feature for addition

## Next Steps After Completion

Simple features don't need:
- Formal security review (already verified no security implications)
- Comprehensive test plan (follows existing patterns with tests)
- Architecture documentation (no architectural decisions)

**Standard PR process:**
1. Commit changes
2. Create PR with completion.md as description
3. Standard team review
4. Merge when approved

## Related References

- [Phase 3: Implementation](phase-3-implementation.md) - Previous phase
- [Phase 0: Setup](phase-0-setup.md) - Restart for new feature
