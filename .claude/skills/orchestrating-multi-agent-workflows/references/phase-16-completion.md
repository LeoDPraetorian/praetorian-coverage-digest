# Phase 16: Completion

**Finalize workflow: PR creation, cleanup, and documentation.**

---

## Overview

Completion finalizes the orchestration workflow:

1. Verify all phases complete
2. Generate final summary
3. Create PR (if requested)
4. Clean up worktree (if used)
5. Update final status

**Entry Criteria:** Phase 15 (Test Quality) complete.

**Exit Criteria:** Workflow marked complete, deliverables finalized.

---

## Step 1: Verify All Phases Complete

Check MANIFEST.yaml for all phase statuses:

```yaml
# All must be "complete" or "skipped" (with reason)
phases:
  1_setup: "complete"
  2_triage: "complete"
  3_codebase_discovery: "complete"
  4_skill_discovery: "complete"
  5_complexity: "complete"
  6_brainstorming: "skipped" # SMALL work type
  7_architecture_plan: "skipped" # SMALL work type
  8_implementation: "complete"
  9_design_verification: "skipped" # SMALL work type
  10_domain_compliance: "complete"
  11_code_quality: "complete"
  12_test_planning: "skipped" # SMALL work type
  13_testing: "complete"
  14_coverage_verification: "complete"
  15_test_quality: "skipped" # SMALL work type
  16_completion: "in_progress"
```

**If any phase NOT complete/skipped:** Do NOT proceed. Resolve outstanding phases first.

---

## Step 2: Verify Exit Criteria

Standard exit criteria (all must be true):

- [ ] All phases marked complete in progress tracking
- [ ] All spawned agents returned status: complete
- [ ] All validation gates passed (or overrides documented)
- [ ] Final verification command executed with passing result
- [ ] Progress file updated with final status

**Run final verification:**

```bash
# Run verification commands for your domain (see domain orchestration for specific commands)
{build_command}
{test_command}
{lint_command}
```

---

## Step 3: Generate Final Summary

Create completion summary from MANIFEST data:

```markdown
## Workflow Complete: {Feature Name}

**Work Type:** {SMALL|MEDIUM|LARGE|BUGFIX}
**Started:** {start_timestamp}
**Completed:** {end_timestamp}

### Phases Executed

| Phase          | Status | Duration |
| -------------- | ------ | -------- |
| 1. Setup       | ✅     | -        |
| 2. Triage      | ✅     | -        |
| ...            | ...    | ...      |
| 16. Completion | ✅     | -        |

### Implementation Summary

**Files Modified:** {count}
**Files Created:** {count}
**Tests Added:** {count}
**Coverage:** {percentage}

### Review Summary

**Code Quality Score:** {score}/100
**Security Review:** ✅ Passed
**Test Quality Score:** {score}/100

### Deliverables

- Implementation: {OUTPUT_DIR}/implementation-summary.md
- Architecture: {OUTPUT_DIR}/architecture-plan.md
- Test Plan: {OUTPUT_DIR}/test-plan.md
- Coverage Report: {OUTPUT_DIR}/coverage-report.md
```

---

## Step 4: Ask About PR Creation

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Workflow complete. Create a pull request?",
      header: "PR",
      multiSelect: false,
      options: [
        { label: "Create PR (Recommended)", description: "Create PR with generated summary" },
        { label: "Skip PR", description: "I'll create PR manually" },
        { label: "Show me the changes", description: "Review files before PR" },
      ],
    },
  ],
});
```

---

## Step 5: Create PR (If Requested)

Use skill `finishing-a-development-branch`:

```markdown
Read(".claude/skill-library/development/finishing-a-development-branch/SKILL.md")
```

**PR creation steps:**

1. Ensure all changes committed
2. Push branch to remote
3. Create PR with generated summary

```bash
# Commit any uncommitted changes
git add -A
git commit -m "feat: {feature description}"

# Push branch
git push -u origin {branch-name}

# Create PR
gh pr create --title "{feature title}" --body "$(cat <<'EOF'
## Summary
{from completion summary}

## Test Plan
- All tests passing
- Coverage: {percentage}
- Quality score: {score}/100

## Checklist
- [x] Code review passed
- [x] Security review passed
- [x] Tests implemented per plan
- [x] Coverage targets met
EOF
)"
```

---

## Step 6: Clean Up Worktree (If Used)

If workflow used git worktree (Phase 1):

```bash
# Return to main worktree
cd {original_directory}

# Remove feature worktree
git worktree remove {worktree_path}

# Clean up branch if merged
git branch -d {feature_branch}
```

---

## Step 7: Update Final MANIFEST

```yaml
phases:
  16_completion:
    status: "complete"
    completed_at: "{timestamp}"

workflow:
  status: "complete"
  started_at: "{start_timestamp}"
  completed_at: "{end_timestamp}"

  summary:
    work_type: "{work_type}"
    files_modified: { count }
    files_created: { count }
    tests_added: { count }
    coverage_percent: { coverage }
    quality_score: { score }

  pr:
    created: true
    url: "https://github.com/org/repo/pull/123"

  worktree:
    used: true
    cleaned: true
```

---

## Step 8: Final TodoWrite & Report

```
TodoWrite([
  { content: "Phase 16: Completion", status: "completed", activeForm: "Completing workflow" }
])
```

Output to user:

```markdown
## Workflow Complete

**Feature:** {feature name}
**Work Type:** {work type}
**Duration:** {duration}

### Summary

- **Files Modified:** {count}
- **Files Created:** {count}
- **Tests Added:** {count}
- **Coverage:** {coverage}%
- **Quality Score:** {score}/100

### Deliverables

All outputs saved to: {OUTPUT_DIR}/

### Pull Request

PR created: https://github.com/org/repo/pull/123

---

**Workflow completed successfully.**
```

---

## Edge Cases

### Some Phases Were Skipped

**Expected for BUGFIX/SMALL work types.** Document skip reason in MANIFEST:

```yaml
6_brainstorming:
  status: "skipped"
  reason: "SMALL work type - brainstorming not required"
```

### PR Creation Fails

**Solution:**

1. Document failure reason
2. Provide manual PR creation instructions
3. Mark workflow complete (PR is optional)

### Worktree Cleanup Fails

**Solution:**

1. Check for uncommitted changes
2. Check for unmerged branches
3. Provide manual cleanup commands
4. Mark workflow complete (cleanup is optional)

### User Wants to Review Before PR

**Solution:** Show changes, then re-ask about PR:

```bash
# Show all changes
git diff main...HEAD --stat
git log main..HEAD --oneline
```

---

## Skip Conditions

Phase 16 always runs. It is the final phase regardless of work type.

---

## Completion Checklist

Before marking workflow complete:

- [ ] All phases complete or skipped with reason
- [ ] Build passes
- [ ] Tests pass
- [ ] Lint passes
- [ ] MANIFEST updated with final status
- [ ] Summary generated
- [ ] User informed of completion
- [ ] (Optional) PR created
- [ ] (Optional) Worktree cleaned

---

## Related References

- [Phase 15: Test Quality](phase-15-test-quality.md) - Previous phase
- [exit-criteria.md](exit-criteria.md) - Standard exit criteria
- [finishing-a-development-branch](../../skill-library/development/finishing-a-development-branch/SKILL.md) - PR creation skill
- [workflow-handoff.md](workflow-handoff.md) - Cross-workflow handoff
