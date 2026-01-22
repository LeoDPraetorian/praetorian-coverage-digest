# Phase 14: Coverage Verification

**Verify test coverage meets targets from test plan (≥80%).**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Coverage Verification validates that test implementation meets coverage thresholds defined in the test plan (Phase 12).

**Entry Criteria:**

- Phase 13 (Testing) complete with all tests passing
- **COMPACTION GATE 3:** Must complete [compaction-gates.md](compaction-gates.md) protocol before proceeding

**Exit Criteria:** All coverage targets met (or user approves proceeding with gaps).

---

## Step 1: Run Coverage Analysis

Execute Go coverage commands:

```bash
cd modules/chariot/backend

# Run coverage
go test ./pkg/tasks/integrations/{vendor}/... -cover

# Generate detailed coverage report
go test ./pkg/tasks/integrations/{vendor}/... -coverprofile=coverage.out

# View coverage by function
go tool cover -func=coverage.out

# Generate HTML report (optional)
go tool cover -html=coverage.out -o {OUTPUT_DIR}/coverage.html
```

---

## Step 2: Compare Against Test Plan Targets

Read coverage targets from Phase 12 test plan:

```yaml
# From test-plan.md
coverage_targets:
  handler: "80%" # {vendor}.go
  client: "80%" # {vendor}_client.go
  transform: "90%" # {vendor}_transform.go
```

Compare actual vs target:

| File                   | Target | Actual | Met? |
| ---------------------- | ------ | ------ | ---- |
| {vendor}.go            | ≥80%   | 85.2%  | ✅   |
| {vendor}\_client.go    | ≥80%   | 82.1%  | ✅   |
| {vendor}\_transform.go | ≥90%   | 91.0%  | ✅   |

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
      question: "{file} coverage is {actual}% (target: {target}%). Proceed or improve?",
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

1. Identify untested code paths from coverage report
2. Re-spawn backend-tester with specific files/functions
3. Re-run coverage analysis
4. If still failing after 1 retry → escalate

---

## Step 4: Verify Critical Paths Covered

Beyond percentage, verify critical integration paths have tests:

| Critical Path         | Test Coverage                  | Status |
| --------------------- | ------------------------------ | ------ |
| Match() happy path    | TestVendor_Match_ValidJob      | ✅     |
| Invoke() success      | TestVendor_Invoke_Success      | ✅     |
| Invoke() auth failure | TestVendor_Invoke_InvalidCreds | ✅     |
| CheckAffiliation      | TestVendor*CheckAffiliation*\* | ✅     |
| ValidateCredentials   | TestVendor*ValidateCreds*\*    | ✅     |
| Pagination            | TestVendor_Invoke_MultiPage    | ✅     |
| Error handling        | TestVendor_Invoke_APIError     | ✅     |

**If critical path untested:** MUST add test even if coverage % is high.

---

## Step 5: Document Coverage Evidence

Create `{OUTPUT_DIR}/coverage-verification.md`:

```markdown
# Coverage Report: {vendor} Integration

**Analysis Date:** {timestamp}
**Test Plan:** {OUTPUT_DIR}/test-plan.md

## Coverage by File

| File                   | Target | Actual | Status |
| ---------------------- | ------ | ------ | ------ |
| {vendor}.go            | ≥80%   | 85.2%  | ✅     |
| {vendor}\_client.go    | ≥80%   | 82.1%  | ✅     |
| {vendor}\_transform.go | ≥90%   | 91.0%  | ✅     |

## Coverage by Function
```

github.com/.../{vendor}/{vendor}.go:
Match 100.0%
Invoke 85.7%
CheckAffiliation 90.0%
ValidateCredentials 100.0%
enumerate 80.0%
transformAsset 83.3%

```

## Critical Paths

| Path              | Covered | Test                        |
| ----------------- | ------- | --------------------------- |
| Auth success      | ✅      | TestVendor_Invoke_Success   |
| Auth failure      | ✅      | TestVendor_Invoke_InvalidCreds |
| Pagination        | ✅      | TestVendor_Invoke_MultiPage |
| Error handling    | ✅      | TestVendor_Invoke_APIError  |

## Uncovered Lines

[List any significant uncovered code with justification]

## Verdict: COVERAGE_MET

All files meet coverage targets. All critical paths have tests.
```

---

## Step 6: Update MANIFEST.yaml

```yaml
phases:
  14_coverage_verification:
    status: "complete"
    completed_at: "{timestamp}"

coverage:
  analysis_command: "go test -cover ./pkg/tasks/integrations/{vendor}/..."

  targets:
    handler:
      file: "{vendor}.go"
      target: "80%"
      actual: "85.2%"
      met: true
    client:
      file: "{vendor}_client.go"
      target: "80%"
      actual: "82.1%"
      met: true
    transform:
      file: "{vendor}_transform.go"
      target: "90%"
      actual: "91.0%"
      met: true

  all_targets_met: true
  critical_paths_covered: true

  report: "{OUTPUT_DIR}/coverage-verification.md"
```

---

## Step 7: Update TodoWrite & Report

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
| File | Target | Actual | Status |
| --------------------- | ------ | ------- | ------ |
| {vendor}.go | ≥80% | 85.2% | ✅ |
| {vendor}\_client.go | ≥80% | 82.1% | ✅ |
| {vendor}\_transform.go | ≥90% | 91.0% | ✅ |

**Critical Paths:** All covered ✅

**Coverage Report:** {OUTPUT_DIR}/coverage-verification.md

→ Proceeding to Phase 15: Test Quality
```

---

## Edge Cases

### Coverage Tool Reports Different Numbers

**Solution:** Use `go test -cover` as source of truth. If discrepancy, prefer the lower number.

### Coverage High But Critical Path Untested

**Solution:** Coverage percentage alone is insufficient. Verify critical paths in Step 4. If missing, flag even with high coverage %.

### Legacy Code Has Low Coverage

**Solution:** Only measure coverage for NEW/MODIFIED files:

```bash
# Git diff to find changed files
git diff --name-only main -- '*.go'

# Run coverage only on integration package
go test ./pkg/tasks/integrations/{vendor}/... -cover
```

---

## Skip Conditions

| Work Type | Coverage Verification     |
| --------- | ------------------------- |
| SMALL     | Run (verify bug fix area) |
| MEDIUM    | Run                       |
| LARGE     | Run                       |

Coverage verification always runs but scope varies.

---

## Integration-Specific Coverage Targets

| Code Type           | Target | Rationale                       |
| ------------------- | ------ | ------------------------------- |
| Handler (main file) | ≥80%   | Core business logic             |
| Client library      | ≥80%   | API interaction, error handling |
| Transform functions | ≥90%   | Data mapping must be thorough   |
| Types/structs       | 0%     | No logic to test                |

---

## Related References

- [Phase 13: Testing](phase-13-testing.md) - Previous phase
- [Phase 15: Test Quality](phase-15-test-quality.md) - Next phase
- [compaction-gates.md](compaction-gates.md) - Gate 3 precedes this phase
