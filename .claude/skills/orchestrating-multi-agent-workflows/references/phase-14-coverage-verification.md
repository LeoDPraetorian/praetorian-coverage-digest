# Phase 14: Coverage Verification

**Verify test coverage meets targets from test plan.**

---

## Overview

Coverage Verification validates that test implementation meets coverage thresholds defined in the test plan (Phase 12).

**Entry Criteria:**

- Phase 13 (Testing) complete with all tests passing
- **COMPACTION GATE:** Must complete [compaction-gates.md](compaction-gates.md) protocol before proceeding (Gate 3: after Phase 13)

**Exit Criteria:** All coverage targets met (or user approves proceeding with gaps).

---

## Step 1: Run Coverage Analysis

Execute coverage commands for each domain:

```bash
# Run coverage command for your domain (see domain orchestration for specific commands)
{coverage_command}
```

---

## Step 2: Compare Against Test Plan Targets

Read coverage targets from Phase 12 test plan:

```yaml
# From test-plan.md (see domain orchestration for specific targets)
coverage_targets:
  security_functions: "{security_target}%"
  business_logic: "{business_target}%"
  integration_paths: "{integration_target}%"
```

Compare actual vs target:

| Category           | Target                | Actual    | Met?  |
| ------------------ | --------------------- | --------- | ----- |
| Security Functions | {security_target}%    | {actual}% | ✅/❌ |
| Business Logic     | {business_target}%    | {actual}% | ✅/❌ |
| Integration Paths  | {integration_target}% | {actual}% | ✅/❌ |

---

## Step 3: Evaluate Results

**Decision matrix:**

| Result                 | Action                         |
| ---------------------- | ------------------------------ |
| All targets met        | Proceed to Phase 15            |
| Minor gap (<5%)        | Ask user: fix or proceed       |
| Major gap (≥5%)        | Fix required (re-run Phase 13) |
| Critical path untested | MUST fix (no override)         |

### Minor Gap Handling

```typescript
AskUserQuestion({
  questions: [
    {
      question: "{category} coverage is {actual}% (target: {target}%). Proceed or improve?",
      header: "Coverage",
      multiSelect: false,
      options: [
        { label: "Improve coverage (Recommended)", description: "Add tests to reach {target}%" },
        { label: "Proceed anyway", description: "Accept {actual}%" },
      ],
    },
  ],
});
```

### Major Gap Handling

1. Identify untested code paths
2. Re-spawn relevant tester agent with specific files
3. Re-run coverage analysis
4. If still failing after 1 retry → escalate

---

## Step 4: Document Coverage Evidence

**Create coverage report:**

```markdown
## Coverage Report

**Analysis Date:** {timestamp}
**Test Plan:** {OUTPUT_DIR}/test-plan.md

### Coverage by Category

| Category           | Target                | Actual    | Status |
| ------------------ | --------------------- | --------- | ------ |
| Security Functions | {security_target}%    | {actual}% | ✅/❌  |
| Business Logic     | {business_target}%    | {actual}% | ✅/❌  |
| Integration Paths  | {integration_target}% | {actual}% | ✅/❌  |

### Uncovered Lines

[List any significant uncovered code with justification]

### Coverage by File

| File     | Coverage    | Notes      |
| -------- | ----------- | ---------- |
| {file_1} | {coverage}% | {category} |
| {file_2} | {coverage}% | {category} |
| {file_3} | {coverage}% | {category} |
```

---

## Step 5: Update MANIFEST.yaml

```yaml
phases:
  14_coverage_verification:
    status: "complete"
    completed_at: "{timestamp}"

coverage:
  analysis_command: "{coverage_command}"

  targets:
    security_functions:
      target: "{security_target}%"
      actual: "{actual}%"
      met: true/false
    business_logic:
      target: "{business_target}%"
      actual: "{actual}%"
      met: true/false
    integration_paths:
      target: "{integration_target}%"
      actual: "{actual}%"
      met: true/false

  all_targets_met: true/false

  report: "{OUTPUT_DIR}/coverage-report.md"

  # If gap accepted
  gap_override:
    category: "{category}"
    target: "{target}%"
    actual: "{actual}%"
    approved_by: "user"
    reason: "{user_provided_reason}"
```

---

## Step 6: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 14: Coverage Verification", status: "completed", activeForm: "Verifying coverage" },
  { content: "Phase 15: Test Quality", status: "in_progress", activeForm: "Validating test quality" },
  // ... rest
])
```

Output to user:

```markdown
## Coverage Verification Complete

**Coverage Results:**
| Category | Target | Actual | Status |
|----------|--------|--------|--------|
| Security Functions | {security_target}% | {actual}% | ✅/❌ |
| Business Logic | {business_target}% | {actual}% | ✅/❌ |
| Integration Paths | {integration_target}% | {actual}% | ✅/❌ |

**All targets met.**

**Coverage Report:** {OUTPUT_DIR}/coverage-report.md

→ Proceeding to Phase 15: Test Quality
```

---

## Edge Cases

### Coverage Tool Reports Different Numbers

**Solution:** Use the tool specified in test plan. If ambiguous, prefer the more conservative (lower) number.

### Coverage High But Critical Path Untested

**Solution:** Coverage percentage alone is insufficient. Verify critical paths have explicit test cases:

1. Read test plan's "Required Tests" section
2. Confirm each critical test exists
3. If missing, flag even with high coverage %

### Legacy Code Has Low Coverage

**Solution:** Only measure coverage for NEW/MODIFIED code:

```bash
# Git diff to find changed files
git diff --name-only HEAD~1 -- '{file_extension}'

# Run coverage only on changed files (see domain orchestration for specific command)
{targeted_coverage_command}
```

---

## Skip Conditions

| Work Type | Coverage Verification         |
| --------- | ----------------------------- |
| BUGFIX    | Run (verify bug area covered) |
| SMALL     | Run (minimal scope)           |
| MEDIUM    | Run                           |
| LARGE     | Run                           |

Coverage verification always runs but scope varies.

---

## Coverage Target Guidelines

See domain orchestration for specific targets. General pattern:

| Code Type          | Typical Range        | Rationale                   |
| ------------------ | -------------------- | --------------------------- |
| Security functions | High (90-100%)       | High risk, must be thorough |
| Business logic     | Medium-High (75-85%) | Core functionality          |
| Integration code   | High (85-95%)        | External dependencies       |
| Utilities          | Medium (65-75%)      | Low risk                    |
| Generated code     | 0%                   | Don't test generated        |

---

## Related References

- [Phase 13: Testing](phase-13-testing.md) - Previous phase
- [Phase 15: Test Quality](phase-15-test-quality.md) - Next phase
- [quality-scoring.md](quality-scoring.md) - Quality factors including coverage
