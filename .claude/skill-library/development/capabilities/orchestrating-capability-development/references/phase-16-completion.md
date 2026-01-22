# Phase 16: Completion

**Finalize capability workflow: verification, PR creation, cleanup.**

---

## Overview

Completion finalizes the capability development workflow with capability-specific verification commands and PR templates.

**Entry Criteria:** Phase 15 (Test Quality) complete.

**Exit Criteria:** Workflow marked complete, deliverables finalized.

---

## Capability Verification Commands

### VQL Capabilities

```bash
# Syntax validation (if linter available)
# VQL parser validation

# Test validation
# Run against Velociraptor test harness
```

### Nuclei Templates

```bash
# Template validation
nuclei -validate -t {template_file}

# Dry run (no actual requests)
nuclei -t {template_file} -target example.com -dry-run
```

### Go Capabilities (Janus/Fingerprintx/Scanner)

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
  9_design_verification: "skipped"
  10_domain_compliance: "complete"
  11_code_quality: "complete"
  12_test_planning: "skipped"
  13_testing: "complete"
  14_coverage_verification: "complete"
  15_test_quality: "skipped"
  16_completion: "in_progress"
```

**If any phase NOT complete/skipped:** Do NOT proceed. Resolve outstanding phases first.

---

## Capability Completion Summary

Generate summary from MANIFEST data:

```markdown
## Capability Complete: {Capability Name}

**Capability Type:** {VQL | Nuclei | Janus | Fingerprintx | Scanner}
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

### Quality Summary

**Detection Accuracy:** 97% (target: 95%)
**False Positive Rate:** 3% (target: 5%)
**Code Coverage:** 85%

### Review Summary

**Domain Compliance:** PASS (all P0 checks)
**Code Quality Score:** 85/100
**Test Quality Score:** 88/100

### Deliverables

All outputs in `.capability-development/`:

- architecture.md
- implementation-summary.md
- domain-compliance.md
- coverage-report.md
- test-validation.md
```

---

## PR Creation for Capabilities

### Ask About PR

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Capability complete. Create a pull request?",
      header: "PR",
      multiSelect: false,
      options: [
        { label: "Create PR (Recommended)", description: "Create PR with capability summary" },
        { label: "Skip PR", description: "I'll create PR manually" },
        { label: "Show me the changes", description: "Review files before PR" },
      ],
    },
  ],
});
```

### Capability PR Template

```bash
# Commit changes
git add -A
git commit -m "feat({type}): {capability description}"

# Push branch
git push -u origin capability/{capability-name}

# Create PR
gh pr create --title "feat({type}): {capability title}" --body "$(cat <<'EOF'
## Summary

{Brief description of the capability}

### Capability Type

- [ ] VQL
- [ ] Nuclei
- [x] Fingerprintx
- [ ] Janus
- [ ] Scanner

## Quality Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Detection Accuracy | 98% | 99% | PASS |
| False Positive Rate | 1% | 0.5% | PASS |
| Code Coverage | 80% | 85% | PASS |

## Test Plan

- [x] Detection tests ({count} tests)
- [x] False positive tests ({count} tests)
- [x] Edge case tests ({count} tests)
- [x] Quality targets met

## Verification

- [x] Build passes
- [x] P0 compliance checks pass
- [x] All tests pass
- [x] Code review passed

## Checklist

- [x] Follows capability-type patterns
- [x] Tests follow test plan
- [x] No anti-patterns detected
EOF
)"
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
    capability_type: "fingerprintx"
    work_type: "MEDIUM"
    detection_accuracy: 99
    false_positive_rate: 0.5
    code_coverage: 85
    quality_score: 88

  pr:
    created: true
    url: "https://github.com/praetorian-inc/fingerprintx/pull/123"
```

---

## User Report

```markdown
## Capability Development Complete

**Capability:** MySQL Service Detection
**Capability Type:** Fingerprintx
**Work Type:** MEDIUM

### Quality Summary

- **Detection Accuracy:** 99% (target: 98%)
- **False Positive Rate:** 0.5% (target: 1%)
- **Code Coverage:** 85%
- **Quality Score:** 88/100

### Review Results

- Domain Compliance: PASS (all P0)
- Code Quality: APPROVED (85/100)
- Test Quality: PASS (no anti-patterns)

### Deliverables

All outputs saved to: `.capability-development/`

### Pull Request

PR created: https://github.com/praetorian-inc/fingerprintx/pull/123

---

**Capability development completed successfully.**
```

---

## Exit Criteria Checklist

Before marking workflow complete:

- [ ] All phases complete or skipped with reason
- [ ] Build passes (go build or nuclei -validate)
- [ ] P0 compliance checks pass
- [ ] Tests pass
- [ ] MANIFEST updated with final status
- [ ] Summary generated
- [ ] User informed of completion
- [ ] (Optional) PR created

---

## Edge Cases

### PR Creation Fails

1. Document failure reason
2. Provide manual PR creation instructions
3. Mark workflow complete (PR is optional)

### User Wants to Review Before PR

Show changes first:

```bash
# Show all changes
git diff main...HEAD --stat

# Show commit history
git log main..HEAD --oneline
```

Then re-ask about PR creation.

---

## Skip Conditions

Phase 16 always runs. It is the final phase regardless of work type.

---

## Related References

- [Phase 15: Test Quality](phase-15-test-quality.md) - Previous phase
