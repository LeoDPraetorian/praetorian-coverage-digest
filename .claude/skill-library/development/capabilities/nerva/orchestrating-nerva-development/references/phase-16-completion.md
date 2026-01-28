# Phase 16: Completion

**Finalize fingerprintx workflow: verification, PR creation, cleanup.**

---

## Overview

Completion finalizes the fingerprintx plugin development workflow with fingerprintx-specific verification commands and PR templates.

**Entry Criteria:** Phase 15 (Test Quality) complete.

**Exit Criteria:** Workflow marked complete, deliverables finalized.

---

## Fingerprintx Verification Commands

```bash
# Build check - entire fingerprintx module
go build ./...

# Lint check
golangci-lint run ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

# All tests pass
go test ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

# Integration tests
go test -tags=integration ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

# Shodan validation
go test -tags=shodan ./{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/...

# Verify type constant alphabetical
grep "Service" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go | sort -c

# Verify plugin import alphabetical
grep "plugins/services" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go | sort -c
```

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

## Fingerprintx Completion Summary

Generate summary from MANIFEST data:

```markdown
## Plugin Complete: {Protocol} Fingerprintx Plugin

**Protocol:** {protocol name}
**Default Ports:** {ports}
**Work Type:** {BUGFIX | SMALL | MODERATE | COMPLEX}
**Started:** {start_timestamp}
**Completed:** {end_timestamp}

### Phases Executed

| Phase                     | Status             |
| ------------------------- | ------------------ |
| 1. Setup                  | Complete           |
| 2. Triage                 | Complete           |
| 3. Codebase Discovery     | Complete           |
| 4. Skill Discovery        | Complete           |
| 5. Complexity             | Complete           |
| 6. Brainstorming          | {Complete/Skipped} |
| 7. Architecture Plan      | {Complete/Skipped} |
| 8. Implementation         | Complete           |
| 9. Design Verification    | {Complete/Skipped} |
| 10. Domain Compliance     | Complete           |
| 11. Code Quality          | Complete           |
| 12. Test Planning         | {Complete/Skipped} |
| 13. Testing               | Complete           |
| 14. Coverage Verification | Complete           |
| 15. Test Quality          | {Complete/Skipped} |
| 16. Completion            | Complete           |

### Implementation Summary

**Files Modified:** 2 (types.go, plugins.go)
**Files Created:** 1 (plugin.go)
**Tests Added:** 13
**Coverage:** 91%

### P0 Compliance

| Requirement                | Status |
| -------------------------- | ------ |
| Type constant alphabetical | PASS   |
| Plugin import alphabetical | PASS   |
| Detection implemented      | PASS   |
| Version extraction         | PASS   |
| Error handling             | PASS   |

### Review Summary

**Code Quality Score:** 85/100
**Security Review:** Passed
**Test Quality Score:** 88/100
**Shodan Validation:** 3/3 banners

### Deliverables

All outputs in `.fingerprintx-development/`:

- architecture.md (if MODERATE+)
- plan.md (if MODERATE+)
- implementation-summary.md
- test-plan.md
- coverage-report.md
- test-validation.md
```

---

## PR Creation for Fingerprintx

### Ask About PR

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Plugin complete. Create a pull request?",
      header: "PR",
      multiSelect: false,
      options: [
        { label: "Create PR (Recommended)", description: "Create PR with plugin summary" },
        { label: "Skip PR", description: "I'll create PR manually" },
        { label: "Show me the changes", description: "Review files before PR" },
      ],
    },
  ],
});
```

### Fingerprintx PR Template

```bash
# Commit changes
git add -A
git commit -m "feat(fingerprintx): add {protocol} plugin"

# Push branch
git push -u origin feature/fingerprintx-{protocol}

# Create PR
gh pr create --title "feat(fingerprintx): add {protocol} plugin" --body "$(cat <<'EOF'
## Summary

Adds fingerprintx plugin for {protocol} protocol detection.

### Changes

- Add Service{Protocol} type constant to types.go
- Add {protocol} plugin import to plugins.go
- Create {protocol} plugin in {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/

### Detection

- **Method:** {banner match / binary parse}
- **Default Ports:** {ports}
- **Version Extraction:** {Yes/No}

## Test Plan

- [x] Unit tests added ({count} tests)
- [x] Integration tests added ({count} tests)
- [x] Shodan validation ({count} real banners)
- [x] Coverage targets met ({coverage}%)
- [x] Quality score: {score}/100

## P0 Compliance

- [x] Type constant alphabetical
- [x] Plugin import alphabetical
- [x] Detection logic implemented
- [x] Error handling complete
- [x] Version extraction (if applicable)

## Verification

- [x] `go build ./...` passes
- [x] `go test ./...` passes
- [x] `golangci-lint run` passes
- [x] Code review passed
- [x] Security review passed

## Shodan Validation

| Query | Detection | Version |
|-------|-----------|---------|
| {query1} | PASS | {version} |
| {query2} | PASS | {version} |
| {query3} | PASS | {version} |

## Checklist

- [x] Code follows fingerprintx patterns
- [x] Tests follow test plan
- [x] No anti-patterns detected
- [x] Package comment documents detection strategy
EOF
)"
```

---

## Worktree Cleanup

If plugin development used git worktree:

```bash
# Return to main worktree
cd /path/to/main/repo

# Remove fingerprintx worktree
git worktree remove .worktrees/fingerprintx-{protocol}

# Clean up branch if merged
git branch -d feature/fingerprintx-{protocol}
```

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
    plugin_type: "fingerprintx"
    protocol: "{protocol}"
    work_type: "MODERATE"
    files_modified: 2
    files_created: 1
    tests_added: 13
    coverage_percent: 91
    quality_score: 85

  p0_compliance:
    type_constant_alphabetical: true
    plugin_import_alphabetical: true
    detection_implemented: true
    version_extraction: true
    error_handling: true

  shodan_validation:
    banners_tested: 3
    banners_passed: 3

  pr:
    created: true
    url: "https://github.com/praetorian-inc/fingerprintx/pull/123"

  worktree:
    used: true
    path: ".worktrees/fingerprintx-{protocol}"
    cleaned: true
```

---

## User Report

```markdown
## Fingerprintx Plugin Development Complete

**Protocol:** {protocol}
**Default Ports:** {ports}
**Work Type:** MODERATE
**Duration:** {duration}

### Summary

- **Files Modified:** 2 (types.go, plugins.go)
- **Files Created:** 1 (plugin.go)
- **Tests Added:** 13
- **Coverage:** 91%
- **Quality Score:** 85/100

### P0 Compliance

All P0 requirements passed:

- Type constant alphabetical
- Plugin import alphabetical
- Detection implemented
- Error handling complete

### Shodan Validation

3 of 3 real-world banners validated

### Review Results

- Code Quality: APPROVED (85/100)
- Security Review: APPROVED (0 vulnerabilities)
- Test Quality: PASS (no anti-patterns)

### Deliverables

All outputs saved to: `.fingerprintx-development/`

### Pull Request

PR created: https://github.com/praetorian-inc/fingerprintx/pull/123

---

**Fingerprintx plugin development completed successfully.**
```

---

## Exit Criteria Checklist

Before marking workflow complete:

- [ ] All phases complete or skipped with reason
- [ ] Build passes (`go build ./...`)
- [ ] Lint passes (`golangci-lint run`)
- [ ] Tests pass (`go test ./...`)
- [ ] Type constant alphabetical verified
- [ ] Plugin import alphabetical verified
- [ ] Shodan validation passed (3+ banners)
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
git push -u origin feature/fingerprintx-{protocol}
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

# Show plugin-specific changes
git diff main...HEAD -- {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/
```

Then re-ask about PR creation.

---

## Skip Conditions

Phase 16 always runs. It is the final phase regardless of work type.

---

## Related References

- [Phase 15: Test Quality](phase-15-test-quality.md) - Previous phase
