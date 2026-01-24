# Phase 16: Completion

**Finalize feature workflow: verification, PR creation, cleanup.**

---

## Overview

Completion finalizes the feature development workflow with feature-specific verification commands and PR templates.

**Entry Criteria:** Phase 15 (Test Quality) complete.

**Exit Criteria:** Workflow marked complete, deliverables finalized.

---

## Feature Verification Commands

### Frontend Verification

```bash
# Build check
npm run build

# Lint check
npm run lint

# Type check
npx tsc --noEmit

# All tests
npm test

# E2E tests (if separate)
npx playwright test
```

### Backend Verification

```bash
# Build check
go build ./...

# Lint check
golangci-lint run

# All tests
go test ./...

# Integration tests
go test -tags=integration ./...
```

### Full-Stack Verification

Run both sets of commands. All must pass.

---

## Phase Status Verification

Check MANIFEST.yaml for all phase statuses:

```yaml
# All must be "complete" or "skipped" (with documented reason)
phases:
  1_setup: "complete"
  2_triage: "complete"
  3_codebase_discovery: "complete"
  4_skill_discovery: "complete"
  5_complexity: "complete"
  6_brainstorming: "skipped" # reason: "SMALL work type"
  7_architecture_plan: "skipped" # reason: "SMALL work type"
  8_implementation: "complete"
  9_design_verification: "skipped" # reason: "SMALL work type"
  10_domain_compliance: "complete"
  11_code_quality: "complete"
  12_test_planning: "skipped" # reason: "SMALL work type"
  13_testing: "complete"
  14_coverage_verification: "complete"
  15_test_quality: "skipped" # reason: "SMALL work type"
  16_completion: "in_progress"
```

**If any phase NOT complete/skipped:** Do NOT proceed. Resolve outstanding phases first.

---

## Feature Completion Summary

Generate summary from MANIFEST data:

```markdown
## Feature Complete: {Feature Name}

**Feature Type:** {Frontend | Backend | Full-stack}
**Work Type:** {BUGFIX | SMALL | MEDIUM | LARGE}
**Started:** {start_timestamp}
**Completed:** {end_timestamp}

### Phases Executed

| Phase          | Status   |
| -------------- | -------- |
| 1. Setup       | Complete |
| 2. Triage      | Complete |
| ...            | ...      |
| 16. Completion | Complete |

### Implementation Summary

**Files Modified:** 5
**Files Created:** 2
**Tests Added:** 20
**Coverage:** 84%

### Review Summary

**Code Quality Score:** 85/100
**Security Review:** Passed
**Test Quality Score:** 85/100

### Deliverables

All outputs in `.feature-development/`:

- architecture-plan.md
- implementation-summary.md
- test-plan.md
- coverage-report.md
- test-validation.md
```

---

## PR Creation for Features

### Ask About PR

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Feature complete. Create a pull request?",
      header: "PR",
      multiSelect: false,
      options: [
        { label: "Create PR (Recommended)", description: "Create PR with feature summary" },
        { label: "Skip PR", description: "I'll create PR manually" },
        { label: "Show me the changes", description: "Review files before PR" },
      ],
    },
  ],
});
```

### Feature PR Template

```bash
# Commit changes
git add -A
git commit -m "feat: {feature description}"

# Push branch
git push -u origin feature/{feature-name}

# Create PR
gh pr create --title "feat: {feature title}" --body "$(cat <<'EOF'
## Summary

{Brief description of the feature}

### Changes

- {Change 1}
- {Change 2}
- {Change 3}

### Feature Type

- [ ] Frontend
- [x] Backend
- [ ] Full-stack

## Test Plan

- [x] Unit tests added ({count} tests)
- [x] Integration tests added ({count} tests)
- [x] E2E tests added ({count} tests)
- [x] Coverage targets met ({coverage}%)
- [x] Quality score: {score}/100

## Verification

- [x] Build passes
- [x] Lint passes
- [x] All tests pass
- [x] Code review passed
- [x] Security review passed

## Checklist

- [x] Code follows project patterns
- [x] Tests follow test plan
- [x] No anti-patterns detected
- [x] Documentation updated (if applicable)
EOF
)"
```

---

## Worktree Cleanup

If feature used git worktree:

```bash
# Return to main worktree
cd /path/to/main/repo

# Remove feature worktree
git worktree remove .worktrees/{feature-name}

# Clean up branch if merged
git branch -d feature/{feature-name}
```

---

## Orchestration Session Cleanup

**Clean up the session-to-manifest mapping file created in Phase 1.**

This prevents stale orchestration context from being injected into future compactions:

```bash
# Get session ID from environment
SESSION_ID="${CLAUDE_SESSION_ID}"

# Remove session mapping file
rm -f .claude/hooks/orchestration-session-${SESSION_ID}.json
```

Alternatively, if Bash is not available, use the filesystem to delete the file.

**Why this matters:** Without cleanup, compaction hooks might inject "you are in an orchestrated workflow" context into sessions that have already completed their orchestration.

---

## Final MANIFEST Update

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
    feature_type: "frontend"
    work_type: "MEDIUM"
    files_modified: 5
    files_created: 2
    tests_added: 20
    coverage_percent: 84
    quality_score: 85

  pr:
    created: true
    url: "https://github.com/praetorian-inc/chariot/pull/456"

  worktree:
    used: true
    path: ".worktrees/feature-asset-filters"
    cleaned: true
```

---

## User Report

```markdown
## Feature Development Complete

**Feature:** Asset Filter Improvements
**Feature Type:** Frontend
**Work Type:** MEDIUM
**Duration:** 2h 15m

### Summary

- **Files Modified:** 5
- **Files Created:** 2
- **Tests Added:** 20
- **Coverage:** 84%
- **Quality Score:** 85/100

### Review Results

- Code Quality: APPROVED (85/100)
- Security Review: APPROVED (0 vulnerabilities)
- Test Quality: PASS (no anti-patterns)

### Deliverables

All outputs saved to: `.feature-development/`

### Pull Request

PR created: https://github.com/praetorian-inc/chariot/pull/456

---

**Feature development completed successfully.**
```

---

## Exit Criteria Checklist

Before marking workflow complete:

- [ ] All phases complete or skipped with reason
- [ ] Build passes (`npm run build` or `go build ./...`)
- [ ] Lint passes (`npm run lint` or `golangci-lint run`)
- [ ] Tests pass (`npm test` or `go test ./...`)
- [ ] MANIFEST updated with final status
- [ ] Summary generated
- [ ] User informed of completion
- [ ] (Optional) PR created
- [ ] (Optional) Worktree cleaned

---

## Edge Cases

### PR Creation Fails

1. Document failure reason
2. Provide manual PR creation instructions:

```bash
# Manual PR creation
git push -u origin feature/{name}
# Then create PR via GitHub UI
```

3. Mark workflow complete (PR is optional)

### User Wants to Review Before PR

Show changes first:

```bash
# Show all changes
git diff main...HEAD --stat

# Show commit history
git log main..HEAD --oneline

# Show specific file changes
git diff main...HEAD -- src/hooks/
```

Then re-ask about PR creation.

---

## Skip Conditions

Phase 16 always runs. It is the final phase regardless of work type.

---

## Related References

- [Phase 15: Test Quality](phase-15-test-quality.md) - Previous phase
- [Finishing a Development Branch](.claude/skill-library/workflow/finishing-a-development-branch/SKILL.md) - PR skill
